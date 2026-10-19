// Import games from the Games spreadsheet into Sanity.
//
//   npm run import:games -- <file.xlsx> <imagesDir> [--dry-run] [--prune] [--allow-missing-images]
//
// Reads the "Games" sheet (row 1 = headers; a trailing " *" marks a required column) and the
// "Lists" sheet (allowed values for Skills, Teacher grades, Teacher moments, When, Players, Platforms, Badges).
// Columns are the ones described on the sheet's Guide tab: Shared columns, then Teacher* and Parent*
// columns. A Teacher*/Parent* "only if different" column left blank means "use the Shared value".
//
// Every row is validated first. If any row has an error, a table is printed and nothing is written.
// Games are upserted by id "game-<slugified name>", so re-running updates. Games that are no longer
// in the sheet are kept unless --prune is passed. Rows whose Notes contain "EXAMPLE ROW" are skipped.
//
// Teacher moments: a game is appended to the END of each listed moment's games list if it is not
// already there. Existing entries are never reordered or removed (editors order them in Studio).
// Sheet row order sets the order of the games added in one run.
//
// --allow-missing-images is for testing only: an image file that cannot be found is replaced by a
// grey placeholder instead of failing the row.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createClient, type SanityClient } from '@sanity/client'
import XLSX from 'xlsx'
import { BADGE_KINDS, COSTS, FEELS, GRADES, PLATFORMS, PLAYERS } from '../lib/derive.ts'

// ---------- arguments and environment ----------

const KNOWN_FLAGS = ['--dry-run', '--prune', '--allow-missing-images']
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const [file, imagesDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dryRun = flags.has('--dry-run')
const prune = flags.has('--prune')
const allowMissingImages = flags.has('--allow-missing-images')

for (const f of flags) if (!KNOWN_FLAGS.includes(f)) fail(`Unknown flag ${f}. Known: ${KNOWN_FLAGS.join(', ')}`)
if (!file || !imagesDir) fail('Usage: npm run import:games -- <file.xlsx> <imagesDir> [--dry-run] [--prune] [--allow-missing-images]')
if (!fs.existsSync(file)) fail(`Spreadsheet not found: ${file}`)
if (!fs.existsSync(imagesDir) || !fs.statSync(imagesDir).isDirectory()) fail(`Images folder not found: ${imagesDir}`)

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (!dryRun && !token) fail('SANITY_WRITE_TOKEN is not set. Add it to .env.local, or pass --dry-run to only validate.')

const client: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  token,
  useCdn: false,
  // Test hook: point at a local stand-in instead of api.sanity.io.
  ...(process.env.SANITY_API_HOST ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false } : {}),
})

// ---------- spreadsheet ----------

const SHARED_COLUMNS = {
  name: 'Name',
  subtitle: 'Subtitle',
  url: 'Game URL',
  imageFile: 'Image file',
  iconFile: 'Icon file',
  imageAlt: 'Image description',
  ageFrom: 'Age from',
  ageTo: 'Age to',
  minutes: 'Minutes',
  players: 'Players',
  cost: 'Cost',
  offline: 'Works offline',
  noReading: 'No reading needed',
  platforms: 'Platforms',
  skills: 'Skills it builds',
  feelsLike: 'Feels like',
  partner: 'Partner',
  notes: 'Notes',
} as const

/** The per-audience columns. `${prefix} ${label}` on the sheet, e.g. "Teacher subtitle", "Parent badges". */
const OVERRIDE_COLUMNS = {
  url: 'URL',
  subtitle: 'subtitle',
  imageFile: 'image file',
  iconFile: 'icon file',
  minutes: 'minutes',
  skills: 'skills',
  feelsLike: 'feels like',
  badges: 'badges',
  featured: 'featured',
} as const
type OverrideCol = keyof typeof OVERRIDE_COLUMNS

const AUDIENCE_COLUMNS = {
  tShow: 'On Teachers page',
  tGrades: 'Teacher grades',
  tMoments: 'Teacher moments',
  pShow: 'On Parents page',
  when: 'When (parents)',
} as const

