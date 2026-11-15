// Saved list (test, round 8): the switch, and the games the drawer may need. Server only (called by the pages).

import { groq } from 'next-sanity'
import { sanityFetch } from '@/sanity/client'
import type { SanityImage } from '@/sanity/types'

/** A game with its shared values, for a saved game that the current page does not list. */
export type SavedGame = {
  _id: string
  name: string
  subtitle?: string | null
  url?: string | null
  site?: string | null
  image?: SanityImage | null
  icon?: SanityImage | null
}

/** What a page passes to its view: null when the feature is off, the games when it is on. */
export type SavedListData = { games: SavedGame[] } | null

const switchQuery = groq`*[_type == "siteSettings"][0].savedList`

// Every game a visitor can see on either page.
const gamesQuery = groq`*[_type == "game" && hidden != true && (teachers.show == true || parents.show == true)]{
  _id, name, subtitle, url, site, image, icon
}`

/**
 * On when "Saved list (test)" is switched on in Site settings, and always on Vercel preview deployments,
 * so it can be tried on a pull request's preview URL without touching production. Missing or false = off.
 * When off, nothing else is fetched and the pages render exactly as they did before this feature.
 */
export async function loadSavedList(): Promise<SavedListData> {
  const on = process.env.VERCEL_ENV === 'preview' || (await sanityFetch<boolean | null>(switchQuery)) === true
  if (!on) return null
  return { games: (await sanityFetch<SavedGame[] | null>(gamesQuery)) || [] }
}
