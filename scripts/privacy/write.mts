// Round 13: the one write of the privacy policy and the footer links. A dry run unless --write is given.
//
//   node --env-file-if-exists=.env.local scripts/privacy/write.mts --email=name@example.com [--date=2026-11-16] [--write]
//   node scripts/privacy/write.mts --seed            rewrite the two documents in seed/seed.ndjson (no network)
//   node scripts/privacy/write.mts --fixture=<file>  write the two documents to a file, for the in-memory check
//
// Writes exactly two things: the `privacyPage` document (created or replaced) and `siteSettings.footerLinks`.
// The text is scripts/privacy/policy.md. After the write, the text is edited in Studio ("Privacy policy"), not here.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import { content, PLACEHOLDER } from './content.mts'

const fail = (msg: string): never => {
  console.error(msg)
  process.exit(1)
}

const args = new Map(process.argv.slice(2).map((a): [string, string | undefined] => (a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined])))
for (const k of args.keys()) if (!['--email', '--date', '--write', '--seed', '--fixture'].includes(k)) fail(`Unknown flag ${k}`)

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const date = args.get('--date') || today
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date must look like 2026-11-16')
const email = args.get('--email') || ''

if (args.has('--seed')) {
  // The seed is example content. Without --email it has no Contact link and keeps the placeholder in the text.
  const { footerLinks, privacyPage } = content(email, date)
  const file = new URL('../../seed/seed.ndjson', import.meta.url)
  // Every other line is kept exactly as it is.
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l && JSON.parse(l)._id !== 'privacyPage')
  const at = lines.findIndex((l) => JSON.parse(l)._id === 'siteSettings')
  const out = [...lines.slice(0, at), JSON.stringify({ ...JSON.parse(lines[at]), footerLinks }), JSON.stringify(privacyPage), ...lines.slice(at + 1)]
  writeFileSync(file, out.join('\n') + '\n')
  console.log(`seed/seed.ndjson: siteSettings.footerLinks and privacyPage rewritten (${out.length} documents).`)
  process.exit(0)
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('--email=<the contact address> is needed. The placeholder is never written.')
const { footerLinks, privacyPage } = content(email, date)
if (JSON.stringify([footerLinks, privacyPage]).includes(PLACEHOLDER)) fail(`The text still holds ${PLACEHOLDER}.`)

if (args.has('--fixture')) {
  writeFileSync(args.get('--fixture')!, JSON.stringify([privacyPage, { _id: 'siteSettings', footerLinks }]))
  process.exit(0)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
const write = args.has('--write')
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (write && !token) fail('SANITY_WRITE_TOKEN is not set (needed to write).')

const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false })
console.log(`Project ${projectId}, dataset ${dataset}${write ? '' : ' (dry run: nothing is written)'}\n`)

type Now = { settings: { _id: string; footerLinks?: { label: string; url: string }[] } | null; page: { updated?: string; blocks: number } | null }
const before = await client.fetch<Now>(`{
  "settings": *[_id == "siteSettings"][0]{ _id, footerLinks[]{label, url} },
  "page": *[_id == "privacyPage"][0]{ updated, "blocks": count(body) }
}`)
if (!before.settings) fail('There is no siteSettings document. Nothing written.')

const show = (links?: { label: string; url: string }[]) => (links?.length ? links.map((l) => `${l.label} → ${l.url}`).join(', ') : '(none)')
console.log('siteSettings.footerLinks')
console.log(`  now:  ${show(before.settings!.footerLinks)}`)
console.log(`  then: ${show(footerLinks)}\n`)
console.log('privacyPage')
console.log(`  now:  ${before.page ? `exists (updated ${before.page.updated || 'not set'}, ${before.page.blocks} blocks) and is replaced` : 'does not exist'}`)
console.log(`  then: title "${privacyPage.title}", updated ${privacyPage.updated}, ${privacyPage.body.length} blocks:\n`)
for (const b of privacyPage.body) {
  const text = b.children.map((c) => (c.marks.length ? `[${c.text}](${b.markDefs.find((d) => d._key === c.marks[0])!.href})` : c.text)).join('')
  console.log(`  ${b.style === 'h2' ? '## ' : b.style === 'h3' ? '### ' : b.listItem ? '- ' : ''}${text}`)
}

if (!write) {
  console.log('\nDry run. Run again with --write to write these two things.')
  process.exit(0)
}
await client.transaction().createOrReplace(privacyPage).patch('siteSettings', (p) => p.set({ footerLinks })).commit()
console.log('\nWritten: privacyPage and siteSettings.footerLinks.')
