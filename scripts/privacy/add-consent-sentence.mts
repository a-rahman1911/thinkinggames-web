// Round 14, after the merge: one sentence added to the end of the "Necessary" item of the policy's Cookies section.
// A dry run unless --write is given. It changes one piece of text in the `privacyPage` document and nothing else;
// everything edited in Studio since round 13 is kept.
//
//   node --env-file-if-exists=.env.local scripts/privacy/add-consent-sentence.mts [--updated=2026-11-17] [--write]
//
// --updated also sets the "Last updated" date shown under the heading.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import { createClient } from '@sanity/client'

const SENTENCE = 'We also keep your cookie choice in a cookie named tg_consent.'

const fail = (msg: string): never => {
  console.error(msg)
  process.exit(1)
}
const flags = process.argv.slice(2)
for (const f of flags) if (f !== '--write' && !/^--updated=\d{4}-\d{2}-\d{2}$/.test(f)) fail(`Unknown flag ${f}`)
const write = flags.includes('--write')
const updated = flags.find((f) => f.startsWith('--updated='))?.slice(10)

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (write && !token) fail('SANITY_WRITE_TOKEN is not set (needed to write).')

const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false, perspective: 'published' })
console.log(`Project ${projectId}, dataset ${dataset}${write ? '' : ' (dry run: nothing is written)'}\n`)

type Span = { _key: string; _type: string; text?: string }
type Block = { _key: string; _type: string; listItem?: string; children?: Span[] }
const page = await client.fetch<{ _rev: string; updated?: string; body?: Block[] } | null>(`*[_id == "privacyPage"][0]{ _rev, updated, body }`)
if (!page) fail('There is no privacyPage document. Nothing to change in the dataset; change scripts/privacy/policy.md only.')
const draft = await client.fetch<string | null>(`*[_id == "drafts.privacyPage"][0]._id`, {}, { perspective: 'raw' })

const text = (b: Block) => (b.children || []).map((c) => c.text || '').join('')
const found = (page!.body || []).filter((b) => b._type === 'block' && b.listItem === 'bullet' && text(b).startsWith('Necessary.'))
if (found.length !== 1) fail(`Expected one list item starting with "Necessary." and found ${found.length}. Nothing written.`)
const block = found[0]
const last = block.children![block.children!.length - 1]

console.log(`privacyPage (revision ${page!._rev}), list item ${block._key}`)
console.log(`\n  now:\n  - ${text(block)}`)
if (text(block).includes('tg_consent')) {
  console.log('\nThe item already mentions tg_consent. Nothing to do.')
  process.exit(0)
}
const next = `${(last.text || '').trimEnd()} ${SENTENCE}`
console.log(`\n  then:\n  - ${text(block).slice(0, text(block).length - (last.text || '').length)}${next}`)
console.log(`\n  One field changes: body[_key=="${block._key}"].children[_key=="${last._key}"].text. The other ${page!.body!.length - 1} blocks and the title are not touched.`)
console.log(updated ? `  "Last updated": ${page!.updated || 'not set'} → ${updated}` : `  "Last updated" stays ${page!.updated || 'not set'}.`)
if (draft) console.log('\n  Note: there is an unpublished draft of the policy in Studio. It does not get this sentence; publishing that draft later would remove it.')

if (!write) {
  console.log('\nDry run. Run again with --write to write this.')
  process.exit(0)
}
// Refused if the document changed since it was read above.
await client
  .patch('privacyPage')
  .ifRevisionId(page!._rev)
  .set({ [`body[_key=="${block._key}"].children[_key=="${last._key}"].text`]: next, ...(updated ? { updated } : {}) })
  .commit()
console.log('\nWritten.')
