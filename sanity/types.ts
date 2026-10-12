import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import type { GameFacts } from '@/lib/derive'

export type Link = { label: string; url: string }
export type Seo = { title?: string; description?: string }
export type Titled = { _id: string; title: string; order?: number }
export type SanityImage = SanityImageSource & { alt?: string }

/** A game as the queries return it: facts plus resolved skill and when references. */
export type Game = GameFacts & {
  _id: string
  subtitle?: string
  url?: string
  image?: SanityImage
  icon?: SanityImage
  platforms?: string[] | null
  skills?: Titled[] | null
  when?: Titled[] | null
}

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
