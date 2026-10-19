// Pure functions that turn a game's facts (age range, minutes, players, cost, ...) into
// everything the site shows: filter membership, badges, the "Builds" line and sort order.
//
// A game carries shared facts plus a `teachers` and a `parents` object. Each audience object has a
// `show` switch, its own filter data (grades for teachers, when for parents) and optional overrides
// of the shared values. resolve(game, audience) folds the overrides in; the views use only resolved
// games, so every filter, badge and sort rule below works on the effective values for that audience.
//
// Nothing here touches Sanity or React, so it is unit-tested directly (lib/derive.test.mts).

export const PLAYERS = ['Solo', 'Pairs', 'Small group', 'Whole class'] as const
export const COSTS = ['Free', 'Free with account', 'Paid'] as const
export const PLATFORMS = ['Web', 'iOS', 'Android', 'Print', 'Physical game'] as const
export const FEELS = ['A game', 'Math'] as const
export const GRADES = ['K-1', '2-3', '4-5'] as const
export const BADGE_KINDS = ['Cost', 'Players', 'Minutes', 'Offline', 'No reading needed'] as const
export const AUDIENCES = ['teachers', 'parents'] as const

export type Player = (typeof PLAYERS)[number]
export type Cost = (typeof COSTS)[number]
export type Platform = (typeof PLATFORMS)[number]
export type Feel = (typeof FEELS)[number]
export type Grade = (typeof GRADES)[number]
export type BadgeKind = (typeof BADGE_KINDS)[number]
export type Audience = (typeof AUDIENCES)[number]

export type Skill = { title: string }
export type WhenRef = { _id: string }

/** The per-audience values that may replace a shared value. Unset (null/undefined) means "use the shared value". */
export type Overrides<Img = unknown> = {
  url?: string | null
  subtitle?: string | null
  image?: Img | null
  icon?: Img | null
  minutes?: number | null
  skills?: Skill[] | null
  feelsLike?: string | null
  /** Which badge kinds to show (BADGE_KINDS). Empty or unset = all. */
  badges?: string[] | null
  featured?: boolean | null
}

export type TeachersSettings<Img = unknown> = Overrides<Img> & { show?: boolean | null; grades?: string[] | null }
export type ParentsSettings<Img = unknown> = Overrides<Img> & { show?: boolean | null; when?: WhenRef[] | null }

/** The facts a game document carries. Everything else is derived from these. */
export type GameFacts<Img = unknown> = {
  name: string
  subtitle?: string | null
  url?: string | null
  image?: Img | null
  icon?: Img | null
  ageFrom: number
  ageTo: number
  minutes: number
  players?: string[] | null
  cost?: string | null
  offline?: boolean | null
  noReading?: boolean | null
  feelsLike?: string | null
  hidden?: boolean | null
  skills?: Skill[] | null
  teachers?: TeachersSettings<Img> | null
  parents?: ParentsSettings<Img> | null
}

/** A game seen by one audience: the shared values with that audience's overrides folded in. */
export type Resolved<T extends GameFacts> = Omit<T, 'teachers' | 'parents'> & {
  audience: Audience
  featured: boolean
  /** Badge kinds to show, or null for all. */
  badgeKinds: string[] | null
  /** Teachers "Grade" filter values, set by hand. Empty for parents. */
  grades: string[]
  /** Parents "When" references. Empty for teachers. */
  when: WhenRef[]
}

const pick = <V>(override: V | null | undefined, shared: V): V => (override === null || override === undefined ? shared : override)

/** Fold one audience's overrides into the shared values. Each override is used if set, the shared value otherwise. */
export function resolve<T extends GameFacts>(g: T, audience: Audience): Resolved<T> {
  const { teachers, parents, ...shared } = g
  const a: Overrides<unknown> = (audience === 'teachers' ? teachers : parents) || {}
  return {
    ...(shared as Omit<T, 'teachers' | 'parents'>),
    audience,
    url: pick(a.url, g.url),
    subtitle: pick(a.subtitle, g.subtitle),
    image: pick(a.image, g.image),
    icon: pick(a.icon, g.icon),
    minutes: pick(a.minutes, g.minutes),
    skills: a.skills?.length ? a.skills : g.skills,
    feelsLike: pick(a.feelsLike, g.feelsLike),
    featured: !!a.featured,
    badgeKinds: a.badges?.length ? a.badges : null,
    grades: audience === 'teachers' ? teachers?.grades || [] : [],
    when: audience === 'parents' ? parents?.when || [] : [],
  }
}

/** Is the game listed for this audience? (Its `show` switch, and the shared `hidden` switch.) */
export const shownTo = (g: Pick<GameFacts, 'hidden' | 'teachers' | 'parents'>, audience: Audience) =>
  !g.hidden && !!(audience === 'teachers' ? g.teachers?.show : g.parents?.show)

export type Band = { label: string; from: number; to: number }

/** Parents "Age" filter. A game matches every band its age range overlaps. */
export const PARENT_AGE_BANDS: Band[] = [
  { label: 'Ages 4-5', from: 4, to: 5 },
  { label: 'Ages 6-8', from: 6, to: 8 },
  { label: 'Ages 9-11', from: 9, to: 11 },
]

/**
 * Teachers grades expressed as ages. The site no longer derives grades from age: teachers.grades is
 * set by hand. This table is only a starting point, used once by the migration and the seed.
 */
