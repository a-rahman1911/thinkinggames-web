// Import games from the Games spreadsheet into Sanity.
//
//   npm run import:games -- <file.xlsx> <imagesDir> [--dry-run] [--prune]
//
// Reads the "Games" sheet (row 1 = headers; a trailing " *" marks a required column) and the
// "Lists" sheet (allowed values for Skills, Teacher moments, When, Players, Platforms).
// Every row is validated first. If any row has an error, a table is printed and nothing is written.
// Games are upserted by id "game-<slugified name>", so re-running updates. Games that are no longer
// in the sheet are kept unless --prune is passed. Rows whose Notes contain "EXAMPLE ROW" are skipped.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SanityClient } from '@sanity/client'
import XLSX from 'xlsx'
import { COSTS, FEELS, PLATFORMS, PLAYERS } from '../lib/derive.ts'

// ---------- arguments and environment ----------

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const [file, imagesDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dryRun = flags.has('--dry-run')
const prune = flags.has('--prune')

if (!file || !imagesDir) fail('Usage: npm run import:games -- <file.xlsx> <imagesDir> [--dry-run] [--prune]')
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

const COLUMNS = {
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
  when: 'When (parents)',
  moments: 'Teacher moments',
  showOn: 'Show on',
  partner: 'Partner',
  featured: 'Featured',
  notes: 'Notes',
} as const
type Col = keyof typeof COLUMNS

const LISTS = { skills: 'Skills', moments: 'Teacher moments', when: 'When (parents)', players: 'Players', platforms: 'Platforms' } as const

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
const lists: Record<keyof typeof LISTS, Map<string, string>> = { skills: new Map(), moments: new Map(), when: new Map(), players: new Map(), platforms: new Map() }
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
// Fixed lists from the schema win over the sheet for players and platforms.
for (const p of PLAYERS) lists.players.set(p.toLowerCase(), p)
for (const p of PLATFORMS) lists.platforms.set(p.toLowerCase(), p)

// ---------- existing documents (for case-insensitive matching and carrying over "hidden") ----------

type Titled = { _id: string; title: string; order?: number }
const existing = await client.fetch<{ skills: Titled[]; when: Titled[]; moments: Titled[]; games: { _id: string; hidden?: boolean }[] }>(
  `{
    "skills": *[_type == "skill"]{ _id, title, order },
    "when": *[_type == "whenOption"]{ _id, title, order },
    "moments": *[_type == "moment"]{ _id, title, order },
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
type Img = { buffer: Buffer; filename: string }
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
  when: Titled[]
  moments: Titled[]
  showOn: string[]
  partner?: string
  featured: boolean
  notes?: string
}

const errors: RowError[] = []
const parsed: ParsedGame[] = []
const imageCache = new Map<string, Img>()
let skipped = 0
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
  if (url && !/^https?:\/\/\S+$/i.test(url)) err('url', 'Must be a full link starting with https://')

  const ageFrom = int(get('ageFrom'))
  const ageTo = int(get('ageTo'))
  if (get('ageFrom') && (ageFrom === null || ageFrom < 3 || ageFrom > 14)) err('ageFrom', 'Whole number 3 to 14')
  if (get('ageTo') && (ageTo === null || ageTo < 3 || ageTo > 14)) err('ageTo', 'Whole number 3 to 14')
  if (ageFrom !== null && ageTo !== null && ageTo < ageFrom) err('ageTo', 'Must be at least "Age from"')

  const minutes = int(get('minutes'))
  if (get('minutes') && (minutes === null || minutes < 1 || minutes > 120)) err('minutes', 'Whole number 1 to 120')

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
  const featured = yesNo(get('featured') || 'No')
  if (get('featured') && featured === null) err('featured', 'Yes or No')

  const showOnText = get('showOn').toLowerCase()
  const showOn = showOnText === 'both' ? ['teachers', 'parents'] : showOnText === 'teachers' ? ['teachers'] : showOnText === 'parents' ? ['parents'] : null
  if (get('showOn') && !showOn) err('showOn', 'Allowed: Both, Teachers, Parents')

  const skillNames = splitList(get('skills'))
  if (get('skills') && (skillNames.length < 1 || skillNames.length > 3)) err('skills', '1 to 3 skills, separated by commas')
  const whenNames = splitList(get('when'))
  const momentNames = splitList(get('moments'))
  if (showOn?.includes('parents') && !whenNames.length) err('when', 'Required when "Show on" includes Parents')
  if (showOn?.includes('teachers') && !momentNames.length) err('moments', 'Required when "Show on" includes Teachers')

  const image = get('imageFile') ? await loadImage(get('imageFile'), (m) => err('imageFile', m)) : undefined
  const icon = get('iconFile') ? await loadImage(get('iconFile'), (m) => err('iconFile', m)) : undefined

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
    when: whenNames.map((s) => resolveRef('whenOption', 'when', s)),
    moments: momentNames.map((s) => resolveRef('moment', 'moments', s)),
    showOn: showOn!,
    partner: get('partner') || undefined,
    featured: featured!,
    notes: get('notes') || undefined,
  })
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was written.\n`)
  console.table(errors)
  process.exit(1)
}

