import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import type { GameFacts, Resolved } from '@/lib/derive'

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
  shareUrl?: string
}

type Hero = { headline?: string; highlight?: string; subline?: string; seo?: Seo }

export type Settings = { mission?: string; footerLinks?: Link[] } | null

export type HomePage =
  | (Hero & {
      panels?: { persona: 'teachers' | 'parents'; eyebrow?: string; title?: string; text?: string; cta?: string }[]
    })
  | null

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

export type TeachersData = { page: TeachersPage; moments: Moment[] | null }
export type ParentsData = { page: ParentsPage; games: Game[] | null; whenOptions: Titled[] | null }
