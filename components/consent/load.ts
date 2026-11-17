// Cookie banner (round 14): the one switch and the banner's texts. Server only (called by the layout and the 404 page).

import { cache } from 'react'
import { trackingTexts, type TrackingTexts } from '@/lib/analytics'
import { sanityFetch } from '@/sanity/client'
import { trackingQuery } from '@/sanity/queries'
import type { Tracking } from '@/sanity/types'

/**
 * The banner's texts, or null when tracking is off. On when "Turn on tracking and the cookie banner" is switched on
 * in Studio ("Tracking and cookie banner"). No document, or the switch not on, means off: no banner, no
 * "Cookie settings" link, no PostHog, and every page exactly as it was before this feature.
 *
 * Also on for Vercel preview deployments, so a pull request can be reviewed with `?analytics=debug` before the
 * switch is turned on. PostHog never runs there (lib/analytics: production hosts only), and without that
 * parameter a preview shows nothing of this feature.
 */
export const loadTracking = cache(async (): Promise<TrackingTexts | null> => {
  const doc = await sanityFetch<Tracking>(trackingQuery)
  const on = doc?.enabled === true || process.env.VERCEL_ENV === 'preview'
  return on ? trackingTexts(doc) : null
})
