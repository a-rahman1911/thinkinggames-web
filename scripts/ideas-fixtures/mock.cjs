// Ideas (round 11): a stand-in for checking the section without writing anything to Sanity.
//
// Loaded before Next.js starts, it answers the site's Sanity queries from a copy of the real dataset
// (fetched read-only, once) plus the made-up articles in fixtures.cjs. The site's own code and GROQ
// queries run unchanged. Nothing here is part of the site: it is never loaded by a normal build or deploy.
//
//   IDEAS_FIXTURES=on    NODE_OPTIONS="--require ./scripts/ideas-fixtures/mock.cjs" npx next build && … npx next start
//   IDEAS_FIXTURES=empty the switch on, no articles
//   IDEAS_FIXTURES=off   the switch off, with published articles and drafts (for the private preview;
//                        also set SANITY_READ_TOKEN to any value; the preview secret is "fixture-secret")

const fs = require('node:fs')
const path = require('node:path')
const { parse, evaluate } = require('groq-js')
const { fixtures } = require('./fixtures.cjs')

const mode = process.env.IDEAS_FIXTURES
const realFetch = globalThis.fetch
const cacheFile = process.env.IDEAS_FIXTURES_CACHE || path.join(__dirname, '../../node_modules/.cache/ideas-fixtures-snapshot.json')

let snapshot
async function dataset(projectId, name) {
  if (!snapshot) {
    if (fs.existsSync(cacheFile)) snapshot = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    else {
      // Read only, no token: the published documents anyone can read.
      const url = `https://${projectId}.api.sanity.io/v2025-01-01/data/query/${name}?perspective=published&query=${encodeURIComponent('*[]')}`
      snapshot = (await (await realFetch(url)).json()).result
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
      fs.writeFileSync(cacheFile, JSON.stringify(snapshot))
    }
  }
  const made = fixtures(mode)
  const ids = new Set(made.map((d) => d._id))
  return [...snapshot.filter((d) => !ids.has(d._id)), ...made]
}

const isDraft = (d) => d._id.startsWith('drafts.')

// What Sanity's perspectives do: published only; everything; or drafts laid over published, under the published id.
function view(docs, perspective) {
  if (perspective === 'raw') return docs
  if (perspective === 'drafts' || perspective === 'previewDrafts') {
    const drafts = new Map(docs.filter(isDraft).map((d) => [d._id.slice(7), d]))
    const out = docs.filter((d) => !isDraft(d) && !drafts.has(d._id))
    for (const [id, d] of drafts) out.push({ ...d, _id: id, _originalId: d._id })
    return out
  }
  return docs.filter((d) => !isDraft(d))
}

globalThis.fetch = async function mockedFetch(input, init) {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(href)
  const m = /^([a-z0-9]+)\.api(?:cdn)?\.sanity\.io$/.exec(url.hostname)
  const q = /\/data\/query\/([^/?]+)/.exec(url.pathname)
  if (!mode || !m || !q) return realFetch(input, init)

  let query = url.searchParams.get('query')
  const params = {}
  for (const [k, v] of url.searchParams) if (k.startsWith('$')) params[k.slice(1)] = JSON.parse(v)
  const method = (init && init.method) || (typeof input === 'object' && input.method) || 'GET'
  if (method === 'POST') {
    const body = JSON.parse(init && init.body ? String(init.body) : await input.text())
    query = body.query
    Object.assign(params, body.params || {})
  }
  const docs = view(await dataset(m[1], q[1]), url.searchParams.get('perspective') || 'raw')
  const result = await (await evaluate(parse(query, { params }), { dataset: docs, params })).get()
  return new Response(JSON.stringify({ query, result, ms: 1 }), { status: 200, headers: { 'content-type': 'application/json' } })
}
