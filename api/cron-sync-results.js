// Background cron — syncs World Cup 2026 match results from Wikipedia into
// every game's state. No API key required; Wikipedia is updated within minutes
// of the final whistle.
//
// Runs via GitHub Actions every ~30 minutes (see .github/workflows/sync-results.yml).
// The Vercel cron in vercel.json (0 6 * * *) is a once-daily fallback.
//
// Each run parses {{Football box}} templates from the WC2026 Wikipedia articles,
// builds a list of finished matches, then for every game overwrites any match
// whose stored result/score differs — unless the admin has locked that match
// (game.lockedResults[matchId] === true). Every overwrite is logged to
// game.resultSyncLog for audit purposes.
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

// ─── WIKIPEDIA PAGES TO CHECK ─────────────────────────────────────────────────
// Group stage always exists once the tournament starts.
// Knockout stage pages are created as the rounds are reached — 404s are handled
// gracefully (no fixtures returned from that page, nothing breaks).
const WIKI_PAGES = [
  '2026_FIFA_World_Cup_group_stage',
  '2026_FIFA_World_Cup_round_of_32',
  '2026_FIFA_World_Cup_round_of_16',
  '2026_FIFA_World_Cup_quarter-finals',
  '2026_FIFA_World_Cup_semi-finals',
  '2026_FIFA_World_Cup_third-place_play-off',
  '2026_FIFA_World_Cup_final',
]

// ─── WIKIPEDIA SCRAPING ───────────────────────────────────────────────────────

async function fetchWikiFixtures() {
  const results = []
  for (const page of WIKI_PAGES) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Umersconi-Predictor/1.0 (result-sync bot; ehsanumer@gmail.com)' },
      })
      const data = await res.json()
      if (data.error) continue // page doesn't exist yet — skip quietly
      const wikitext = data.parse?.wikitext?.['*'] || ''
      results.push(...parseFootballBoxes(wikitext))
    } catch { continue }
  }
  return results
}

// Parse all {{Football box}} (and {{football box}}) templates from wikitext.
function parseFootballBoxes(wikitext) {
  const results = []
  const lower = wikitext.toLowerCase()
  let searchFrom = 0

  while (true) {
    // Case-insensitive search for any Football box variant
    const idx = lower.indexOf('{{football box', searchFrom)
    if (idx === -1) break

    // Find the matching closing }} by tracking nesting depth
    let depth = 0, i = idx
    while (i < wikitext.length) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i += 2 }
      else if (wikitext[i] === '}' && wikitext[i + 1] === '}') { depth--; i += 2; if (depth === 0) break }
      else i++
    }
    searchFrom = i

    const template = wikitext.slice(idx, i)
    const params = parseTemplateParams(template)
    const fixture = mapFootballBox(params)
    if (fixture) results.push(fixture)
  }
  return results
}

// Split a template string into { key: value } params, respecting nested {{ }} and [[ ]].
function parseTemplateParams(template) {
  const params = {}
  let depth = 0, start = 0, inTemplate = false

  // Skip the opening {{Football box line
  const pipeAfterName = template.indexOf('|')
  if (pipeAfterName === -1) return params
  start = pipeAfterName + 1

  for (let i = start; i < template.length; i++) {
    const c = template[i], n = template[i + 1]
    if ((c === '{' && n === '{') || (c === '[' && n === '[')) { depth++; i++ }
    else if ((c === '}' && n === '}') || (c === ']' && n === ']')) {
      depth--; i++
      if (depth < 0) { // hit the outer closing }}
        const chunk = template.slice(start, i - 1).trim()
        applyParam(params, chunk)
        break
      }
    } else if (c === '|' && depth === 0) {
      const chunk = template.slice(start, i).trim()
      applyParam(params, chunk)
      start = i + 1
    }
  }
  return params
}

function applyParam(params, chunk) {
  const eq = chunk.indexOf('=')
  if (eq === -1) return
  const key = chunk.slice(0, eq).trim().toLowerCase()
  const val = chunk.slice(eq + 1).trim()
  if (key) params[key] = val
}

