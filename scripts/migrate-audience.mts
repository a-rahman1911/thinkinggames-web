// One-off migration for the audience split (Task B2). Written for project rh1roy5u, dataset production.
//
//   node --env-file-if-exists=.env.local scripts/migrate-audience.mts            # dry run: prints the plan, writes nothing
//   node --env-file-if-exists=.env.local scripts/migrate-audience.mts --write    # applies the plan in one transaction
//
// For every game still in the old shape (it has a showOn field):
//   showOn             → teachers.show and parents.show
//   age range          → teachers.grades, worked out ONCE here (K-1 = ages 5–7, 2-3 = 7–9, 4-5 = 9–11).
//                        From now on grades are set by hand in Studio.
//   when               → parents.when
//   featured           → teachers.featured and parents.featured
//   moments (on game)  → each moment's ordered games array, rebuilt from the links: the games the site
//                        showed under that moment, in the order it showed them (featured first, then A to Z).
//   showOn, moments, featured and when are removed from the game. hidden stays.
// Refuses to run while any game or moment has an unpublished draft, so Studio never shows a stale draft
// over the migrated document. Safe to re-run: games already in the new shape are left alone.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (with --write) SANITY_WRITE_TOKEN.

import { createClient } from '@sanity/client'
import { GRADES } from '../lib/derive.ts'

const TARGET = { projectId: 'rh1roy5u', dataset: 'production' }
/** The age range each grade band covered when grades were worked out from age. Used once, here. */
const GRADE_AGES: Record<(typeof GRADES)[number], { from: number; to: number }> = {
  'K-1': { from: 5, to: 7 },
  '2-3': { from: 7, to: 9 },
  '4-5': { from: 9, to: 11 },
}

const flags = new Set(process.argv.slice(2))
const write = flags.has('--write')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (projectId !== TARGET.projectId || dataset !== TARGET.dataset) {
  if (!flags.has('--allow-other-dataset')) fail(`This migration was written for ${TARGET.projectId}/${TARGET.dataset}, not ${projectId}/${dataset}. Pass --allow-other-dataset to run it anyway.`)
}
if (write && !token) fail('SANITY_WRITE_TOKEN is not set. Add it to .env.local, or drop --write for a dry run.')

const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false })

type Ref = { _type: 'reference'; _ref: string; _key?: string }
type OldGame = {
  _id: string
  name: string
  ageFrom?: number
  ageTo?: number
  hidden?: boolean
  showOn?: string[] | null
  featured?: boolean | null
  when?: Ref[] | null
  moments?: Ref[] | null
  teachers?: { show?: boolean } | null
  parents?: { show?: boolean } | null
}
type Moment = { _id: string; title: string; order?: number; games?: Ref[] | null }

console.log(`Target: ${projectId}/${dataset} (${write ? 'WRITE' : 'dry run'})`)

const { games, moments, drafts } = await client.fetch<{ games: OldGame[]; moments: Moment[]; drafts: string[] }>(`{
  "games": *[_type == "game" && !(_id in path("drafts.**"))] | order(name asc){ _id, name, ageFrom, ageTo, hidden, showOn, featured, when, moments, teachers, parents },
  "moments": *[_type == "moment" && !(_id in path("drafts.**"))] | order(order asc){ _id, title, order, games },
  "drafts": *[_type in ["game", "moment"] && _id in path("drafts.**")]._id
}`)
if (drafts.length) fail(`Publish or discard these drafts first, then re-run: ${drafts.join(', ')}`)

const isOld = (g: OldGame) => Array.isArray(g.showOn)
const old = games.filter(isOld)
const done = games.filter((g) => !isOld(g))
if (!old.length) {
  console.log(`Nothing to migrate: all ${games.length} games already have the audience shape.`)
  process.exit(0)
}

// ---------- games ----------

const gradesFromAges = (from: number, to: number) => GRADES.filter((g) => from <= GRADE_AGES[g].to && to >= GRADE_AGES[g].from)

const gamePatches = old.map((g) => {
  const showOn = g.showOn || []
  const featured = g.featured === true
  const teachers = {
    show: showOn.includes('teachers'),
    grades: typeof g.ageFrom === 'number' && typeof g.ageTo === 'number' ? gradesFromAges(g.ageFrom, g.ageTo) : [],
    featured,
  }
  const parents = {
    show: showOn.includes('parents'),
    ...(g.when?.length ? { when: g.when } : {}),
    featured,
  }
  return { _id: g._id, name: g.name, set: { teachers, parents }, unset: ['showOn', 'moments', 'featured', 'when'] }
})

console.log(`\n${old.length} game${old.length === 1 ? '' : 's'} to migrate${done.length ? `, ${done.length} already migrated` : ''}.`)
console.table(
  gamePatches.map((p) => ({
    Game: p.name,
    'Teachers show': p.set.teachers.show ? 'Yes' : 'No',
    Grades: p.set.teachers.grades.join(', '),
    'Parents show': p.set.parents.show ? 'Yes' : 'No',
    When: (p.set.parents.when || []).map((r) => r._ref).join(', '),
    Featured: p.set.teachers.featured ? 'Yes' : 'No',
    Removes: p.unset.join(', '),
  })),
)

// ---------- moments ----------

// Keep what a moment already lists (games migrated earlier), then add the games linked to it, in the
// order the site showed them: featured first, then by name. Only games shown on Teachers are linked.
const byFeaturedThenName = (a: OldGame, b: OldGame) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name)
const gameIds = new Set(games.map((g) => g._id))
const momentPatches = moments.map((m) => {
  const kept = (m.games || []).filter((r) => gameIds.has(r._ref))
  const linked = old
    .filter((g) => (g.showOn || []).includes('teachers') && (g.moments || []).some((r) => r._ref === m._id))
    .sort(byFeaturedThenName)
    .filter((g) => !kept.some((r) => r._ref === g._id))
  const refs: Ref[] = [...kept, ...linked.map((g) => ({ _type: 'reference' as const, _ref: g._id, _key: g._id }))]
  return { _id: m._id, title: m.title, games: refs, names: refs.map((r) => games.find((g) => g._id === r._ref)?.name || r._ref) }
})

console.log(`\n${moments.length} moment${moments.length === 1 ? '' : 's'} get an ordered games array:`)
console.table(momentPatches.map((m) => ({ Moment: m.title, Games: m.games.length, Order: m.names.join(' → ') })))

if (!write) {
  console.log('\nDry run: nothing written. Re-run with --write to apply.')
  process.exit(0)
}

// ---------- write ----------

const tx = client.transaction()
for (const p of gamePatches) tx.patch(p._id, (patch) => patch.set(p.set).unset(p.unset))
for (const m of momentPatches) tx.patch(m._id, (patch) => patch.set({ games: m.games }))
const result = await tx.commit()
console.log(`\nDone. Transaction ${result.transactionId}: ${gamePatches.length} games and ${momentPatches.length} moments updated.`)

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
