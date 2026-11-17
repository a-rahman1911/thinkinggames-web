'use client'

import { openSettings, useConsent } from './store'

/**
 * "Cookie settings", the last item in the footer's links. It reopens the cookie banner so the choice can be changed.
 * It renders nothing where the banner cannot run (the feature is off, or the host is not the production domain).
 */
export function CookieSettings() {
  const { consent } = useConsent()
  if (consent.mode === 'off') return null
  return (
    <button type="button" onClick={(e) => openSettings(e.currentTarget)}>
      Cookie settings
    </button>
  )
}
