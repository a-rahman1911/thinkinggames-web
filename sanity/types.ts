import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

export type Link = { label: string; url: string }
export type Seo = { title?: string; description?: string }
export type FilterOption = { _id: string; group: string; label: string }

export type Game = {
  _id: string
  name: string
  tagline?: string
  builds?: string
  badges?: string[]
  url?: string
  image?: SanityImageSource & { alt?: string }
  filters?: FilterOption[] | null
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

export type Moment = { _id: string; title: string; blurb?: string; games?: (Game | null)[] | null }

export type TeachersData = { page: TeachersPage; moments: Moment[]; options: FilterOption[] }
export type ParentsData = { page: ParentsPage; games: Game[]; options: FilterOption[] }
