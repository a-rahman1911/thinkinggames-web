import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import type { PortableTextBlock } from 'next-sanity'
import type { GameFacts, Resolved } from '@/lib/derive'
import type { IdeaAudience } from '@/lib/ideas'

export type Link = { label: string; url: string }
export type Seo = { title?: string; description?: string }
export type Titled = { _id: string; title: string; order?: number }
export type SanityImage = SanityImageSource & { alt?: string }

/** A game as the queries return it: shared facts, the teachers{} and parents{} objects, and dereferenced skills and when. */
export type Game = GameFacts<SanityImage> & { _id: string; platforms?: string[] | null }

/** A game seen by one audience, after lib/derive resolve(). The views only ever hold these. */
export type AudienceGame = Resolved<Game>

export type Challenge = {
  show?: boolean
  eyebrow?: string
  title?: string
  text?: string
  buttons?: Link[]
}

type Hero = { headline?: string; highlight?: string; subline?: string; seo?: Seo }

export type Settings = { missionLabel?: string; mission?: string; missionHighlight?: string; footerLinks?: Link[] } | null

/** The welcome pop-up on `/` (the "homePage" document). */
export type WelcomePopup = {
  enabled?: boolean
  label?: string
  headline?: string
  highlight?: string
  subline?: string
  panels?: { persona: 'teachers' | 'parents'; eyebrow?: string; title?: string; cta?: string }[]
  note?: string
} | null

export type TeachersPage =
  | (Hero & {
      searchPlaceholder?: string
      challenge?: Challenge
      momentsHeading?: string
      momentsSub?: string
      defaultOpen?: number
    })
  | null

export type ParentsPage = (Hero & { challenge?: Challenge; searchPlaceholder?: string; emptyText?: string }) | null

export type Moment = { _id: string; title: string; blurb?: string; games?: Game[] | null }

export type Brand = { _id: string; name: string; url: string; logo?: SanityImage | null }

export type TeachersData = { page: TeachersPage; moments: Moment[] | null; brands: Brand[] | null }
export type ParentsData = { page: ParentsPage; games: Game[] | null; skills: Titled[] | null; brands: Brand[] | null }

// ---- Ideas (round 11) ----
/** The "Ideas section" document: the switch and the texts of /ideas. */
export type IdeasPage = { enabled?: boolean; navLabel?: string; headline?: string; highlight?: string; intro?: string; seo?: Seo } | null

export type GameCardBlock = { _type: 'gameCard'; _key: string; game?: Game | null }
export type TipBlock = { _type: 'tip'; _key: string; label?: string; text?: string }
export type QuoteBlock = { _type: 'quote'; _key: string; text?: string; source?: string }
export type PictureBlock = SanityImage & { _type: 'picture'; _key: string; caption?: string }
export type ArticleBlock = PortableTextBlock | GameCardBlock | TipBlock | QuoteBlock | PictureBlock

/** An article as articlesQuery returns it. */
export type Article = {
  _id: string
  _createdAt: string
  _updatedAt: string
  title: string
  slug: string
  audience: IdeaAudience
  summary?: string
  cover?: SanityImage | null
  author?: string
  publishedAt?: string
  seo?: Seo
  body?: ArticleBlock[] | null
}

// ---- Privacy policy (round 13) ----
/** The "Privacy policy" document: the text of /privacy. */
export type PrivacyPage = { _updatedAt?: string; title?: string; updated?: string; body?: PortableTextBlock[] | null; seo?: Seo } | null
