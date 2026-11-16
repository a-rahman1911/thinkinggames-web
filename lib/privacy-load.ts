// Privacy policy (round 13). Server only (called by the page and the sitemap).

import { cache } from 'react'
import { hasText } from '@/lib/privacy'
import { sanityFetch } from '@/sanity/client'
import { privacyPageQuery } from '@/sanity/queries'
import type { PrivacyPage } from '@/sanity/types'

/** The page, or null when it does not exist: no document, or a body with no text. */
export const loadPrivacy = cache(async (): Promise<NonNullable<PrivacyPage> | null> => {
  const page = await sanityFetch<PrivacyPage>(privacyPageQuery)
  return page && hasText(page.body) ? page : null
})
