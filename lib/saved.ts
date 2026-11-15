// Saved list (test, round 8): the rules behind the list a visitor keeps in their browser.
// The list is a JSON array of game _ids under one localStorage key, shared by Teachers and Parents.
// Nothing is stored on a server. To remove the feature, see "Saved list" in docs/STATUS.md.
//
// Nothing here touches Sanity, React or the browser, so it is unit-tested directly (lib/saved.test.mts).

export const SAVED_KEY = 'tg_saved'
/** The address parameter of a shared list: /teachers?list=id,id */
export const LIST_PARAM = 'list'
/** At most this many games go into a link. */
export const MAX_LINK = 30

export type SavedAudience = 'teachers' | 'parents'

/** What a row in the list needs to know about a game. */
export type SavedRow = { _id: string; name: string; subtitle?: string | null; url?: string | null }

// Sanity document ids: letters, digits, dot, dash, underscore.
const ID = /^[A-Za-z0-9._-]{1,128}$/

/** Keep valid ids, each once, in order. Anything else is dropped. */
export function cleanIds(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const out: string[] = []
  for (const v of values) if (typeof v === 'string' && ID.test(v) && !out.includes(v)) out.push(v)
  return out
}

/** The stored value (a JSON array of ids) as a list. Missing or damaged values give an empty list. */
export function parseStored(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    return cleanIds(JSON.parse(raw))
  } catch {
    return []
  }
}

/** The ids in a `?list=` value: comma-separated, at most MAX_LINK. */
export const parseListParam = (value: string | null | undefined): string[] =>
  value ? cleanIds(value.split(',').map((s) => s.trim())).slice(0, MAX_LINK) : []

/** Add the id if it is missing (at the end), remove it if it is there. */
export const toggleId = (ids: string[], id: string): string[] => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

/** The list with `more` added at the end, skipping ids already in it. */
export const mergeIds = (ids: string[], more: string[]): string[] => [...ids, ...more.filter((id) => !ids.includes(id))]

/** Only the ids that match a known game, in the same order. */
export const knownIds = (ids: string[], has: (id: string) => boolean): string[] => ids.filter(has)

/** "3 games" / "1 game", with words in between: countLabel(3, 'saved game') is "3 saved games". */
export const countLabel = (n: number, noun = 'game') => `${n} ${noun}${n === 1 ? '' : 's'}`

/** The link to a list, for the page the visitor is on. Only the first MAX_LINK ids go in. */
export const listUrl = (origin: string, audience: SavedAudience, ids: string[]): string =>
  `${origin.replace(/\/+$/, '')}/${audience}?${LIST_PARAM}=${ids.slice(0, MAX_LINK).join(',')}`

/** The list as plain text: a title, then "• Name: subtitle" with the game's URL on the next line, then the link. */
export function listText(games: SavedRow[], url: string): string {
  const lines = ['Thinking Games list']
  for (const g of games) {
    const subtitle = g.subtitle?.trim()
    lines.push(`• ${g.name}${subtitle && subtitle !== g.name ? `: ${subtitle}` : ''}`)
    if (g.url) lines.push(g.url)
  }
  lines.push(url)
  return lines.join('\n')
}
