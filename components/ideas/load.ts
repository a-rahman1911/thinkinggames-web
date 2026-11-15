// Ideas (round 11): the switch and the articles. Server only (called by the pages, the sitemap and the 404 page).

import { cache } from 'react'
import { resolve } from '@/lib/derive'
import {
  IDEAS_DEFAULTS,
  cardAudience,
  coverGames,
  formatDate,
  ideasHeading,
  newestFirst,
  readMinutes,
  stripArticles,
  visibleBody,
  type BodyBlock,
  type IdeaAudience,
  type PageAudience,
} from '@/lib/ideas'
import { sanityFetch } from '@/sanity/client'
import { articlesQuery, ideasPageQuery } from '@/sanity/queries'
import type { Article, Game, IdeasPage, SanityImage, Seo } from '@/sanity/types'
import { isPreview, previewClient } from './preview'

/** The section's texts, with the defaults filled in. */
export type IdeasTexts = { navLabel: string; headline: string; highlight?: string; intro: string; seo?: Seo }

/** What the pages get: null when the section is off. */
export type IdeasData = { texts: IdeasTexts; articles: Article[]; preview: boolean } | null

/** What a card needs to know about an article. Small, because cards are also sent to the browser. */
export type IdeaCard = {
  slug: string
  title: string
  summary?: string
  audience: IdeaAudience
  /** "November 14, 2026 · 3 min read" */
  meta: string
  cover: SanityImage | null
  /** With no uploaded cover: the pictures of the first three games in the body, as the article's audience sees them. */
  tiles: { _id: string; image?: SanityImage | null; icon?: SanityImage | null }[]
}

/** What /teachers and /parents get: the header link's label and their strip. Null when the section is off. */
export type IdeasForPage = { navLabel: string; heading: string; strip: IdeaCard[] } | null

const AUDIENCES: IdeaAudience[] = ['teachers', 'parents', 'both']

const texts = (page: IdeasPage): IdeasTexts => {
  const headline = page?.headline?.trim()
  return {
    navLabel: page?.navLabel?.trim() || IDEAS_DEFAULTS.navLabel,
    headline: headline || IDEAS_DEFAULTS.headline,
    // The default highlight belongs to the default headline.
    highlight: headline ? page?.highlight : IDEAS_DEFAULTS.highlight,
    intro: page?.intro?.trim() || IDEAS_DEFAULTS.intro,
    seo: page?.seo,
  }
}

async function load(preview: boolean): Promise<IdeasData> {
  // In preview nothing is cached and drafts are laid over published content. Otherwise the usual tagged fetch.
  const fetch = <T,>(query: string) =>
    preview && previewClient ? previewClient.fetch<T>(query, {}, { cache: 'no-store' }) : sanityFetch<T>(query)
  const page = await fetch<IdeasPage>(ideasPageQuery)
  // The one switch. Off means the section does not exist, and nothing else is fetched.
  if (!preview && page?.enabled !== true) return null
  const found = (await fetch<Article[] | null>(articlesQuery)) || []
  const articles = newestFirst(
    found
      // A draft in preview may not have its audience yet.
      .map((a) => ({ ...a, audience: AUDIENCES.includes(a.audience) ? a.audience : ('both' as const) }))
      // A Game block whose game is hidden or gone is left out here, once, for every page.
      .map((a) => ({ ...a, body: visibleBody(a.body as BodyBlock<Game>[] | null) as Article['body'] })),
  )
  return { texts: texts(page), articles, preview }
}

const loadLive = cache(() => load(false))
const loadPreview = cache(() => load(true))

/** The section for this request: null when it is off. In a preview browser it is always on, with drafts. */
export const loadIdeas = async (): Promise<IdeasData> => ((await isPreview()) ? loadPreview() : loadLive())

/** The section as the public sees it, whatever the request. For the sitemap and the build. */
export const loadPublicIdeas = (): Promise<IdeasData> => loadLive()

export function toCard(a: Article): IdeaCard {
  const audience = cardAudience(a.audience)
  const hasCover = !!(a.cover as { asset?: unknown } | null | undefined)?.asset
  return {
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    audience: a.audience,
    meta: [formatDate(a.publishedAt), `${readMinutes(a.body as BodyBlock[] | null)} min read`].filter(Boolean).join(' · '),
    cover: hasCover ? a.cover! : null,
    tiles: hasCover
      ? []
      : coverGames(a.body as BodyBlock<Game>[] | null).map((g) => {
          const r = resolve(g, audience)
          return { _id: r._id, image: r.image, icon: r.icon }
        }),
  }
}

/** For /teachers and /parents: the header link and the strip. Null when the section is off. */
export async function loadIdeasFor(audience: PageAudience): Promise<IdeasForPage> {
  const ideas = await loadIdeas()
  if (!ideas) return null
  const { navLabel } = ideas.texts
  return { navLabel, heading: ideasHeading(navLabel, audience), strip: stripArticles(ideas.articles, audience).map(toCard) }
}

/** The header link's label, or null when the section is off. */
export const loadIdeasLabel = async (): Promise<string | null> => (await loadIdeas())?.texts.navLabel ?? null
