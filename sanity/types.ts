import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import type { GameFacts, ParentsSettings, TeachersSettings } from '@/lib/derive'

export type Link = { label: string; url: string }
export type Seo = { title?: string; description?: string }
export type Titled = { _id: string; title: string; order?: number }
export type SanityImage = SanityImageSource & { alt?: string }

/** The audience objects as the queries return them: overrides with image and skill references resolved. */
type AudienceRefs = { image?: SanityImage; icon?: SanityImage; skills?: Titled[] | null }

/** A game as the queries return it: shared facts plus the two audience objects, with references resolved. */
export type Game = Omit<GameFacts, 'image' | 'icon' | 'skills' | 'teachers' | 'parents'> & {
  _id: string
  image?: SanityImage
  icon?: SanityImage
  platforms?: string[] | null
  skills?: Titled[] | null
  teachers?: (TeachersSettings & AudienceRefs) | null
  parents?: (ParentsSettings & AudienceRefs & { when?: Titled[] | null }) | null
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

/** A moment with its games in the order set in Studio. */
export type Moment = { _id: string; title: string; blurb?: string; games?: Game[] | null }

export type TeachersData = { page: TeachersPage; moments: Moment[] | null }
export type ParentsData = { page: ParentsPage; games: Game[] | null; whenOptions: Titled[] | null }
