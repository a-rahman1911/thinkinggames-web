// One-off migration: minutes become one of the options "5", "10", "20", "30+" (stored as strings).
//
//   node --env-file-if-exists=.env.local scripts/migrate-minutes.mts [--dry-run]
//
// Converts the shared `minutes` and the `teachers.minutes` / `parents.minutes` overrides of every game
// (drafts included) from a number to the option string: 5 → "5", 10 → "10", 20 → "20", 30 or more → "30+".
// Any other number goes to the nearest option at or above it (7 → "10", 25 → "30+"); each conversion is listed.
// Values that are already strings are left alone. Safe to run more than once.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import { createClient } from '@sanity/client'
import { MINUTES } from '../lib/derive.ts'

const flags = new Set(process.argv.slice(2))
const dryRun = flags.has('--dry-run')
for (const f of flags) if (f !== '--dry-run') fail(`Unknown flag ${f}. Usage: migrate-minutes.mts [--dry-run]`)

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (!token) fail('SANITY_WRITE_TOKEN is not set (needed to read drafts and to write).')

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  token,
  useCdn: false,
  // Test hook: point at a local stand-in instead of api.sanity.io.
  ...(process.env.SANITY_API_HOST ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false } : {}),
})

type Value = number | string | null | undefined
type Game = { _id: string; name: string; minutes?: Value; tMinutes?: Value; pMinutes?: Value }

console.log(`Project ${projectId}, dataset ${dataset}${dryRun ? ' (dry run)' : ''}`)
const games = await client.fetch<Game[]>(
  `*[_type == "game"] | order(name asc){ _id, name, minutes, "tMinutes": teachers.minutes, "pMinutes": parents.minutes }`,
)

const option = (n: number): (typeof MINUTES)[number] => (n <= 5 ? '5' : n <= 10 ? '10' : n <= 20 ? '20' : '30+')
const FIELDS = [
  ['minutes', 'minutes'],
  ['tMinutes', 'teachers.minutes'],
  ['pMinutes', 'parents.minutes'],
] as const

const plans = games
  .map((g) => {
    const set: Record<string, string> = {}
    for (const [key, path] of FIELDS) if (typeof g[key] === 'number') set[path] = option(g[key] as number)
    return { g, set }
  })
  .filter((p) => Object.keys(p.set).length)

const unknown = games.flatMap((g) =>
  FIELDS.filter(([key]) => typeof g[key] === 'string' && !(MINUTES as readonly string[]).includes(g[key] as string)).map(
    ([key, path]) => `${g.name}: ${path} = "${g[key]}"`,
  ),
)

console.log(`\n${games.length} games, ${plans.length} to convert.`)
if (plans.length)
  console.table(
    plans.map(({ g, set }) => ({
      Game: g.name + (g._id.startsWith('drafts.') ? ' (draft)' : ''),
      ...Object.fromEntries(FIELDS.map(([key, path]) => [path, path in set ? `${g[key]} → "${set[path]}"` : ''])),
    })),
  )
if (unknown.length) console.log(`Strings that are not one of ${MINUTES.join(', ')} (left alone, fix in Studio):\n  ${unknown.join('\n  ')}`)

if (!plans.length) {
  console.log('Nothing to migrate.')
  process.exit(0)
}
if (dryRun) {
  console.log('Dry run: nothing written.')
  process.exit(0)
}

const tx = client.transaction()
for (const { g, set } of plans) tx.patch(g._id, (p) => p.set(set))
const result = await tx.commit()
console.log(`Done. Transaction ${result.transactionId}: ${plans.length} games converted.`)

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
