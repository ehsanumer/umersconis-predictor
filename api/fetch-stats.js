// Server-side proxy for fetching match stats from BBC Sport.
// Called by the Killer Round admin UI with a BBC match page URL.
// Returns parsed stats as JSON, or the raw HTML if parsing fails.

export const config = { runtime: 'edge' }

const ALLOWED_DOMAINS = ['bbc.co.uk', 'bbc.com']

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return json({ error: 'url parameter required' }, 400)
  }

  let parsed
  try { parsed = new URL(url) } catch {
    return json({ error: 'Invalid URL' }, 400)
  }

  if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
    return json({ error: 'Domain not allowed' }, 403)
  }

  // Fetch the page server-side with browser-like headers.
  // Vercel edge IPs are not blocked by BBC the way Claude's fetch IPs are.
  let html
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.bbc.co.uk/sport/football',
      },
    })
    if (!res.ok) return json({ error: `BBC returned ${res.status}` }, 502)
    html = await res.text()
  } catch (e) {
    return json({ error: `Fetch failed: ${e.message}` }, 502)
  }

  const stats = parseBBCStats(html)
  if (stats) return json({ source: 'bbc', ok: true, stats })

  // Parsing failed — return enough of the raw HTML for debugging
  return json({
    source: 'bbc',
    ok: false,
    htmlSnippet: html.slice(0, 4000),
    message: 'Could not parse stats from page — see htmlSnippet for debugging',
  })
}

// ─── BBC STAT PARSER ──────────────────────────────────────────────────────────
// BBC Sport SSR pages embed their data in <script> tags as JSON.
// We try several known patterns and fall back to scraping stat labels/values
// from the rendered HTML if the JSON approach doesn't yield anything.

function parseBBCStats(html) {
  // Strategy 1: find a JSON blob containing "matchStats" or "teamStats"
  const jsonBlockRe = /<script[^>]*>\s*(?:window\.__\w+\s*=\s*)?(\{[\s\S]{200,}\})\s*<\/script>/g
  let m
  while ((m = jsonBlockRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1])
      const found = deepFind(obj, ['matchStats', 'teamStats', 'statistics', 'stats'])
      if (found) return normaliseStats(found)
    } catch {}
  }

  // Strategy 2: scrape the rendered HTML for BBC's stat bar markup.
  // BBC renders stats as pairs of numbers flanking a label, e.g.:
  //   <span class="...home-value...">12</span>
  //   <span class="...stat-title...">Total Shots</span>
  //   <span class="...away-value...">7</span>
  const scraped = scrapeBBCStatBars(html)
  if (scraped && Object.keys(scraped).length > 0) return scraped

  return null
}

function deepFind(obj, keys, depth = 0) {
  if (depth > 10 || typeof obj !== 'object' || obj === null) return null
  for (const k of keys) {
    if (k in obj) return obj[k]
  }
  for (const v of Object.values(obj)) {
    const found = deepFind(v, keys, depth + 1)
    if (found) return found
  }
  return null
}

function normaliseStats(raw) {
  // raw may be an array of { name, homeValue, awayValue } or similar shapes
  if (Array.isArray(raw)) {
    const out = {}
    raw.forEach(item => {
      const label = item.name || item.label || item.title || item.type
      if (!label) return
      out[label] = { home: item.homeValue ?? item.home ?? item.value1, away: item.awayValue ?? item.away ?? item.value2 }
    })
    return Object.keys(out).length ? out : null
  }
  if (typeof raw === 'object') return raw
  return null
}

function scrapeBBCStatBars(html) {
  // BBC's stat rows look like (class names vary but structure is consistent):
  //   <div class="...stat-row...">
  //     <span>12</span>   ← home value
  //     <span>Total Shots</span>
  //     <span>7</span>    ← away value
  //   </div>
  const statRowRe = /(\d+)\s*<\/(?:span|td)>\s*(?:<[^>]+>\s*)*([A-Za-z][A-Za-z\s/()]{2,40}?)\s*(?:<\/[^>]+>\s*)*(\d+)\s*<\/(?:span|td)>/g
  const knownStats = [
    'shots', 'shot on target', 'possession', 'foul', 'yellow', 'red',
    'offside', 'corner', 'pass', 'tackle', 'save', 'cross', 'block',
  ]
  const out = {}
  let m
  while ((m = statRowRe.exec(html)) !== null) {
    const label = m[2].trim()
    const lower = label.toLowerCase()
    if (knownStats.some(k => lower.includes(k))) {
      out[label] = { home: Number(m[1]), away: Number(m[3]) }
    }
  }
  return Object.keys(out).length ? out : null
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
