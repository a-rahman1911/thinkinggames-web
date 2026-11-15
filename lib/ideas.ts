// Ideas (round 11): the rules behind the editorial section. Which articles a page lists, the read time,
// and which games an article's cover is built from. To remove the section, see "Ideas" in docs/STATUS.md.
//
// Nothing here touches Sanity, React or the browser, so it is unit-tested directly (lib/ideas.test.mts).

/** Who an article is for. It decides the label, the colour and where the article is listed. */
export type IdeaAudience = 'teachers' | 'parents' | 'both'
/** The two audience pages. */
export type PageAudience = 'teachers' | 'parents'

/** What is shown while a field of the "Ideas section" document is empty. */
export const IDEAS_DEFAULTS = {
  navLabel: 'Ideas',
  headline: 'Ideas for getting more out of thinking games.',
  highlight: 'Ideas',
  intro: 'Short reads for teachers and parents: which games to pick, when to use them, and what to say while kids play.',
}

/** The parts of a body block these rules read. Text blocks carry children; Tip and Quote carry text; Game carries a game. */
export type BodyBlock<G = unknown> = {
  _type: string
  children?: { text?: string | null }[] | null
  text?: string | null
  game?: G | null
}

type Dated = { _id: string; audience: IdeaAudience; publishedAt?: string | null; _createdAt?: string | null }

const words = (text?: string | null) => (text || '').trim().split(/\s+/).filter(Boolean).length

/** Words a reader reads: paragraphs, headings and list items, plus the text of tips and quotes. Captions are not counted. */
export const wordCount = (body?: BodyBlock[] | null): number =>
  (body || []).reduce((n, b) => n + (b._type === 'block' ? words((b.children || []).map((c) => c.text || '').join('')) : words(b.text)), 0)

/** Read time in minutes: words ÷ 200, rounded up, at least 1. */
export const readMinutes = (body?: BodyBlock[] | null): number => Math.max(1, Math.ceil(wordCount(body) / 200))

type Hideable = { _id: string; hidden?: boolean | null }

/** A game block shows only when its game still exists and is not hidden. */
const shown = <G extends Hideable>(game?: G | null): game is G => !!game && !!game._id && !game.hidden

/** The body without Game blocks whose game is hidden or no longer exists. Everything else is kept, in order. */
export const visibleBody = <B extends BodyBlock<Hideable>>(body?: B[] | null): B[] =>
  (body || []).filter((b) => b._type !== 'gameCard' || shown(b.game))

/** The games a cover is built from: the first three different games in the body, skipping hidden and missing ones. */
export function coverGames<G extends Hideable>(body?: BodyBlock<G>[] | null, max = 3): G[] {
  const out: G[] = []
  for (const b of body || []) {
    if (b._type !== 'gameCard' || !shown(b.game) || out.some((g) => g._id === b.game!._id)) continue
    out.push(b.game)
    if (out.length === max) break
  }
  return out
}

/** Newest first by the article's date. On the same date, the one created last comes first. */
export const newestFirst = <A extends Dated>(articles: A[]): A[] =>
  [...articles].sort(
    (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || (b._createdAt || '').localeCompare(a._createdAt || ''),
  )

/** Is the article listed for this audience? Articles for both are listed for everyone. */
export const fitsAudience = (a: { audience: IdeaAudience }, audience: PageAudience) => a.audience === audience || a.audience === 'both'

/** The strip on /teachers or /parents: the three newest articles for that audience. */
export const stripArticles = <A extends Dated>(articles: A[], audience: PageAudience, max = 3): A[] =>
  newestFirst(articles)
    .filter((a) => fitsAudience(a, audience))
    .slice(0, max)

/**
 * "More ideas" under an article: the three newest other articles that fit its audience. Under an article
 * for both audiences, any other article fits.
 */
export const moreArticles = <A extends Dated>(articles: A[], current: Pick<Dated, '_id' | 'audience'>, max = 3): A[] =>
  newestFirst(articles)
    .filter((a) => a._id !== current._id && (current.audience === 'both' || fitsAudience(a, current.audience)))
    .slice(0, max)

/** The index filter. "all" keeps everything; an audience keeps its own articles and the ones for both. */
export const filterArticles = <A extends { audience: IdeaAudience }>(articles: A[], choice: 'all' | PageAudience): A[] =>
  choice === 'all' ? articles : articles.filter((a) => fitsAudience(a, choice))

/** Which library card a Game block uses: the Teachers row in a Teachers article, the Parents card otherwise. */
export const cardAudience = (audience: IdeaAudience): PageAudience => (audience === 'teachers' ? 'teachers' : 'parents')

/** The label on an article and its cards. */
export const audienceLabel = (audience: IdeaAudience) =>
  audience === 'teachers' ? 'For teachers' : audience === 'parents' ? 'For parents' : 'For teachers and parents'

/** The heading over "More ideas" and over a strip: "Ideas for parents", "More ideas for teachers", "More ideas". */
export const ideasHeading = (label: string, audience: IdeaAudience) => (audience === 'both' ? label : `${label} for ${audience}`)

/** "2026-11-14" as "November 14, 2026". The date is a calendar day, so no time zone is applied. Bad values give "". */
export function formatDate(date?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '')
  if (!m) return ''
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
}
