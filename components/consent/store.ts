'use client'

// Cookie banner (round 14): the visitor's consent, as the banner, the "Cookie settings" link and lib/analytics see it.
// It is worked out once the banner has loaded in the browser (the server knows neither the host nor the cookie),
// so until then, and whenever the feature is switched off, it is "off" and nothing shows.

import { useSyncExternalStore } from 'react'
import {
  NO_CONSENT,
  clearPostHogStorage,
  consentCookie,
  consentState,
  debugFlag,
  startAnalytics,
  stopAnalytics,
  type Choice,
  type Consent,
} from '@/lib/analytics'

/** `settings` is true while the banner is open because the visitor pressed "Cookie settings". */
export type ConsentView = { consent: Consent; settings: boolean }

const OFF: ConsentView = { consent: NO_CONSENT, settings: false }
// The review switch (?analytics=debug) is remembered for the tab, so it survives a move to another page.
const DEBUG_KEY = 'tg_analytics_debug'

let view: ConsentView = OFF
let started = false
// The "Cookie settings" button that opened the banner, so focus can go back to it.
let opener: HTMLElement | null = null
const listeners = new Set<() => void>()

function set(next: ConsentView) {
  view = next
  listeners.forEach((fn) => fn())
}

/** `debug`, `debug-gpc` or null. Read from the address first, then from this tab's memory. */
function reviewMode(): 'debug' | 'debug-gpc' | null {
  const flag = debugFlag(window.location.search)
  try {
    if (flag === 'off') window.sessionStorage.removeItem(DEBUG_KEY)
    else if (flag) window.sessionStorage.setItem(DEBUG_KEY, flag)
    const kept = window.sessionStorage.getItem(DEBUG_KEY)
    return kept === 'debug' || kept === 'debug-gpc' ? kept : null
  } catch {
    return flag === 'debug' || flag === 'debug-gpc' ? flag : null
  }
}

function read(): Consent {
  const review = reviewMode()
  return consentState({
    enabled: true,
    host: window.location.hostname,
    gpc: (navigator as { globalPrivacyControl?: unknown }).globalPrivacyControl === true || review === 'debug-gpc',
    cookies: document.cookie,
    debug: review !== null,
  })
}

/** Called by the banner when it loads: only then is the feature on. Starts tracking for a visitor who already accepted. */
export function initConsent() {
  if (started) return
  started = true
  const consent = read()
  set({ consent, settings: false })
  if (consent.mode === 'off') return
  if (consent.capture) startAnalytics(consent.mode)
  // Declined, or Global Privacy Control: anything PostHog left in this browser earlier (the old site used it too) goes.
  else if (consent.gpc || consent.choice === 'declined') clearPostHogStorage()
}

/** Accept or Decline. Kept for 12 months in the `tg_consent` cookie. */
export function choose(choice: Choice) {
  if (view.consent.mode === 'off' || view.consent.gpc) return
  document.cookie = consentCookie(choice)
  const consent = read()
  set({ consent, settings: false })
  if (consent.mode !== 'off' && consent.capture) startAnalytics(consent.mode)
  else stopAnalytics()
}

/** "Cookie settings" in the footer: the banner opens again, showing the current choice. */
export function openSettings(from?: HTMLElement | null) {
  if (view.consent.mode === 'off') return
  opener = from || null
  set({ ...view, settings: true })
}

export function closeSettings() {
  if (view.settings) set({ ...view, settings: false })
}

/** Where focus goes when the banner closes: back to "Cookie settings", or to the welcome pop-up if it is open. */
export function focusAfterClose() {
  const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('.welcome')
  opener = null
  requestAnimationFrame(() => target?.focus({ preventScroll: true }))
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** The consent view. On the server and during hydration it is "off". */
export const useConsent = (): ConsentView =>
  useSyncExternalStore(
    subscribe,
    () => view,
    () => OFF,
  )
