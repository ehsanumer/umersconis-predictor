// Server-side proxy for fetching match stats from BBC Sport.
// BBC embeds all match data in window.__INITIAL_DATA__ as a JSON string.
// The 'match-stats?' key within it contains full team stats from their
// sports data API. This edge function fetches, parses, and returns them.

export const config = { runtime: 'edge' }

const ALLOWED_DOMAINS = ['bbc.co.uk', 'bbc.com']

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return json({ error: 'url parameter required' }, 400)

  let parsed
  try { parsed = new URL(url) } catch {
    return json({ error: 'Invalid URL' }, 400)
  }
  if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
    return json({ error: 'Domain not allowed' }, 403)
  }

  let html
  try {
    const res = await fetch(url.split('#')[0], { // strip fragment — not sent to server
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.bbc.co.uk/sport/football',
      },
    })
    if (!res.ok) return json({ error: `BBC returned HTTP ${res.status}` }, 502)
    html = await res.text()
  } catch (e) {
    return json({ error: `Fetch failed: ${e.message}` }, 502)
  }

  // ── Extract __INITIAL_DATA__ ─────────────────────────────────────────────
  // BBC embeds all page data as: window.__INITIAL_DATA__="<escaped JSON string>";
  const initMatch = html.match(/window\.__INITIAL_DATA__="([\s\S]+?)";\s*<\/script>/)
  if (!initMatch) return json({ error: 'Could not find __INITIAL_DATA__ in page' }, 502)

  let initialData
  try {
    // The value is a JSON string with unicode escapes — decode then parse
    const decoded = initMatch[1]
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
    initialData = JSON.parse(decoded)
  } catch (e) {
    return json({ error: `Failed to parse __INITIAL_DATA__: ${e.message}` }, 502)
  }

  // ── Find the match-stats key ─────────────────────────────────────────────
  const dataKeys = Object.keys(initialData.data || {})
  const statsKey = dataKeys.find(k => k.startsWith('match-stats?'))
  if (!statsKey) return json({ error: 'No match-stats key found — wrong page type?' }, 404)

  const raw = initialData.data[statsKey]?.data
  if (!raw?.homeTeam || !raw?.awayTeam) {
    return json({ error: 'match-stats data missing homeTeam/awayTeam', raw }, 502)
  }

  // ── Shape into a clean response ──────────────────────────────────────────
  const stats = buildStats(raw)
  return json({ ok: true, source: 'bbc', matchUrn: raw.urn, status: raw.eventStatus, stats })
}

function buildStats(raw) {
  const h = raw.homeTeam
  const a = raw.awayTeam

  return {
    home: { name: h.name.fullName, code: h.name.code },
    away: { name: a.name.fullName, code: a.name.code },
    stats: [
      stat('Possession (%)',      h.stats.possessionPercentage?.total,   a.stats.possessionPercentage?.total),
      stat('Total Shots',         h.stats.shotsTotal?.total,              a.stats.shotsTotal?.total),
      stat('Shots on Target',     h.stats.shotsOnTarget?.total,           a.stats.shotsOnTarget?.total),
      stat('Shots Off Target',    h.stats.attack?.shotsOffTarget?.total,  a.stats.attack?.shotsOffTarget?.total),
      stat('Shots Blocked',       h.stats.attack?.shotsBlocked?.total,    a.stats.attack?.shotsBlocked?.total),
      stat('Goalkeeper Saves',    h.stats.shotsSaved?.total,              a.stats.shotsSaved?.total),
      stat('Fouls',               h.stats.foulsCommitted?.total,          a.stats.foulsCommitted?.total),
      stat('Yellow Cards',        h.stats.defence?.totalYellowCard?.total ?? 0, a.stats.defence?.totalYellowCard?.total ?? 0),
      stat('Red Cards',           h.stats.defence?.totalRedCard?.total ?? 0,    a.stats.defence?.totalRedCard?.total ?? 0),
      stat('Corners',             h.stats.cornersWon?.total,              a.stats.cornersWon?.total),
      stat('Offsides',            h.stats.attack?.totalOffside?.total ?? 0, a.stats.attack?.totalOffside?.total ?? 0),
      stat('Total Passes',        h.stats.distribution?.totalPass?.total, a.stats.distribution?.totalPass?.total),
      stat('Accurate Passes',     h.stats.distribution?.accuratePass?.total, a.stats.distribution?.accuratePass?.total),
      stat('Pass Accuracy (%)',   h.stats.distribution?.accuratePassPercentage?.total, a.stats.distribution?.accuratePassPercentage?.total),
      stat('Total Tackles',       h.stats.defence?.totalTackle?.total,    a.stats.defence?.totalTackle?.total),
      stat('Tackles Won',         h.stats.defence?.wonTackle?.total,      a.stats.defence?.wonTackle?.total),
      stat('Clearances',          h.stats.defence?.totalClearance?.total, a.stats.defence?.totalClearance?.total),
      stat('Touches in Box',      h.stats.touchesInBox?.total,            a.stats.touchesInBox?.total),
      stat('Crosses',             h.stats.distribution?.totalCross?.total, a.stats.distribution?.totalCross?.total),
      stat('Aerials Won',         h.stats.aerialsWon?.total,              a.stats.aerialsWon?.total),
      stat('xG',                  h.stats.expected?.goals?.total,         a.stats.expected?.goals?.total),
    ].filter(s => s.home !== undefined && s.away !== undefined),
  }
}

function stat(label, home, away) {
  return { label, home: home ?? undefined, away: away ?? undefined }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
