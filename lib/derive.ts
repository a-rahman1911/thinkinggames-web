// Pure functions that turn a game's facts (age range, minutes, players, cost, ...) into
// everything the site shows: filter membership, badges, the "Builds" line and sort order.
// Nothing here touches Sanity or React, so it is unit-tested directly (lib/derive.test.mts).

export const PLAYERS = ['Solo', 'Pairs', 'Small group', 'Whole class'] as const
export const COSTS = ['Free', 'Free with account', 'Paid'] as const
export const PLATFORMS = ['Web', 'iOS', 'Android', 'Print', 'Physical game'] as const
export const FEELS = ['A game', 'Math'] as const
export const SHOW_ON = ['teachers', 'parents'] as const

export type Player = (typeof PLAYERS)[number]
export type Cost = (typeof COSTS)[number]
export type Platform = (typeof PLATFORMS)[number]
export type Feel = (typeof FEELS)[number]
export type ShowOn = (typeof SHOW_ON)[number]

/** The facts a game document carries. Everything else is derived from these. */
export type GameFacts = {
  name: string
  ageFrom: number
  ageTo: number
  minutes: number
  players?: string[] | null
  cost?: string | null
  offline?: boolean | null
  noReading?: boolean | null
  feelsLike?: string | null
  featured?: boolean | null
  hidden?: boolean | null
  skills?: { title: string }[] | null
  when?: { _id: string }[] | null
}

export type Band = { label: string; from: number; to: number }

/** Parents "Age" filter. A game matches every band its age range overlaps. */
export const PARENT_AGE_BANDS: Band[] = [
  { label: 'Ages 4-5', from: 4, to: 5 },
  { label: 'Ages 6-8', from: 6, to: 8 },
  { label: 'Ages 9-11', from: 9, to: 11 },
]

/** Teachers "Grade" filter, expressed as ages. */
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
export const gradeBands = (g: Pick<GameFacts, 'ageFrom' | 'ageTo'>) => ageBands(g, TEACHER_GRADE_BANDS)

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

/** Card badges, in order. The first one is highlighted by the card. */
export const badges = (g: Pick<GameFacts, 'cost' | 'players' | 'minutes' | 'offline' | 'noReading'>): string[] =>
  [
    g.cost,
    g.players?.length ? g.players.join(' / ') : null,
    typeof g.minutes === 'number' ? `${g.minutes} min` : null,
    g.offline ? 'Offline' : null,
    g.noReading ? 'No reading needed' : null,
  ].filter((b): b is string => !!b)

/** The "Builds …" line: skill titles joined with a middle dot. */
export const builds = (g: Pick<GameFacts, 'skills'>) => (g.skills || []).map((s) => s.title).join(' · ')

/** Featured games first, then by name. Hidden games are dropped. */
export const sortGames = <T extends Pick<GameFacts, 'name' | 'featured' | 'hidden'>>(games: T[]): T[] =>
  games
    .filter((g) => !g.hidden)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name))

export type FacetKey = 'grade' | 'minutes' | 'feel' | 'age' | 'when' | 'feelsLike' | 'also'

/** The filter values a game matches for one filter group. The views compare against these. */
export function facetValues(g: GameFacts, key: FacetKey): string[] {
  switch (key) {
    case 'grade':
      return gradeBands(g)
    case 'minutes':
      return [minutesBucket(g.minutes)]
    case 'feel':
      return [teacherFeel(g)]
    case 'age':
      return parentAgeBands(g)
    case 'when':
      return (g.when || []).map((w) => w._id)
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
  { key: 'grade', label: 'Grade', options: opts(TEACHER_GRADE_BANDS.map((b) => b.label)) },
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
