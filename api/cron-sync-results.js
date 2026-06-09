// Background cron — syncs World Cup 2026 match results from API-Football into
// every game's state, independent of each game's Autopilot setting (results
// should sync whether the game is run manually or on autopilot).
//
// Runs periodically (see vercel.json `crons`). Each run re-checks ALL finished
// fixtures (status FT/AET/PEN) and, for any game whose stored result/score
// differs, overwrites it — unless the admin has explicitly "locked" that match
// (game.lockedResults[matchId] === true). Every overwrite is appended to
// game.resultSyncLog for audit purposes.
//
// Polling (rather than scheduling "60 minutes after kickoff") is intentional:
// matches can finish early, after extra time, or after penalties, so there's
// no fixed offset from kickoff that reliably means "finished". Re-checking
// everything on a ~30 minute cadence means each match gets picked up by the
// first run after it finishes, AND by at least one subsequent confirmation
// run — which naturally catches any late corrections the API makes.
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

function normalizeTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// API-Football sometimes spells team names differently from the canonical
// names used in our fixtures/squads data — bridge the known variants.
const API_TEAM_ALIASES = {
  'korea republic': 'south korea',
  'czech republic': 'czechia',
  'turkey': 'turkiye',
  'cote divoire': 'ivory coast',
  'cote d ivoire': 'ivory coast',
  'united states': 'usa',
  'united states of america': 'usa',
  'congo dr': 'dr congo',
  'democratic republic of the congo': 'dr congo',
  'cabo verde': 'cape verde',
}
function aliasNorm(name) {
  const n = normalizeTeamName(name)
  return API_TEAM_ALIASES[n] || n
}

// Maps a finished API-Football fixture to { home, away, result, score },
// correctly encoding normal-time / extra-time / penalty-shootout outcomes —
// mirroring mapApiMatch() in src/App.jsx.
export function mapFixtureResult(fixture) {
  const statusShort = fixture.fixture?.status?.short
  const finished = ['FT', 'AET', 'PEN'].includes(statusShort)
  if (!finished || fixture.goals?.home == null || fixture.goals?.away == null) return null
  const hg = fixture.goals.home, ag = fixture.goals.away
  let result = hg > ag ? 'H' : ag > hg ? 'A' : 'D'
  let suffix = ''
  if (statusShort === 'AET') {
    suffix = ' (AET)'
    result = hg > ag ? 'H' : 'A'
  } else if (statusShort === 'PEN') {
    suffix = ' (PENS)'
    const hp = fixture.score?.penalty?.home, ap = fixture.score?.penalty?.away
    if (hp != null && ap != null) result = hp > ap ? 'H' : 'A'
  }
  return {
    home: fixture.teams.home.name,
    away: fixture.teams.away.name,
    result,
    score: `${hg}-${ag}${suffix}`,
  }
}

export default async function handler(req) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
  // is configured as an env var — verify it so this endpoint can't be triggered
  // by anyone who finds the URL. (If CRON_SECRET isn't set, allow through —
  // useful for first-deploy testing — but this should be set in production.)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const apiKey = process.env.API_FOOTBALL_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — missing API_FOOTBALL_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const summary = { gamesChecked: 0, gamesUpdated: 0, matchesUpdated: 0, overwrites: 0, errors: [] }

  try {
    // 1. Fetch all finished fixtures once — shared across every game.
    const apiRes = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=FT-AET-PEN', {
      headers: { 'x-apisports-key': apiKey },
    })
    const apiData = await apiRes.json()
    const fixtureResults = (apiData.response || []).map(mapFixtureResult).filter(Boolean)

    if (!fixtureResults.length) {
      return new Response(JSON.stringify({ ...summary, message: 'No finished fixtures yet' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Load every game's state directly (service role bypasses RLS — this
    //    must work for ALL games, not just ones the caller is a member of).
    const { data: games, error: gErr } = await supabase.from('game_states').select('game_id, state_json')
    if (gErr) throw gErr

    for (const row of games || []) {
      summary.gamesChecked++
      let state
      try { state = JSON.parse(row.state_json) } catch { continue }
      if (!state.matches?.length) continue

      const locked = state.lockedResults || {}
      const log = [...(state.resultSyncLog || [])]
      let dirty = false

      const newMatches = state.matches.map(m => {
        if (!m.teams?.includes(' v ')) return m
        const [mh, ma] = m.teams.split(' v ')
        const fr = fixtureResults.find(r => aliasNorm(r.home) === aliasNorm(mh) && aliasNorm(r.away) === aliasNorm(ma))
        if (!fr) return m
        if (locked[m.id]) return m
        if (m.result === fr.result && m.score === fr.score) return m // already in sync — nothing to do

        const overwriting = !!m.result
        if (overwriting) summary.overwrites++
        log.unshift({
          timestamp: new Date().toISOString(),
          matchId: m.id,
          teams: m.teams,
          from: overwriting ? { result: m.result, score: m.score } : null,
          to: { result: fr.result, score: fr.score },
          source: 'cron',
        })
        dirty = true
        summary.matchesUpdated++
        return { ...m, result: fr.result, score: fr.score }
      })

      if (dirty) {
        const newState = { ...state, matches: newMatches, resultSyncLog: log.slice(0, 49) }
        const { error: uErr } = await supabase
          .from('game_states')
          .update({ state_json: JSON.stringify(newState), updated_at: new Date().toISOString() })
          .eq('game_id', row.game_id)
        if (uErr) summary.errors.push(`${row.game_id}: ${uErr.message}`)
        else summary.gamesUpdated++
      }
    }

    return new Response(JSON.stringify({ ...summary, fixturesChecked: fixtureResults.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, ...summary }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
