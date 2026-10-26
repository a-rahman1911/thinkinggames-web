// Import games from the Games spreadsheet into Sanity.
//
//   npm run import:games -- <file.xlsx> <imagesDir> [--sheet=<name>] [--dry-run] [--prune] [--allow-missing-images]
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
// --sheet picks the tab (default "Games"). A tab whose headers are the final games list ("Game", "URL",
// "Primary skills", "Best teacher moment", "Parent moment", "Feels like", "Teacher Group", "Parent Group",
// "Subtitle", "Minutes", "Players", "No Reading Needed?", "Banners", optional "Image description") is read
// with LIST_COLUMNS instead and only UPDATES existing games:
//   - each row must match an existing game by name (case-insensitive); nothing is created or pruned
//   - skills, moments and "When" values must already exist (MOMENT_ALIASES maps the short moment names)
//   - "Parent Group" 5-6 means Age from 5, Age to 6 (Excel may have turned it into a date; its text is used)
//   - the listed fields are patched in; everything else on the game (cost, offline, platforms, partner,
//     notes, icon, on-page switches, overrides, featured, hidden) keeps its current value
//   - an image that cannot be found or downloaded is listed and the game keeps its current image
//
// Card images (not icons) are looked up in this order: a file in <imagesDir> whose name, or name without
// extension, is the cell value or its Google Drive file ID; then a download (Drive links through
// drive.usercontent.google.com, saved to <imagesDir>/<id>.<ext> so each Drive file is fetched once).
// Each is then centre-cropped to 16:10, resized to 1600×1000 and saved as a JPG (quality 85, under 1 MB)
// on white. A source far from 16:10 (a wide logo, say) is fitted on white instead, since a crop would cut it.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createClient, type SanityClient } from '@sanity/client'
import sharp from 'sharp'
import XLSX from 'xlsx'
import { BADGE_KINDS, COSTS, FEELS, GRADES, MINUTES, PLATFORMS, PLAYERS } from '../lib/derive.ts'

// ---------- arguments and environment ----------