export const TEACHER_GRADE_BANDS: Band[] = [
  { label: 'K-1', from: 5, to: 7 },
  { label: '2-3', from: 7, to: 9 },
  { label: '4-5', from: 9, to: 11 },
]

export const MINUTE_BUCKETS = ['5', '10', '20'] as const
export const TEACHER_FEELS = ['a game', 'math'] as const
export const ALSO_OPTIONS = ['No reading needed', 'Together'] as const

export const overlaps = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>, band: Band) => g.ageFrom <= band.to && g.ageTo >= band.from

export const ageBands = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>, bands: Band[]) =>
  bands.filter((b) => overlaps(g, b)).map((b) => b.label)

export const parentAgeBands = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>) => ageBands(g, PARENT_AGE_BANDS)

/** A first guess at teachers.grades from the age range. Migration and seed only; the site uses teachers.grades as is. */
export const gradesFromAge = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>) => ageBands(g, TEACHER_GRADE_BANDS)

/** "5" if 5 minutes or less, "10" if 6 to 10, "20" if more than 10. */
export const minutesBucket = (minutes: number): (typeof MINUTE_BUCKETS)[number] =>
  minutes <= 5 ? '5' : minutes <= 10 ? '10' : '20'

/** Teachers show "Feels like" in lower case ("a game", "math"); Parents show it as stored. */
export const teacherFeel = (g: Pick<GameFacts, 'feelsLike'>) => (g.feelsLike || '').toLowerCase()

/** Parents "Also" filter: No reading needed, and Together when anyone other than Solo can play. */
export const alsoTags = (g: Pick<GameFacts, 'noReading' | 'players'>): string[] => [
  ...(g.noReading ? ['No reading needed'] : []),
  ...(g.players?.some((p) => p !== 'Solo') ? ['Together'] : []),
]

type BadgeFacts = Pick<GameFacts, 'cost' | 'players' | 'minutes' | 'offline' | 'noReading'> & { badgeKinds?: string[] | null }

/**
 * Card badges, in the fixed order cost, players, minutes, Offline, No reading needed. The first one is
 * highlighted by the card. `badgeKinds` (from the audience's badges list) keeps only those kinds; null = all.
 */
export const badges = (g: BadgeFacts): string[] => {
  const all: [BadgeKind, string | null | undefined][] = [
    ['Cost', g.cost],
    ['Players', g.players?.length ? g.players.join(' / ') : null],
    ['Minutes', typeof g.minutes === 'number' ? `${g.minutes} min` : null],
    ['Offline', g.offline ? 'Offline' : null],
    ['No reading needed', g.noReading ? 'No reading needed' : null],
  ]
  const keep = g.badgeKinds?.length ? new Set(g.badgeKinds.map((k) => k.toLowerCase())) : null
  return all.filter(([kind, label]) => !!label && (!keep || keep.has(kind.toLowerCase()))).map(([, label]) => label as string)
}

/** The "Builds …" line: skill titles joined with a middle dot. */
export const builds = (g: Pick<GameFacts, 'skills'>) => (g.skills || []).map((s) => s.title).join(' · ')

/** Featured games first, then A to Z. Hidden games are dropped. Use on resolved games (featured is per audience). */
export const sortGames = <T extends { name: string; featured?: boolean | null; hidden?: boolean | null }>(games: T[]): T[] =>
  games
    .filter((g) => !g.hidden)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name))

export type FacetKey = 'grade' | 'minutes' | 'feel' | 'age' | 'when' | 'feelsLike' | 'also'

/** The filter values a resolved game matches for one filter group. The views compare against these. */
export function facetValues(g: Resolved<GameFacts>, key: FacetKey): string[] {
  switch (key) {
    case 'grade':
      return g.grades
    case 'minutes':
      return [minutesBucket(g.minutes)]
    case 'feel':
      return [teacherFeel(g)]
    case 'age':
      return parentAgeBands(g)
    case 'when':
      return g.when.map((w) => w._id)
    case 'feelsLike':
      return g.feelsLike ? [g.feelsLike] : []
    case 'also':
      return alsoTags(g)
  }
}

export type FilterGroup = { key: FacetKey; label: string; options: { value: string; label: string }[] }

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }))

/** Teachers filter groups (all derived, nothing from the CMS). */
export const TEACHER_GROUPS: FilterGroup[] = [
  { key: 'grade', label: 'Grade', options: opts(GRADES) },
  { key: 'minutes', label: 'Minutes', options: opts(MINUTE_BUCKETS) },
  { key: 'feel', label: 'Feels like', options: opts(TEACHER_FEELS) },
]

/** Parents filter groups. "When" options come from the CMS (whenOption documents). */
export const parentGroups = (whenOptions: { _id: string; title: string }[]): FilterGroup[] =>
  [
    { key: 'age' as const, label: 'Age', options: opts(PARENT_AGE_BANDS.map((b) => b.label)) },
    { key: 'when' as const, label: 'When', options: whenOptions.map((w) => ({ value: w._id, label: w.title })) },
    { key: 'feelsLike' as const, label: 'Feels like', options: opts(FEELS) },
    { key: 'also' as const, label: 'Also', options: opts(ALSO_OPTIONS) },
  ].filter((g) => g.options.length > 0)
