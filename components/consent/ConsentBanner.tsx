'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { choose, closeSettings, focusAfterClose, initConsent, useConsent } from './store'
import { pageShown, type Choice, type TrackingTexts } from '@/lib/analytics'

/**
 * The cookie banner (round 14). It is on the page only while "Tracking and cookie banner" is switched on in Studio.
 *
 * It shows by itself until the visitor chooses, and again from "Cookie settings" in the footer, where it also says
 * what the choice is now. A browser that sends Global Privacy Control counts as having declined: the banner never
 * shows by itself there, and from "Cookie settings" it explains why and offers no Accept.
 *
 * It is not a dialog: it does not dim the page, trap focus or block scrolling. It sits first in the page, so it is
 * the first thing the Tab key reaches, and it stays usable while the welcome pop-up is open (see WelcomeDialog).
 */
export function ConsentBanner({ texts }: { texts: TrackingTexts }) {
  const { consent, settings } = useConsent()
  const ref = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => initConsent(), [])

  // Review mode only: one "$pageview" line in the console per page. On the real site PostHog counts pages itself.
  useEffect(() => pageShown(), [pathname, consent.capture])

  // Opened from "Cookie settings": focus moves to the banner. Opened by itself: focus is left alone.
  useEffect(() => {
    if (settings) ref.current?.focus({ preventScroll: true })
  }, [settings])

  if (consent.mode === 'off' || !(consent.banner || settings)) return null

  const close = () => {
    closeSettings()
    focusAfterClose()
  }
  const pick = (choice: Choice) => {
    const reopened = settings
    choose(choice)
    if (reopened || document.querySelector('.welcome')) focusAfterClose()
  }
  // In "Cookie settings" the current choice is filled and ticked; pressing it again keeps it and closes the banner.
  const current = settings ? consent.choice : null
  const button = (choice: Choice, label: string, ticked: string) => (
    <button type="button" aria-pressed={settings && current ? current === choice : undefined} onClick={() => (current === choice ? close() : pick(choice))}>
      {current === choice ? `✓ ${ticked}` : label}
    </button>
  )

  return (
    <section
      ref={ref}
      className="consent"
      aria-label="Cookies"
      tabIndex={-1}
      onKeyDown={(e) => {
        // Esc closes it only when it was opened from "Cookie settings". It never counts as a choice.
        if (e.key !== 'Escape' || !settings) return
        e.stopPropagation()
        close()
      }}
    >
      <p>
        {consent.gpc ? texts.gpcText : texts.text} <Link href="/privacy">Privacy policy</Link>
      </p>
      {consent.gpc ? (
        <div className="consent-actions">
          <button type="button" className="consent-close" onClick={close}>
            Close
          </button>
        </div>
      ) : (
        <>
          {current && <p className="consent-now">Your choice now: {current}.</p>}
          <div className="consent-actions">
            {button('accepted', texts.acceptLabel, 'Accepted')}
            {button('declined', texts.declineLabel, 'Declined')}
          </div>
        </>
      )}
    </section>
  )
}