const audienceCol = (audience: Audience, c: OverrideCol) => `${audience === 'teachers' ? 'Teacher' : 'Parent'} ${OVERRIDE_COLUMNS[c]}`

const COLUMNS: Record<string, string> = {
  ...SHARED_COLUMNS,
  ...AUDIENCE_COLUMNS,
  ...Object.fromEntries((Object.keys(OVERRIDE_COLUMNS) as OverrideCol[]).map((c) => [`t_${c}`, audienceCol('teachers', c)])),
  ...Object.fromEntries((Object.keys(OVERRIDE_COLUMNS) as OverrideCol[]).map((c) => [`p_${c}`, audienceCol('parents', c)])),
}
type Col = keyof typeof SHARED_COLUMNS | keyof typeof AUDIENCE_COLUMNS | `t_${OverrideCol}` | `p_${OverrideCol}`
type Audience = 'teachers' | 'parents'

const LISTS = {
  skills: 'Skills',
  grades: 'Teacher grades',
  moments: 'Teacher moments',
  when: 'When (parents)',
  players: 'Players',
  platforms: 'Platforms',
  badges: 'Badges',
} as const

const wb = XLSX.readFile(file)
const gamesSheet = wb.Sheets['Games']
if (!gamesSheet) fail(`The spreadsheet has no "Games" sheet (sheets: ${wb.SheetNames.join(', ')})`)
const rows = XLSX.utils.sheet_to_json<unknown[]>(gamesSheet, { header: 1, defval: null, blankrows: false, raw: true })
const headerRow = (rows[0] || []).map((h) => cellText(h))

const norm = (s: string) => s.replace(/\*\s*$/, '').trim().toLowerCase()
const colIndex = new Map<Col, number>()
const requiredCols = new Set<Col>()
for (const [key, label] of Object.entries(COLUMNS) as [Col, string][]) {
  const i = headerRow.findIndex((h) => norm(h) === label.toLowerCase())
  if (i === -1) continue
  colIndex.set(key, i)
  if (/\*\s*$/.test(headerRow[i])) requiredCols.add(key)
}
const missingCols = (Object.keys(COLUMNS) as Col[]).filter((k) => !colIndex.has(k)).map((k) => COLUMNS[k])
if (missingCols.length) fail(`The "Games" sheet is missing these columns: ${missingCols.join(', ')}`)

// Allowed values from the Lists sheet, keyed by lower case. Long cells (the footnote) are ignored.
const lists = Object.fromEntries(Object.keys(LISTS).map((k) => [k, new Map<string, string>()])) as Record<keyof typeof LISTS, Map<string, string>>
const listsSheet = wb.Sheets['Lists']
if (listsSheet) {
  const lr = XLSX.utils.sheet_to_json<unknown[]>(listsSheet, { header: 1, defval: null, blankrows: false })
  const lh = (lr[0] || []).map((h) => norm(cellText(h)))
  for (const [key, label] of Object.entries(LISTS) as [keyof typeof LISTS, string][]) {
    const i = lh.indexOf(label.toLowerCase())
    if (i === -1) continue
    for (const r of lr.slice(1)) {
      const v = cellText(r[i])
      if (v && v.length <= 60) lists[key].set(v.toLowerCase(), v)
    }
  }
}
// Fixed lists from the schema win over the sheet.
for (const p of PLAYERS) lists.players.set(p.toLowerCase(), p)
for (const p of PLATFORMS) lists.platforms.set(p.toLowerCase(), p)
for (const g of GRADES) lists.grades.set(g.toLowerCase(), g)
for (const b of BADGE_KINDS) lists.badges.set(b.toLowerCase(), b)

// ---------- existing documents (for case-insensitive matching, carrying over "hidden", and moment lists) ----------

