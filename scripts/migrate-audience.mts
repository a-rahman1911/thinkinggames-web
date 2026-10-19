// One-off migration: split game properties by audience (Task B2).
//
//   node --env-file-if-exists=.env.local scripts/migrate-audience.mts [--dry-run]
//
// For every game still in the old shape:
//   showOn            → teachers.show / parents.show
//   featured          → teachers.featured and parents.featured
//   when              → parents.when
//   age range         → teachers.grades, worked out once from ageFrom/ageTo (K-1 = ages 5-7, 2-3 = 7-9, 4-5 = 9-11)
//   moments (on game) → appended to each moment's games list, then removed from the game
// Games already in the new shape are left alone. Each moment's games list keeps whatever it already
// holds, in order; games linked through the old game.moments field are appended (featured first, then
// A to Z: the order the site showed them in). Safe to run more than once.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import { createClient } from '@sanity/client'
import { gradesFromAge } from '../lib/derive.ts'

const flags = new Set(process.argv.slice(2))
const dryRun = flags.has('--dry-run')
for (const f of flags) if (f !== '--dry-run') fail(`Unknown flag ${f}. Usage: migrate-audience.mts [--dry-run]`)

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

type Ref = { _type: 'reference'; _ref: string; _key?: string }
type OldGame = {
  _id: string
  name: string
  ageFrom?: number
  ageTo?: number
  showOn?: string[] | null
  featured?: boolean | null
  when?: Ref[] | null
  moments?: Ref[] | null
  teachers?: { show?: boolean } | null
  parents?: { show?: boolean } | null
}
type Moment = { _id: string; title: string; order?: number; games?: Ref[] | null }

console.log(`Project ${projectId}, dataset ${dataset}${dryRun ? ' (dry run)' : ''}`)
const { games, moments } = await client.fetch<{ games: OldGame[]; moments: Moment[] }>(`{
  "games": *[_type == "game"] | order(name asc){ _id, name, ageFrom, ageTo, showOn, featured, when, moments, teachers, parents },
  "moments": *[_type == "moment"] | order(order asc){ _id, title, order, games }
}`)
const nameOf = new Map(games.map((g) => [g._id, g.name]))

// ---------- games ----------

const LEGACY = ['showOn', 'featured', 'when', 'moments'] as const
type GamePlan = { id: string; name: string; action: string; set?: Record<string, unknown>; unset: string[] }

const gamePlans: GamePlan[] = games.map((g) => {
  const legacy = LEGACY.filter((k) => g[k] !== undefined && g[k] !== null)
  const migrated = !!g.teachers && !!g.parents
  if (migrated && !legacy.length) return { id: g._id, name: g.name, action: 'already migrated', unset: [] }
  if (migrated) return { id: g._id, name: g.name, action: `strip old fields (${legacy.join(', ')})`, unset: [...legacy] }

  const showOn = g.showOn || []
  const age = { ageFrom: g.ageFrom ?? 0, ageTo: g.ageTo ?? 0 }
  const tShow = showOn.includes('teachers')
  const pShow = showOn.includes('parents')
  const featured = !!g.featured
  const set = {
    teachers: g.teachers || { show: tShow, ...(tShow ? { grades: gradesFromAge(age) } : {}), featured },
    parents: g.parents || { show: pShow, ...(pShow && g.when?.length ? { when: g.when } : {}), featured },
  }
  return { id: g._id, name: g.name, action: 'migrate', set, unset: [...legacy] }
})

console.log(`\n${games.length} games:`)
console.table(
  gamePlans.map((p) => {
    const g = games.find((x) => x._id === p.id)!
    const t = (p.set?.teachers as { show: boolean; grades?: string[] } | undefined) || g.teachers
    const pa = (p.set?.parents as { show: boolean; when?: Ref[] } | undefined) || g.parents
    return {
      Game: p.name + (p.id.startsWith('drafts.') ? ' (draft)' : ''),
      Action: p.action,
      Teachers: t?.show ? `on · grades ${((t as { grades?: string[] }).grades || []).join(', ') || '(none)'}` : 'off',
      Parents: pa?.show ? `on · ${((pa as { when?: Ref[] }).when || []).length} when` : 'off',
    }
  }),
)

// ---------- moments ----------

// The old game.moments links, in the order the site showed them: featured first, then A to Z. Published games only.
const linked = games
  .filter((g) => !g._id.startsWith('drafts.') && g.moments?.length)
  .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name))

type MomentPlan = { id: string; title: string; before: string[]; add: string[] }
const momentPlans: MomentPlan[] = moments.map((m) => {
  const before = (m.games || []).map((r) => r._ref)
  const have = new Set(before)
  const add: string[] = []
  for (const g of linked) {
    if (g.moments!.some((r) => r._ref === m._id) && !have.has(g._id)) {
      have.add(g._id)
      add.push(g._id)
    }
  }
  return { id: m._id, title: m.title, before, add }
})

console.log(`\n${moments.length} moments:`)
console.table(
  momentPlans.map((m) => ({
    Moment: m.title,
    Kept: m.before.length,
    Added: m.add.length,
    'Order after': [...m.before, ...m.add].map((id) => nameOf.get(id) || id).join(' → '),
  })),
)

// ---------- write ----------

const gameChanges = gamePlans.filter((p) => p.set || p.unset.length)
const momentChanges = momentPlans.filter((m) => m.add.length)
if (!gameChanges.length && !momentChanges.length) {
  console.log('\nNothing to migrate: every game is in the new shape and every moment list is complete.')
  process.exit(0)
}
console.log(`\n${gameChanges.length} game${gameChanges.length === 1 ? '' : 's'} to change, ${momentChanges.length} moment list${momentChanges.length === 1 ? '' : 's'} to extend.`)
if (dryRun) {
  console.log('Dry run: nothing written.')
  process.exit(0)
}

const tx = client.transaction()
for (const p of gameChanges) {
  tx.patch(p.id, (patch) => {
    if (p.set) patch = patch.set(p.set)
    return p.unset.length ? patch.unset(p.unset) : patch
  })
}
for (const m of momentChanges) {
  tx.patch(m.id, (patch) =>
    patch.setIfMissing({ games: [] }).insert(
      'after',
      'games[-1]',
      m.add.map((id) => ({ _type: 'reference', _ref: id, _key: id })),
    ),
  )
}
const result = await tx.commit()
console.log(`Done. Transaction ${result.transactionId}.`)

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
