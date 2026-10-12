// Pure functions that turn a game's facts (age range, minutes, players, cost, ...) into
// everything the site shows: filter membership, badges, the "Builds" line and sort order.
//
// A game carries shared facts plus a `teachers` and a `parents` object. Each audience object
// says whether the game shows on that page and can override a few shared values (URL, subtitle,
// image, icon, minutes, skills, feels like) and limit which badges show. resolve() folds one
// audience's overrides into the shared facts; every other function here works on that result,
// so the views never read an override directly.
//
// Nothing here touches Sanity or React, so it is unit-tested directly (lib/derive.test.mts).

export const PLAYERS = ['Solo', 'Pairs', 'Small group', 'Whole class'] as const
export const COSTS = ['Free', 'Free with account', 'Paid'] as const
export const PLATFORMS = ['Web', 'iOS', 'Android', 'Print', 'Physical game'] as const
export const FEELS = ['A game', 'Math'] as const
/** Teachers "Grade" filter values. Set by hand on each game (teachers.grades), never worked out from age. */
export const GRADES = ['K-1', '2-3', '4-5'] as const
/** The badge kinds a card can show, in display order. An audience can limit a game to a subset. */
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

/** What an audience tab can override. Unset (null, undefined, '' or []) means "use the shared value". */
export type Overrides = {
  url?: string | null
  subtitle?: string | null
  image?: unknown
  icon?: unknown
  minutes?: number | null
  skills?: Skill[] | null
  feelsLike?: string | null
  /** Which badge kinds to show (see BADGE_KINDS). Empty means all. */
  badges?: string[] | null
  featured?: boolean | null
}
export type TeachersSettings = Overrides & { show?: boolean | null; grades?: string[] | null }
export type ParentsSettings = Overrides & { show?: boolean | null; when?: { _id: string }[] | null }

/** The facts a game document carries. Everything else is derived from these. */
export type GameFacts = {
  name: string
  subtitle?: string | null
  url?: string | null
  image?: unknown
  icon?: unknown
  ageFrom: number
  ageTo: number
  minutes: number
  players?: string[] | null
  cost?: string | null
  offline?: boolean | null
  noReading?: boolean | null
  feelsLike?: string | null
  skills?: Skill[] | null
  /** Takes the game off both pages. */
  hidden?: boolean | null
  teachers?: TeachersSettings | null
  parents?: ParentsSettings | null
}

/** A game as one audience sees it: the shared facts with that audience's overrides folded in. */
export type ResolvedGame<T extends GameFacts = GameFacts> = Omit<T, 'teachers' | 'parents'> & {
  audience: Audience
  featured: boolean
  /** Teachers "Grade" filter values, as set by hand. Empty for parents. */
  grades: string[]
  /** Parents "When" filter values. Empty for teachers. */
  when: { _id: string }[]
  /** Badge kinds to show; empty means all. */
  badgeKinds: string[]
}

const isSet = (v: unknown) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
const pick = <V>(override: V | null | undefined, shared: V): V => (isSet(override) ? (override as V) : shared)

/** The effective values for one audience: each override if set, the shared value otherwise. */
export function resolve<T extends GameFacts>(game: T, audience: Audience): ResolvedGame<T> {
  return resolveFacts(game, audience) as ResolvedGame<T>
}

function resolveFacts(g: GameFacts, audience: Audience): ResolvedGame {
  const { teachers, parents, ...shared } = g
  const o: Overrides = (audience === 'teachers' ? teachers : parents) || {}
  return {
    ...shared,
    url: pick(o.url, shared.url),
    subtitle: pick(o.subtitle, shared.subtitle),
    image: pick(o.image, shared.image),
    icon: pick(o.icon, shared.icon),
    minutes: pick(o.minutes, shared.minutes),
    skills: pick(o.skills, shared.skills),
    feelsLike: pick(o.feelsLike, shared.feelsLike),
    audience,
    featured: !!o.featured,
    grades: audience === 'teachers' ? teachers?.grades || [] : [],
    when: audience === 'parents' ? parents?.when || [] : [],
    badgeKinds: o.badges || [],
  }
}

export type Band = { label: string; from: number; to: number }

/** Parents "Age" filter. A game matches every band its age range overlaps. */
export const PARENT_AGE_BANDS: Band[] = [
  { label: 'Ages 4-5', from: 4, to: 5 },
  { label: 'Ages 6-8', from: 6, to: 8 },
  { label: 'Ages 9-11', from: 9, to: 11 },
]

export const MINUTE_BUCKETS = ['5', '10', '20'] as const
export const TEACHER_FEELS = ['a game', 'math'] as const
export const ALSO_OPTIONS = ['No reading needed', 'Together'] as const

export const overlaps = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>, band: Band) => g.ageFrom <= band.to && g.ageTo >= band.from

export const ageBands = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>, bands: Band[]) =>
  bands.filter((b) => overlaps(g, b)).map((b) => b.label)

export const parentAgeBands = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>) => ageBands(g, PARENT_AGE_BANDS)

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
 * Card badges, in BADGE_KINDS order. The first one is highlighted by the card.
 * `badgeKinds` limits which kinds show; empty means all. A kind with nothing to show is skipped.
 */
export const badges = (g: BadgeFacts): string[] => {
  const all: [BadgeKind, string | null | undefined][] = [
    ['Cost', g.cost],
    ['Players', g.players?.length ? g.players.join(' / ') : null],
    ['Minutes', typeof g.minutes === 'number' ? `${g.minutes} min` : null],
    ['Offline', g.offline ? 'Offline' : null],
    ['No reading needed', g.noReading ? 'No reading needed' : null],
  ]
  const wanted = g.badgeKinds?.length ? new Set(g.badgeKinds) : null
  return all.filter(([kind, text]) => !!text && (!wanted || wanted.has(kind))).map(([, text]) => text as string)
}

/** The "Builds …" line: skill titles joined with a middle dot. */
export const builds = (g: Pick<GameFacts, 'skills'>) => (g.skills || []).map((s) => s.title).join(' · ')

/** Featured games first, then by name. Hidden games are dropped. Used for search results and the Parents library. */
export const sortGames = <T extends Pick<GameFacts, 'name' | 'hidden'> & { featured?: boolean | null }>(games: T[]): T[] =>
  games
    .filter((g) => !g.hidden)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name))

export type FacetKey = 'grade' | 'minutes' | 'feel' | 'age' | 'when' | 'feelsLike' | 'also'

/** The filter values a resolved game matches for one filter group. The views compare against these. */
export function facetValues(g: ResolvedGame, key: FacetKey): string[] {
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

/** Teachers filter groups (all fixed, nothing from the CMS). */
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