type Titled = { _id: string; title: string; order?: number }
type ExistingMoment = Titled & { games?: string[] | null }
const existing = await client.fetch<{ skills: Titled[]; when: Titled[]; moments: ExistingMoment[]; games: { _id: string; hidden?: boolean }[] }>(
  `{
    "skills": *[_type == "skill"]{ _id, title, order },
    "when": *[_type == "whenOption"]{ _id, title, order },
    "moments": *[_type == "moment"]{ _id, title, order, "games": games[]._ref },
    "games": *[_type == "game"]{ _id, hidden }
  }`,
)

// Referenced documents, existing or to be created. Keyed by lower-case title.
type RefKind = 'skill' | 'whenOption' | 'moment'
const refDocs: Record<RefKind, Map<string, Titled & { create?: boolean }>> = { skill: new Map(), whenOption: new Map(), moment: new Map() }
for (const d of existing.skills) refDocs.skill.set(d.title.toLowerCase(), d)
for (const d of existing.when) refDocs.whenOption.set(d.title.toLowerCase(), d)
for (const d of existing.moments) refDocs.moment.set(d.title.toLowerCase(), d)
const nextOrder: Record<RefKind, number> = {
  skill: maxOrder(existing.skills) + 1,
  whenOption: maxOrder(existing.when) + 1,
  moment: maxOrder(existing.moments) + 1,
}
const idPrefix: Record<RefKind, string> = { skill: 'skill', whenOption: 'when', moment: 'moment' }

function resolveRef(kind: RefKind, listKey: 'skills' | 'when' | 'moments', typed: string): Titled {
  const canonical = lists[listKey].get(typed.toLowerCase()) || typed
  const key = canonical.toLowerCase()
  let doc = refDocs[kind].get(key)
  if (!doc) {
    doc = { _id: `${idPrefix[kind]}-${slug(canonical)}`, title: canonical, order: nextOrder[kind]++, create: true }
    refDocs[kind].set(key, doc)
  }
  return doc
}

// ---------- validation ----------

type RowError = { Row: number; Column: string; Problem: string }
type Img = { buffer: Buffer; filename: string; placeholder?: boolean }
type ParsedOverrides = {
  url?: string
  subtitle?: string
  image?: Img
  icon?: Img
  minutes?: number
  skills?: Titled[]
  feelsLike?: string
  badges?: string[]
  featured: boolean
}
type ParsedGame = {
  row: number
  _id: string
  name: string
  subtitle: string
  url: string
  image: Img
  imageAlt: string
  icon?: Img
  ageFrom: number
  ageTo: number
  minutes: number
  players: string[]
  cost: string
  offline: boolean
  noReading: boolean
  platforms: string[]
  skills: Titled[]
  feelsLike: string
  partner?: string
  notes?: string
  teachers: { show: boolean; grades: string[]; moments: Titled[] } & ParsedOverrides
  parents: { show: boolean; when: Titled[] } & ParsedOverrides
}

const errors: RowError[] = []
const parsed: ParsedGame[] = []
const imageCache = new Map<string, Img>()
let skipped = 0
let placeholders = 0
const seenIds = new Map<string, number>()