const KNOWN_FLAGS = ['--dry-run', '--prune', '--allow-missing-images', '--sheet=']
const USAGE = 'Usage: npm run import:games -- <file.xlsx> <imagesDir> [--sheet=<name>] [--dry-run] [--prune] [--allow-missing-images]'
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const [file, imagesDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dryRun = flags.has('--dry-run')
const prune = flags.has('--prune')
const allowMissingImages = flags.has('--allow-missing-images')
const sheetName = [...flags].find((f) => f.startsWith('--sheet='))?.slice('--sheet='.length) || 'Games'

for (const f of flags) if (!KNOWN_FLAGS.some((k) => (k.endsWith('=') ? f.startsWith(k) : f === k))) fail(`Unknown flag ${f}. ${USAGE}`)
if (!file || !imagesDir) fail(USAGE)
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

/** The final games list. Headers are compared without "(...)", a trailing "?" or "*", and case. */
const LIST_COLUMNS = {
  name: 'Game',
  url: 'URL',
  skills: 'Primary skills',
  tMoments: 'Best teacher moment',
  when: 'Parent moment',
  feelsLike: 'Feels like',
  tGrades: 'Teacher Group',
  ageGroup: 'Parent Group',
  subtitle: 'Subtitle',
  minutes: 'Minutes',
  players: 'Players',
  noReading: 'No Reading Needed',
  imageFile: 'Banners',
  imageAlt: 'Image description',
} as const
type ListCol = keyof typeof LIST_COLUMNS
const LIST_OPTIONAL: ListCol[] = ['imageAlt']
/** Moment names as the final list writes them → the moment titles. Lower case keys. */
const MOMENT_ALIASES: Record<string, string> = { 'last 10 minutes': 'The last 10 minutes', 'friday reward': 'Friday reward time' }
/** "Feels like" as the final list writes it → the stored value. Lower case keys. */
const FEEL_ALIASES: Record<string, string> = { game: 'A game' }

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
const gamesSheet = wb.Sheets[sheetName]
if (!gamesSheet) fail(`The spreadsheet has no "${sheetName}" sheet (sheets: ${wb.SheetNames.join(', ')})`)
const norm = (s: string) => s.replace(/\*\s*$/, '').trim().toLowerCase()
const listNorm = (s: string) => s.replace(/\(.*?\)/g, '').replace(/[?*]\s*$/, '').trim().toLowerCase()
const headerRow = (XLSX.utils.sheet_to_json<unknown[]>(gamesSheet, { header: 1, defval: null, blankrows: false })[0] || []).map((h) => cellText(h))
const listLayout = ['game', 'banners'].every((h) => headerRow.some((x) => listNorm(x) === h))
if (listLayout && prune) fail(`--prune does not apply to the "${sheetName}" sheet: it only updates existing games.`)
// The final list is read as displayed text, so a "5-6" that Excel turned into a date still reads "5-6".
const rows = XLSX.utils.sheet_to_json<unknown[]>(gamesSheet, { header: 1, defval: null, blankrows: false, raw: !listLayout })

const colIndex = new Map<Col, number>()
const listIndex = new Map<ListCol, number>()
const requiredCols = new Set<Col>()
if (listLayout) {
  for (const [key, label] of Object.entries(LIST_COLUMNS) as [ListCol, string][]) {
    const i = headerRow.findIndex((h) => listNorm(h) === label.toLowerCase())
    if (i !== -1) listIndex.set(key, i)
  }
  const missingCols = (Object.keys(LIST_COLUMNS) as ListCol[]).filter((k) => !listIndex.has(k) && !LIST_OPTIONAL.includes(k))
  if (missingCols.length) fail(`The "${sheetName}" sheet is missing these columns: ${missingCols.map((k) => LIST_COLUMNS[k]).join(', ')}`)
} else {
  for (const [key, label] of Object.entries(COLUMNS) as [Col, string][]) {
    const i = headerRow.findIndex((h) => norm(h) === label.toLowerCase())
    if (i === -1) continue
    colIndex.set(key, i)
    if (/\*\s*$/.test(headerRow[i])) requiredCols.add(key)
  }
  const missingCols = (Object.keys(COLUMNS) as Col[]).filter((k) => !colIndex.has(k)).map((k) => COLUMNS[k])
  if (missingCols.length) fail(`The "${sheetName}" sheet is missing these columns: ${missingCols.join(', ')}`)
}
/** The header a problem is reported under: the final list's own header in that layout. */
const label = (c: Col): string => {
  if (!listLayout) return COLUMNS[c]
  if (c === 'ageFrom' || c === 'ageTo') return LIST_COLUMNS.ageGroup
  return (LIST_COLUMNS as Record<string, string>)[c] || COLUMNS[c]
}

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
const existing = await client.fetch<{ skills: Titled[]; when: Titled[]; moments: ExistingMoment[]; games: { _id: string; name: string; hidden?: boolean }[] }>(
  `{
    "skills": *[_type == "skill"]{ _id, title, order },
    "when": *[_type == "whenOption"]{ _id, title, order },
    "moments": *[_type == "moment"]{ _id, title, order, "games": games[]._ref },
    "games": *[_type == "game"]{ _id, name, hidden }
  }`,
)
const gameByName = new Map(existing.games.filter((g) => !g._id.startsWith('drafts.')).map((g) => [g.name.trim().toLowerCase(), g]))

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
  minutes?: string
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
  /** Unset only in the final-list layout, when the image could not be found: the game keeps its current one. */
  image?: Img
  imageAlt: string
  icon?: Img
  ageFrom: number
  ageTo: number
  minutes: string
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
type Source = { buffer: Buffer; filename: string }
/** Each source looked up once, keyed by Drive file ID or cell. A string is the reason it could not be found. */
const sourceCache = new Map<string, Source | string>()
const BANNER = { width: 1600, height: 1000, quality: 85, minQuality: 60, maxBytes: 1024 * 1024 }
/** Banners that were fitted instead of cropped, or saved below quality 85, for the report. Keyed by source file. */
const bannerNotes = new Map<string, string>()

const longSubtitles: { Row: number; Game: string; Length: number; Subtitle: string }[] = []
const missingImages: { Row: number; Game: string; Image: string; Problem: string }[] = []
let skipped = 0
let placeholders = 0
const seenIds = new Map<string, number>()

/** One final-list row in the template's terms, so both layouts share the checks below. */
function fromList(r: unknown[]): Partial<Record<Col, string>> {
  const v = (k: ListCol) => (listIndex.has(k) ? cellText(r[listIndex.get(k)!]) : '')
  const range = v('ageGroup').match(/^(\d+)\s*[-–]\s*(\d+)$/)
  const name = v('name')
  return {
    name,
    url: v('url'),
    skills: v('skills'),
    tMoments: splitList(v('tMoments'))
      .map((m) => MOMENT_ALIASES[m.toLowerCase()] || m)
      .join(', '),
    when: v('when'),
    feelsLike: FEEL_ALIASES[v('feelsLike').toLowerCase()] || v('feelsLike'),
    tGrades: v('tGrades'),
    ageFrom: range?.[1] ?? '',
    ageTo: range?.[2] ?? '',
    subtitle: v('subtitle'),
    minutes: v('minutes'),
    players: v('players'),
    noReading: v('noReading'),
    imageFile: v('imageFile'),
    imageAlt: v('imageAlt') || (name ? `${name} screenshot` : ''),
    tShow: 'Yes',
    pShow: 'Yes',
  }
}

for (let i = 1; i < rows.length; i++) {
  const row = i + 1 // Excel row number
  const r = rows[i] || []
  if (!headerRow.some((_, j) => cellText(r[j]))) continue
  const listed = listLayout ? fromList(r) : null
  const get = (c: Col) => (listed ? listed[c] || '' : cellText(r[colIndex.get(c)!]))
  if (!listLayout && /example row/i.test(get('notes'))) {
    skipped++
    continue
  }
  const err = (c: Col, msg: string) => errors.push({ Row: row, Column: label(c), Problem: msg })

  if (listLayout) {
    for (const k of Object.keys(LIST_COLUMNS) as ListCol[])
      if (!LIST_OPTIONAL.includes(k) && !cellText(r[listIndex.get(k)!])) errors.push({ Row: row, Column: LIST_COLUMNS[k], Problem: 'Required' })
    const group = cellText(r[listIndex.get('ageGroup')!])
    if (group && !get('ageFrom')) err('ageFrom', `"${group}" is not an age range. Write it as 5-6 (age from, age to)`)
  } else for (const c of requiredCols) if (!get(c)) err(c, 'Required')

  const name = get('name')
  // The final list only updates games that exist, matched by name; its rows keep their game's id.
  const match = listLayout ? gameByName.get(name.toLowerCase()) : undefined
  if (listLayout && name && !match) err('name', `No existing game is called "${name}". This sheet only updates existing games.`)
  const _id = match?._id || `game-${slug(name)}`
  if (name) {
    if (seenIds.has(_id)) err('name', `Duplicate of row ${seenIds.get(_id)} (same name)`)
    else seenIds.set(_id, row)
  }

  /** Skills, moments and When values. The final list may only use ones that exist; the template creates new ones. */
  const refs = (kind: RefKind, listKey: 'skills' | 'when' | 'moments', names: string[], c: Col): Titled[] =>
    names.flatMap((typed) => {
      if (!listLayout) return [resolveRef(kind, listKey, typed)]
      const doc = refDocs[kind].get(typed.toLowerCase())
      if (!doc) err(c, `Unknown value "${typed}". Allowed: ${[...refDocs[kind].values()].map((d) => d.title).join(', ')}`)
      return doc ? [doc] : []
    })

  const url = get('url')
  if (url && !isUrl(url)) err('url', 'Must be a full link starting with https://')

  const subtitle = get('subtitle')
  if (subtitle.length > 50) longSubtitles.push({ Row: row, Game: name, Length: subtitle.length, Subtitle: subtitle })

  const ageFrom = int(get('ageFrom'))
  const ageTo = int(get('ageTo'))
  if (get('ageFrom') && (ageFrom === null || ageFrom < 3 || ageFrom > 14)) err('ageFrom', 'Whole number 3 to 14')
  if (get('ageTo') && (ageTo === null || ageTo < 3 || ageTo > 14)) err('ageTo', 'Whole number 3 to 14')
  if (ageFrom !== null && ageTo !== null && ageTo < ageFrom) err('ageTo', 'Must be at least "Age from"')

  const minutes = oneOf(get('minutes'), MINUTES)
  if (get('minutes') && !minutes) err('minutes', `"${get('minutes')}" is not allowed. Allowed: ${MINUTES.join(', ')}`)

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
  const skillCountOk = skillNames.length >= 1 && skillNames.length <= 3
  if (get('skills') && !skillCountOk) err('skills', `1 to 3 skills, separated by commas (this row has ${skillNames.length})`)
  const skills = skillCountOk ? refs('skill', 'skills', skillNames, 'skills') : []

  // In the final list a missing image is listed and the game keeps its current image.
  const onImageMissing = (m: string) => (listLayout ? missingImages.push({ Row: row, Game: name, Image: get('imageFile'), Problem: m }) : err('imageFile', m))
  const image = get('imageFile') ? await loadImage(get('imageFile'), 'image', onImageMissing) : undefined
  const icon = get('iconFile') ? await loadImage(get('iconFile'), 'icon', (m) => err('iconFile', m)) : undefined

  // Audience switches. The other columns of an audience only matter when it is switched on.
  const tShow = yesNo(get('tShow'))
  if (get('tShow') && tShow === null) err('tShow', 'Yes or No')
  const pShow = yesNo(get('pShow'))
  if (get('pShow') && pShow === null) err('pShow', 'Yes or No')

  const grades = tShow ? listValues(get('tGrades'), lists.grades, (bad) => err('tGrades', `Unknown value "${bad}". Allowed: ${GRADES.join(', ')}`)) : []
  if (tShow && !get('tGrades')) err('tGrades', 'Required when "On Teachers page" is Yes')
  const moments = tShow ? refs('moment', 'moments', splitList(get('tMoments')), 'tMoments') : []
  const whenNames = pShow ? splitList(get('when')) : []
  if (pShow && !whenNames.length) err('when', 'Required when "On Parents page" is Yes')
  const when = refs('whenOption', 'when', whenNames, 'when')

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
      const m = oneOf(v('minutes'), MINUTES)
      if (m) out.minutes = m
      else err(col('minutes'), `"${v('minutes')}" is not allowed. Allowed: ${MINUTES.join(', ')}`)
    }
    if (v('skills')) {
      const names = splitList(v('skills'))
      if (names.length < 1 || names.length > 3) err(col('skills'), '1 to 3 skills, separated by commas')
      else out.skills = refs('skill', 'skills', names, col('skills'))
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
    subtitle,
    url,
    image,
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
    skills,
    feelsLike: feelsLike!,
    partner: get('partner') || undefined,
    notes: get('notes') || undefined,
    teachers: { show: !!tShow, grades, moments, ...tOver },
    parents: { show: !!pShow, when, ...pOver },
  })
}