// Convert parsed Football box params → { home, away, result, score } or null.
function mapFootballBox(p) {
  const team1 = cleanWikiName(p.team1 || '')
  const team2 = cleanWikiName(p.team2 || '')
  if (!team1 || !team2) return null

  // Score field: "2–1", "1–1 {{small|(a.e.t.)}}", "0–0 (a.e.t.)", etc.
  const rawScore = stripWikiMarkup(p.score || '')

  // Not played yet if score is blank or non-numeric
  const scoreMatch = rawScore.match(/(\d+)\s*[–\-]\s*(\d+)/)
  if (!scoreMatch) return null

  const hg = parseInt(scoreMatch[1])
  const ag = parseInt(scoreMatch[2])

  const isAET  = /a\.e\.t|aet/i.test(rawScore) || /a\.e\.t|aet/i.test(p.score || '')
  const pen1   = p.penalties1 != null ? parseInt(p.penalties1) : NaN
  const pen2   = p.penalties2 != null ? parseInt(p.penalties2) : NaN
  const hasPens = !isNaN(pen1) && !isNaN(pen2)

  let result, score
  if (hasPens) {
    result = pen1 > pen2 ? 'H' : 'A'
    score  = `${hg}-${ag} (PENS)`
  } else if (isAET) {
    result = hg > ag ? 'H' : ag > hg ? 'A' : 'D'
    score  = `${hg}-${ag} (AET)`
  } else {
    result = hg > ag ? 'H' : ag > hg ? 'A' : 'D'
    score  = `${hg}-${ag}`
  }

  return { home: team1, away: team2, result, score }
}

// Strip wikilinks and templates, leaving plain text.
// [[Team name|Display]]  →  Display
// [[Team name]]          →  Team name
// {{fl|Mexico}}          →  Mexico  (flag template — last param is the name)
// {{fb|Mexico}}          →  Mexico
function cleanWikiName(raw) {
  let s = raw
  // Expand flag/team templates: {{fl|Name}}, {{fb|Name}}, {{flc|Name}}, etc.
  s = s.replace(/\{\{(?:fl|fb|flc|flagicon|flag)[^|]*\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1')
  // [[Display|Link]] and [[Link]]
  s = s.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1')
  // Strip remaining templates and HTML
  s = stripWikiMarkup(s)
  // Remove " national football team" / " national soccer team" suffixes
  s = s.replace(/\s+national\s+(?:football|soccer)\s+team/i, '').trim()
  return s
}

function stripWikiMarkup(s) {
  return s
    .replace(/\{\{[^}]*\}\}/g, '')   // remove {{...}}
    .replace(/<[^>]+>/g, '')          // remove HTML tags
    .replace(/\[\[[^\]]+\]\]/g, '')   // remove any leftover wikilinks
    .replace(/'{2,}/g, '')            // remove bold/italic markup
    .trim()
}

// ─── TEAM NAME NORMALISATION ──────────────────────────────────────────────────

function normalizeTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Wikipedia sometimes uses different spellings from our canonical game data.
const WIKI_ALIASES = {
  'korea republic':                    'south korea',
  'republic of korea':                 'south korea',
  'czech republic':                    'czechia',
  'turkey':                            'turkiye',
  'cote divoire':                      'ivory coast',
  "cote d ivoire":                     'ivory coast',
  'united states':                     'usa',
  'united states of america':          'usa',
  'congo dr':                          'dr congo',
  'democratic republic of the congo':  'dr congo',
  'cabo verde':                        'cape verde',
  'bosnia and herzegovina':            'bosnia & herzegovina',
  'curacao':                           'curaçao',
  'iran':                              'iran',
}
function aliasNorm(name) {
  const n = normalizeTeamName(name)
  return WIKI_ALIASES[n] || n
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabaseUrl  = process.env.SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — missing SUPABASE_URL / SUPABASE_SERVICE_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const summary = { gamesChecked: 0, gamesUpdated: 0, matchesUpdated: 0, overwrites: 0, errors: [], source: 'wikipedia' }

  try {
    // 1. Scrape finished fixtures from Wikipedia.
    const fixtureResults = await fetchWikiFixtures()

    if (!fixtureResults.length) {
      return new Response(JSON.stringify({ ...summary, message: 'No finished fixtures found on Wikipedia yet' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Load every game's state (service role bypasses RLS).
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
        const fr = fixtureResults.find(r =>
          aliasNorm(r.home) === aliasNorm(mh) && aliasNorm(r.away) === aliasNorm(ma)
        )
        if (!fr) return m
        if (locked[m.id]) return m
        if (m.result === fr.result && m.score === fr.score) return m

        const overwriting = !!m.result
        if (overwriting) summary.overwrites++
        log.unshift({
          timestamp: new Date().toISOString(),
          matchId: m.id,
          teams: m.teams,
          from: overwriting ? { result: m.result, score: m.score } : null,
          to: { result: fr.result, score: fr.score },
          source: 'wikipedia-cron',
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

    return new Response(JSON.stringify({ ...summary, fixturesFound: fixtureResults.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, ...summary }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