for (let i = 1; i < rows.length; i++) {
  const row = i + 1 // Excel row number
  const r = rows[i] || []
  const get = (c: Col) => cellText(r[colIndex.get(c)!])
  if (!headerRow.some((_, j) => cellText(r[j]))) continue
  if (/example row/i.test(get('notes'))) {
    skipped++
    continue
  }
  const err = (c: Col, msg: string) => errors.push({ Row: row, Column: COLUMNS[c], Problem: msg })

  for (const c of requiredCols) if (!get(c)) err(c, 'Required')

  const name = get('name')
  const _id = `game-${slug(name)}`
  if (name) {
    if (seenIds.has(_id)) err('name', `Duplicate of row ${seenIds.get(_id)} (same name)`)
    else seenIds.set(_id, row)
  }

  const url = get('url')
  if (url && !isUrl(url)) err('url', 'Must be a full link starting with https://')

  const ageFrom = int(get('ageFrom'))
  const ageTo = int(get('ageTo'))
  if (get('ageFrom') && (ageFrom === null || ageFrom < 3 || ageFrom > 14)) err('ageFrom', 'Whole number 3 to 14')
  if (get('ageTo') && (ageTo === null || ageTo < 3 || ageTo > 14)) err('ageTo', 'Whole number 3 to 14')
  if (ageFrom !== null && ageTo !== null && ageTo < ageFrom) err('ageTo', 'Must be at least "Age from"')

  const minutes = int(get('minutes'))
  if (get('minutes') && !isMinutes(minutes)) err('minutes', 'Whole number 1 to 120')

  const players = listValues(get('players'), lists.players, (bad) => err('players', `Unknown value "${bad}". Allowed: ${PLAYERS.join(', ')}`))
  const platforms = listValues(get('platforms'), lists.platforms, (bad) => err('platforms', `Unknown value "${bad}". Allowed: ${PLATFORMS.join(', ')}`))

  const cost = oneOf(get('cost'), COSTS)
  if (get('cost') && !cost) err('cost', `Allowed: ${COSTS.join(', ')}`)
  const feelsLike = oneOf(get('feelsLike'), FEELS)
  if (get('feelsLike') && !feelsLike) err('feelsLike', `Allowed: ${FEELS.join(', ')}`)

  const offline = yesNo(get('offline'))
  if (get('offline') && offline === null) err('offline', 'Yes or No')
  const noReading = yesNo(get('noReading'))
  if (get('noReading') && noReading === null) err('noReading', 'Yes or No')

  const skillNames = splitList(get('skills'))
  if (get('skills') && (skillNames.length < 1 || skillNames.length > 3)) err('skills', '1 to 3 skills, separated by commas')

  const image = get('imageFile') ? await loadImage(get('imageFile'), 'image', (m) => err('imageFile', m)) : undefined
  const icon = get('iconFile') ? await loadImage(get('iconFile'), 'icon', (m) => err('iconFile', m)) : undefined

  // Audience switches. The other columns of an audience only matter when it is switched on.
  const tShow = yesNo(get('tShow'))
  if (get('tShow') && tShow === null) err('tShow', 'Yes or No')
  const pShow = yesNo(get('pShow'))
  if (get('pShow') && pShow === null) err('pShow', 'Yes or No')

  const grades = tShow ? listValues(get('tGrades'), lists.grades, (bad) => err('tGrades', `Unknown value "${bad}". Allowed: ${GRADES.join(', ')}`)) : []
  if (tShow && !get('tGrades')) err('tGrades', 'Required when "On Teachers page" is Yes')
  const momentNames = tShow ? splitList(get('tMoments')) : []
  const whenNames = pShow ? splitList(get('when')) : []
  if (pShow && !whenNames.length) err('when', 'Required when "On Parents page" is Yes')

  // "Only if different" columns. Blank = use the Shared value.
  const overrides = async (audience: Audience, on: boolean | null): Promise<ParsedOverrides> => {
    const p = audience === 'teachers' ? 't_' : 'p_'
    const col = (c: OverrideCol) => `${p}${c}` as Col
    const v = (c: OverrideCol) => (on ? get(col(c)) : '')
    const out: ParsedOverrides = { featured: false }
    if (v('url')) {
      if (isUrl(v('url'))) out.url = v('url')
      else err(col('url'), 'Must be a full link starting with https://')
    }
    if (v('subtitle')) out.subtitle = v('subtitle')
    if (v('imageFile')) out.image = await loadImage(v('imageFile'), 'image', (m) => err(col('imageFile'), m))
    if (v('iconFile')) out.icon = await loadImage(v('iconFile'), 'icon', (m) => err(col('iconFile'), m))
    if (v('minutes')) {
      const m = int(v('minutes'))
      if (isMinutes(m)) out.minutes = m!
      else err(col('minutes'), 'Whole number 1 to 120')
    }
    if (v('skills')) {
      const names = splitList(v('skills'))
      if (names.length < 1 || names.length > 3) err(col('skills'), '1 to 3 skills, separated by commas')
      else out.skills = names.map((s) => resolveRef('skill', 'skills', s))
    }
    if (v('feelsLike')) {
      const f = oneOf(v('feelsLike'), FEELS)
      if (f) out.feelsLike = f
      else err(col('feelsLike'), `Allowed: ${FEELS.join(', ')}`)
    }
    if (v('badges')) {
      const b = listValues(v('badges'), lists.badges, (bad) => err(col('badges'), `Unknown value "${bad}". Allowed: ${BADGE_KINDS.join(', ')}`))
      if (b.length) out.badges = b
    }
    if (v('featured')) {
      const f = yesNo(v('featured'))
      if (f === null) err(col('featured'), 'Yes or No')
      else out.featured = f
    }
    return out
  }
  const tOver = await overrides('teachers', tShow)
  const pOver = await overrides('parents', pShow)

  if (errors.some((e) => e.Row === row)) continue
  parsed.push({
    row,
    _id,
    name,
    subtitle: get('subtitle'),
    url,
    image: image!,
    imageAlt: get('imageAlt'),
    icon,
    ageFrom: ageFrom!,
    ageTo: ageTo!,
    minutes: minutes!,
    players,
    cost: cost!,
    offline: offline!,
    noReading: noReading!,
    platforms,
    skills: skillNames.map((s) => resolveRef('skill', 'skills', s)),
    feelsLike: feelsLike!,
    partner: get('partner') || undefined,
    notes: get('notes') || undefined,
    teachers: { show: !!tShow, grades, moments: momentNames.map((s) => resolveRef('moment', 'moments', s)), ...tOver },
    parents: { show: !!pShow, when: whenNames.map((s) => resolveRef('whenOption', 'when', s)), ...pOver },
  })
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was written.\n`)
  console.table(errors)
  process.exit(1)
}

// ---------- plan ----------

const toCreate = (['skill', 'whenOption', 'moment'] as RefKind[]).flatMap((kind) => [...refDocs[kind].values()].filter((d) => d.create).map((d) => ({ kind, ...d })))
const existingIds = new Set(existing.games.map((g) => g._id))
const toPrune = prune ? existing.games.filter((g) => !seenIds.has(g._id)).map((g) => g._id) : []

// Games to append to each moment's list, in sheet row order, skipping games already in the list.
const momentGames = new Map<string, Set<string>>(existing.moments.map((m) => [m._id, new Set(m.games || [])]))
const momentAdds = new Map<string, string[]>()
for (const g of parsed) {
  if (!g.teachers.show) continue
  for (const m of g.teachers.moments) {
    const have = momentGames.get(m._id) || new Set<string>()
    momentGames.set(m._id, have)
    if (have.has(g._id)) continue
    have.add(g._id)
    momentAdds.set(m._id, [...(momentAdds.get(m._id) || []), g._id])
  }
}

const overrideCount = (o: ParsedOverrides) =>
  (['url', 'subtitle', 'image', 'icon', 'minutes', 'skills', 'feelsLike', 'badges'] as (keyof ParsedOverrides)[]).filter((k) => o[k] !== undefined).length
const describe = (on: boolean, detail: string, o: ParsedOverrides) =>
  on ? [detail, overrideCount(o) ? `${overrideCount(o)} override${overrideCount(o) === 1 ? '' : 's'}` : '', o.featured ? 'featured' : ''].filter(Boolean).join(' · ') : 'off'

console.log(`\n${parsed.length} game${parsed.length === 1 ? '' : 's'} valid, ${skipped} example row${skipped === 1 ? '' : 's'} skipped.`)
if (placeholders) console.log(`${placeholders} missing image${placeholders === 1 ? '' : 's'} replaced by a grey placeholder (--allow-missing-images).`)
console.table(
  parsed.map((g) => ({
    Row: g.row,
    Game: g.name,
    Action: existingIds.has(g._id) ? 'update' : 'create',
    Images: [g.image, g.icon, g.teachers.image, g.teachers.icon, g.parents.image, g.parents.icon].filter(Boolean).length,
    Teachers: describe(g.teachers.show, `${g.teachers.grades.join(', ')} · ${g.teachers.moments.length} moment${g.teachers.moments.length === 1 ? '' : 's'}`, g.teachers),
    Parents: describe(g.parents.show, `${g.parents.when.length} when`, g.parents),
  })),
)
if (toCreate.length) console.log('New list entries to create:', toCreate.map((d) => `${d.kind} "${d.title}"`).join(', '))
for (const [id, adds] of momentAdds) {
  const m = [...refDocs.moment.values()].find((d) => d._id === id)!
  console.log(`Moment "${m.title}": add ${adds.length} game${adds.length === 1 ? '' : 's'} at the end (${momentGames.get(id)!.size} after)`)
}
if (parsed.some((g) => g.teachers.show) && !momentAdds.size) console.log('Moments: nothing to add; every listed game is already in its moments.')
if (prune) console.log(toPrune.length ? `Games to delete (--prune): ${toPrune.join(', ')}` : 'Nothing to prune.')

if (dryRun) {
  console.log('\nDry run: nothing written.')
  process.exit(0)
}

// ---------- write ----------

const assetIds = new Map<string, string>()
async function uploadImage(img: Img) {
  const key = `${img.filename}:${img.buffer.length}`
  if (!assetIds.has(key)) {
    const asset = await client.assets.upload('image', img.buffer, { filename: img.filename })
    assetIds.set(key, asset._id)
  }
  return assetIds.get(key)!
}

const imageField = (assetId: string, alt?: string) => ({ _type: 'image', asset: { _type: 'reference', _ref: assetId }, ...(alt ? { alt } : {}) })
const ref = (id: string) => ({ _type: 'reference', _ref: id, _key: id })
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>

/** The audience object as stored. An override image reuses the shared image description as its alt text. */
async function audienceDoc(g: ParsedGame, o: ParsedOverrides) {
  return defined({
    url: o.url,
    subtitle: o.subtitle,
    image: o.image ? imageField(await uploadImage(o.image), g.imageAlt) : undefined,
    icon: o.icon ? imageField(await uploadImage(o.icon), g.name) : undefined,
    minutes: o.minutes,
    skills: o.skills?.map((s) => ref(s._id)),
    feelsLike: o.feelsLike,
    badges: o.badges,
    featured: o.featured,
  })
}

const tx = client.transaction()
for (const d of toCreate) tx.createIfNotExists({ _id: d._id, _type: d.kind, title: d.title, order: d.order })
for (const g of parsed) {
  const imageId = await uploadImage(g.image)
  const iconId = g.icon ? await uploadImage(g.icon) : undefined
  const prev = existing.games.find((x) => x._id === g._id)
  tx.createOrReplace({
    _id: g._id,
    _type: 'game',
    name: g.name,
    subtitle: g.subtitle,
    url: g.url,
    image: imageField(imageId, g.imageAlt),
    ...(iconId ? { icon: imageField(iconId, g.name) } : {}),
    ageFrom: g.ageFrom,
    ageTo: g.ageTo,
    minutes: g.minutes,
    players: g.players,
    cost: g.cost,
    offline: g.offline,
    noReading: g.noReading,
    platforms: g.platforms,
    skills: g.skills.map((s) => ref(s._id)),
    feelsLike: g.feelsLike,
    ...(g.partner ? { partner: g.partner } : {}),
    ...(g.notes ? { notes: g.notes } : {}),
    hidden: prev?.hidden === true, // keep a "hidden" set in Studio
    teachers: g.teachers.show ? { show: true, grades: g.teachers.grades, ...(await audienceDoc(g, g.teachers)) } : { show: false },
    parents: g.parents.show ? { show: true, when: g.parents.when.map((w) => ref(w._id)), ...(await audienceDoc(g, g.parents)) } : { show: false },
  })
}
// Append new games to the end of each moment's list. Existing entries are untouched.
for (const [id, adds] of momentAdds) {
  tx.patch(id, (p) =>
    p.setIfMissing({ games: [] }).insert(
      'after',
      'games[-1]',
      adds.map((gid) => ref(gid)),
    ),
  )
}
// A pruned game is taken out of every moment list first, so the references do not block the delete.
for (const id of toPrune) {
  for (const m of existing.moments) if (m.games?.includes(id)) tx.patch(m._id, (p) => p.unset([`games[_ref == "${id}"]`]))
  tx.delete(id)
}

const result = await tx.commit()
const added = [...momentAdds.values()].reduce((n, a) => n + a.length, 0)
console.log(
  `\nDone. Transaction ${result.transactionId}: ${parsed.length} games written, ${toCreate.length} list entries created, ${added} moment entries added, ${toPrune.length} deleted.`,
)

// ---------- helpers ----------

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}
function int(s: string): number | null {
  if (!s) return null
  const n = Number(s)
  return Number.isInteger(n) ? n : null
}
function isMinutes(n: number | null): boolean {
  return n !== null && n >= 1 && n <= 120
}
function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s)
}
function yesNo(s: string): boolean | null {
  const v = s.trim().toLowerCase()
  if (['yes', 'y', 'true', '1'].includes(v)) return true
  if (['no', 'n', 'false', '0'].includes(v)) return false
  return null
}
function oneOf(s: string, allowed: readonly string[]): string | null {
  return allowed.find((a) => a.toLowerCase() === s.trim().toLowerCase()) || null
}
function splitList(s: string): string[] {
  return s.split(',').map((v) => v.trim()).filter(Boolean)
}
function listValues(s: string, allowed: Map<string, string>, onBad: (bad: string) => void): string[] {
  const out: string[] = []
  for (const v of splitList(s)) {
    const canonical = allowed.get(v.toLowerCase())
    if (canonical) {
      if (!out.includes(canonical)) out.push(canonical)
    } else onBad(v)
  }
  return out
}
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function maxOrder(docs: Titled[]): number {
  return docs.reduce((m, d) => Math.max(m, d.order ?? 0), 0)
}

/** A file name from the images folder, or a link. `kind` picks the placeholder size under --allow-missing-images. */
async function loadImage(cell: string, kind: 'image' | 'icon', onError: (msg: string) => void): Promise<Img | undefined> {
  if (imageCache.has(cell)) return imageCache.get(cell)
  let img: Img | undefined
  let missing: string | undefined
  if (/^https?:\/\//i.test(cell)) {
    try {
      const res = await fetch(cell)
      if (!res.ok) missing = `Could not download (${res.status})`
      else img = { buffer: Buffer.from(await res.arrayBuffer()), filename: path.basename(new URL(cell).pathname) || 'image' }
    } catch (e) {
      missing = `Could not download: ${(e as Error).message}`
    }
  } else {
    const p = path.join(imagesDir, cell)
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) missing = `File "${cell}" not found in ${imagesDir}`
    else if (fs.statSync(p).size === 0) onError(`File "${cell}" is empty`)
    else img = { buffer: fs.readFileSync(p), filename: cell }
  }
  if (missing) {
    if (allowMissingImages) {
      placeholders++
      img = placeholder(kind)
    } else onError(missing)
  }
  if (img) imageCache.set(cell, img)
  return img
}

/** A grey PNG, 800 x 500 for card images and 256 x 256 for icons. Test use only (--allow-missing-images). */
function placeholder(kind: 'image' | 'icon'): Img {
  const [w, h] = kind === 'image' ? [800, 500] : [256, 256]
  const key = `placeholder-${kind}`
  if (!imageCache.has(key)) imageCache.set(key, { buffer: greyPng(w, h), filename: `${key}.png`, placeholder: true })
  return imageCache.get(key)!
}

function greyPng(w: number, h: number, grey = 0xcc): Buffer {
  const stride = w * 3 + 1 // one filter byte, then RGB per pixel
  const raw = Buffer.alloc(stride * h, grey)
  for (let y = 0; y < h; y++) raw[y * stride] = 0
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