if (longSubtitles.length) {
  console.log(`\n${longSubtitles.length} subtitle${longSubtitles.length === 1 ? '' : 's'} over 50 characters (imported as written):`)
  console.table(longSubtitles)
}
if (missingImages.length) {
  console.log(`\n${missingImages.length} game${missingImages.length === 1 ? '' : 's'} without an image (each keeps its current image):`)
  console.table(missingImages)
}
if (bannerNotes.size) {
  console.log('\nImages not simply cropped:')
  for (const [file, note] of bannerNotes) console.log(`  ${file}: ${note}`)
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was written.\n`)
  // Grouped by type: the column, and the problem with the row's own value left out.
  const kinds = new Map<string, number[]>()
  for (const e of errors) {
    const kind = `${e.Column}: ${e.Problem.replace(/"[^"]*"/, '"…"').replace(/ \(this row has \d+\)/, '')}`
    kinds.set(kind, [...(kinds.get(kind) || []), e.Row])
  }
  console.table([...kinds].map(([Type, rowsHit]) => ({ Type, Count: rowsHit.length, Rows: rowsHit.join(', ') })))
  console.table([...errors].sort((a, b) => a.Column.localeCompare(b.Column) || a.Row - b.Row))
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
    Minutes: g.minutes,
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
if (listLayout) console.log('Final-list sheet: existing games are patched; cost, offline, platforms, partner, notes, icon, on-page switches, overrides, featured and hidden are kept.')

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
  const imageId = g.image ? await uploadImage(g.image) : undefined
  if (listLayout) {
    // Only the fields the final list carries. The name stays as stored (it matched case-insensitively).
    tx.patch(g._id, (p) =>
      p.setIfMissing({ teachers: { show: true }, parents: { show: true } }).set({
        subtitle: g.subtitle,
        url: g.url,
        ...(imageId ? { image: imageField(imageId, g.imageAlt) } : {}),
        ageFrom: g.ageFrom,
        ageTo: g.ageTo,
        minutes: g.minutes,
        players: g.players,
        noReading: g.noReading,
        skills: g.skills.map((s) => ref(s._id)),
        feelsLike: g.feelsLike,
        'teachers.grades': g.teachers.grades,
        'parents.when': g.parents.when.map((w) => ref(w._id)),
      }),
    )
    continue
  }
  const iconId = g.icon ? await uploadImage(g.icon) : undefined
  const prev = existing.games.find((x) => x._id === g._id)
  tx.createOrReplace({
    _id: g._id,
    _type: 'game',
    name: g.name,
    subtitle: g.subtitle,
    url: g.url,
    image: imageField(imageId!, g.imageAlt),
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
const uploaded = parsed.filter((g) => g.image).length
console.log(
  `\nDone. Transaction ${result.transactionId}: ${parsed.length} games written (${uploaded} with a new image, ${assetIds.size} files uploaded), ${toCreate.length} list entries created, ${added} moment entries added, ${toPrune.length} deleted.`,
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
function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s)
}
function yesNo(s: string): boolean | null {
  const v = s.trim().toLowerCase()
  if (['yes', 'y', 'true', '1'].includes(v)) return true
  if (['no', 'n', 'false', '0'].includes(v)) return false
  return null
}
function oneOf<T extends string>(s: string, allowed: readonly T[]): T | null {
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

// ---------- images ----------

/** The file ID in a Google Drive link, or null if the cell is not one. */
function driveId(cell: string): string | null {
  const m = cell.match(/^https?:\/\/(?:drive|docs|drive\.usercontent)\.google\.com\/.*?(?:\/d\/|[?&]id=)([\w-]{10,})/i)
  return m ? m[1] : null
}

/** A file in the images folder called `name`, or `name` plus an extension. */
function localFile(name: string): string | null {
  const exact = path.join(imagesDir, name)
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) return exact
  const hit = fs.readdirSync(imagesDir).find((f) => path.parse(f).name === name && fs.statSync(path.join(imagesDir, f)).isFile())
  return hit ? path.join(imagesDir, hit) : null
}

async function findSource(cell: string): Promise<Source | string> {
  const id = driveId(cell)
  const key = id || cell
  if (!sourceCache.has(key)) sourceCache.set(key, await fetchSource(cell, id))
  return sourceCache.get(key)!
}

async function fetchSource(cell: string, id: string | null): Promise<Source | string> {
  const isLink = /^https?:\/\//i.test(cell)
  const local = id ? localFile(id) : isLink ? null : localFile(cell)
  if (local) {
    if (fs.statSync(local).size === 0) return `File "${path.basename(local)}" is empty`
    return { buffer: fs.readFileSync(local), filename: path.basename(local) }
  }
  if (!isLink) return `File "${cell}" not found in ${imagesDir}`
  const url = id ? `https://drive.usercontent.google.com/download?id=${id}&export=download` : cell
  try {
    const res = await fetch(url)
    if (!res.ok) return `Could not download (${res.status})${id ? `; no file named ${id}.* in ${imagesDir} either` : ''}`
    const buffer = Buffer.from(await res.arrayBuffer())
    const format = await sharp(buffer)
      .metadata()
      .then((m) => m.format)
      .catch(() => null)
    if (!format) return `The download is not an image${id ? ' (is the Drive file shared with "Anyone with the link"?)' : ''}`
    if (!id) return { buffer, filename: path.basename(new URL(cell).pathname) || `image.${format}` }
    const filename = `${id}.${format === 'jpeg' ? 'jpg' : format}`
    fs.writeFileSync(path.join(imagesDir, filename), buffer) // so the next run finds it in the folder
    return { buffer, filename }
  } catch (e) {
    const err = e as Error & { cause?: Error }
    return `Could not download: ${err.cause?.message || err.message}${id ? `; no file named ${id}.* in ${imagesDir} either` : ''}`
  }
}

/** A card image or an icon, from a file name or a link. `kind` picks the placeholder size under --allow-missing-images. */
async function loadImage(cell: string, kind: 'image' | 'icon', onError: (msg: string) => void): Promise<Img | undefined> {
  const key = `${kind}:${driveId(cell) || cell}`
  if (imageCache.has(key)) return imageCache.get(key)
  const src = await findSource(cell)
  let img: Img | undefined
  if (typeof src === 'string') {
    if (allowMissingImages && !listLayout) {
      placeholders++
      img = placeholder(kind)
    } else onError(src)
  } else if (kind === 'icon') img = src
  else {
    try {
      img = await toBanner(src)
    } catch (e) {
      onError(`"${src.filename}" could not be converted: ${(e as Error).message}`)
    }
  }
  if (img) imageCache.set(key, img)
  return img
}

/**
 * Centre-crop to 16:10, resize to 1600×1000 and save as a JPG on white, quality 85, stepping the quality
 * down if needed to stay under 1 MB. A crop that would cut more than a quarter of the width or height (a
 * wide logo, say) fits the whole image on white instead. The result is also written to <imagesDir>/processed/.
 */
async function toBanner(src: Source): Promise<Img> {
  const meta = await sharp(src.buffer).metadata()
  if (!meta.width || !meta.height) throw new Error('no width or height')
  // Vector files (SVG) are rendered large enough for 1600×1000.
  const density = meta.format === 'svg' ? Math.min(2400, Math.ceil(72 * Math.max(1, BANNER.width / meta.width, BANNER.height / meta.height))) : undefined
  const ratio = meta.width / meta.height / (BANNER.width / BANNER.height)
  const cut = ratio > 1 ? 1 - 1 / ratio : 1 - ratio
  const fit = cut > 0.25 ? 'contain' : 'cover'
  // A fitted image gets a 10% white margin on every side, so a logo does not touch the card edges.
  const [mx, my] = fit === 'contain' ? [BANNER.width / 10, BANNER.height / 10] : [0, 0]
  for (let quality = BANNER.quality; ; quality -= 5) {
    const buffer = await sharp(src.buffer, density ? { density } : {})
      .flatten({ background: '#ffffff' })
      .resize(BANNER.width - 2 * mx, BANNER.height - 2 * my, { fit, position: 'centre', background: '#ffffff' })
      .extend({ top: my, bottom: my, left: mx, right: mx, background: '#ffffff' })
      .jpeg({ quality })
      .toBuffer()
    if (buffer.length >= BANNER.maxBytes && quality > BANNER.minQuality) continue
    if (buffer.length >= BANNER.maxBytes) throw new Error(`still ${Math.round(buffer.length / 1024)} KB at quality ${quality}`)
    const notes = [
      fit === 'contain' ? `fitted on white, not cropped (source ${meta.width}×${meta.height}; a crop would cut ${Math.round(cut * 100)}%)` : '',
      quality < BANNER.quality ? `saved at quality ${quality} to stay under 1 MB` : '',
    ].filter(Boolean)
    if (notes.length) bannerNotes.set(src.filename, notes.join('; '))
    const filename = `${path.parse(src.filename).name}.jpg`
    fs.mkdirSync(path.join(imagesDir, 'processed'), { recursive: true })
    fs.writeFileSync(path.join(imagesDir, 'processed', filename), buffer)
    return { buffer, filename }
  }
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