const toCreate = (['skill', 'whenOption', 'moment'] as RefKind[]).flatMap((kind) => [...refDocs[kind].values()].filter((d) => d.create).map((d) => ({ kind, ...d })))
const existingIds = new Set(existing.games.map((g) => g._id))
const toPrune = prune ? existing.games.filter((g) => !seenIds.has(g._id)).map((g) => g._id) : []

console.log(`\n${parsed.length} game${parsed.length === 1 ? '' : 's'} valid, ${skipped} example row${skipped === 1 ? '' : 's'} skipped.`)
console.table(
  parsed.map((g) => ({
    Row: g.row,
    Game: g.name,
    Action: existingIds.has(g._id) ? 'update' : 'create',
    Images: g.icon ? 'image + icon' : 'image',
    'Shows on': g.showOn.join(', '),
  })),
)
if (toCreate.length) console.log('New list entries to create:', toCreate.map((d) => `${d.kind} "${d.title}"`).join(', '))
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

const imageField = (img: Img, assetId: string, alt?: string) => ({ _type: 'image', asset: { _type: 'reference', _ref: assetId }, ...(alt ? { alt } : {}) })
const ref = (id: string) => ({ _type: 'reference', _ref: id, _key: id })

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
    image: imageField(g.image, imageId, g.imageAlt),
    ...(iconId ? { icon: imageField(g.icon!, iconId, g.name) } : {}),
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
    when: g.when.map((w) => ref(w._id)),
    moments: g.moments.map((m) => ref(m._id)),
    showOn: g.showOn,
    ...(g.partner ? { partner: g.partner } : {}),
    featured: g.featured,
    hidden: prev?.hidden === true, // keep a "hidden" set in Studio
    ...(g.notes ? { notes: g.notes } : {}),
  })
}
for (const id of toPrune) tx.delete(id)

const result = await tx.commit()
console.log(`\nDone. Transaction ${result.transactionId}: ${parsed.length} games written, ${toCreate.length} list entries created, ${toPrune.length} deleted.`)

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
async function loadImage(cell: string, onError: (msg: string) => void): Promise<Img | undefined> {
  if (imageCache.has(cell)) return imageCache.get(cell)
  let img: Img | undefined
  if (/^https?:\/\//i.test(cell)) {
    try {
      const res = await fetch(cell)
      if (!res.ok) onError(`Could not download (${res.status})`)
      else img = { buffer: Buffer.from(await res.arrayBuffer()), filename: path.basename(new URL(cell).pathname) || 'image' }
    } catch (e) {
      onError(`Could not download: ${(e as Error).message}`)
    }
  } else {
    const p = path.join(imagesDir, cell)
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) onError(`File "${cell}" not found in ${imagesDir}`)
    else if (fs.statSync(p).size === 0) onError(`File "${cell}" is empty`)
    else img = { buffer: fs.readFileSync(p), filename: cell }
  }
  if (img) imageCache.set(cell, img)
  return img
}
