// Analytics (round 14): the consent rules, the one `track()` function, and what each event carries.
//
// Nothing here runs until the cookie banner (components/consent) has an "accepted" choice for a visitor on
// the production domain. Until then `track()` does nothing, PostHog's code is not downloaded (it is a
// separate file, fetched only by `startAnalytics`), and no request goes to a PostHog address.
// Components call `track()`. None of them imports PostHog; this file is the only one that does.
//
// The top half touches nothing in the browser, so it is unit-tested directly (lib/analytics.test.mts).
//
// Adding Meta Pixel or Google tag later: load them in `startAnalytics` and switch them off in
// `stopAnalytics`, next to PostHog. Both already run only behind the same consent. See docs/STATUS.md.

import { AUDIENCE_COOKIE, type Audience } from './audience.ts'
import { siteName } from './site.ts'

// ---------------------------------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------------------------------

export const CONSENT_COOKIE = 'tg_consent'
/** 12 months, in seconds. */
export const CONSENT_MAX_AGE = 31536000
export type Choice = 'accepted' | 'declined'

/** PostHog runs on these hosts and nowhere else: not on *.vercel.app, previews or localhost. */
export const PRODUCTION_HOSTS = ['thinkinggames.com', 'www.thinkinggames.com']

/** Shown while the matching field of the "Tracking and cookie banner" document is empty. */
export const TRACKING_DEFAULTS = {
  text: 'We use cookies to see how this site is used and to measure our advertising. You can change your choice at any time.',
  acceptLabel: 'Accept',
  declineLabel: 'Decline',
  gpcText: 'Your browser asks websites not to track you (Global Privacy Control), so tracking is off.',
}
export type TrackingTexts = typeof TRACKING_DEFAULTS

/** The banner's texts, with the default wherever Studio has nothing (or only spaces). */
export const trackingTexts = (doc?: Partial<Record<keyof TrackingTexts, string | null>> | null): TrackingTexts => ({
  text: doc?.text?.trim() || TRACKING_DEFAULTS.text,
  acceptLabel: doc?.acceptLabel?.trim() || TRACKING_DEFAULTS.acceptLabel,
  declineLabel: doc?.declineLabel?.trim() || TRACKING_DEFAULTS.declineLabel,
  gpcText: doc?.gpcText?.trim() || TRACKING_DEFAULTS.gpcText,
})

/** One cookie's value from a `document.cookie` string, or null. */
export function cookieValue(cookies: string | null | undefined, name: string): string | null {
  for (const part of (cookies || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

export const isChoice = (v: unknown): v is Choice => v === 'accepted' || v === 'declined'

/** The `tg_consent` cookie as it is written: 12 months, whole site, SameSite=Lax. */
export const consentCookie = (choice: Choice) => `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax`

export const isProductionHost = (host: string | null | undefined) => PRODUCTION_HOSTS.includes((host || '').toLowerCase().replace(/\.$/, ''))

/**
 * The review switch in the address: `?analytics=debug` (banner shown, events written to the console, nothing sent),
 * `?analytics=debug-gpc` (the same, as a browser that sends Global Privacy Control) and `?analytics=off` (leave it).
 * Anything else, or no parameter, gives null.
 */
export type DebugFlag = 'debug' | 'debug-gpc' | 'off'
export function debugFlag(search: string | null | undefined): DebugFlag | null {
  const v = new URLSearchParams(search || '').get('analytics')
  return v === 'debug' || v === 'debug-gpc' || v === 'off' ? v : null
}

/**
 * `off`: the feature does not exist for this visitor (no banner, no "Cookie settings", nothing captured).
 * `live`: the production domain. `debug`: the review switch, on any other host; events go to the console only.
 */
export type Mode = 'off' | 'live' | 'debug'

export type Consent = {
  mode: Mode
  /** The browser sends Global Privacy Control: the visitor counts as having declined. */
  gpc: boolean
  /** What the `tg_consent` cookie holds. */
  choice: Choice | null
  /** The banner shows by itself: no choice yet, and no Global Privacy Control. */
  banner: boolean
  /** Events may be captured: the visitor accepted, and the browser does not send Global Privacy Control. */
  capture: boolean
}

export const NO_CONSENT: Consent = { mode: 'off', gpc: false, choice: null, banner: false, capture: false }

/**
 * Everything the banner and `track()` need to know, from four facts: the CMS switch, the host, the browser's
 * Global Privacy Control signal and the cookies. `debug` is the review switch; it is ignored on the production
 * domain, where tracking is real.
 */
export function consentState(input: { enabled: boolean; host: string; gpc?: unknown; cookies?: string | null; debug?: boolean }): Consent {
  if (!input.enabled) return NO_CONSENT
  const mode: Mode = isProductionHost(input.host) ? 'live' : input.debug ? 'debug' : 'off'
  if (mode === 'off') return NO_CONSENT
  const gpc = input.gpc === true
  const stored = cookieValue(input.cookies, CONSENT_COOKIE)
  const choice = isChoice(stored) ? stored : null
  return { mode, gpc, choice, banner: !gpc && choice === null, capture: !gpc && choice === 'accepted' }
}

// ---------------------------------------------------------------------------------------------------
// What each event carries
// ---------------------------------------------------------------------------------------------------

export type Persona = 'teacher' | 'parent'
export const toPersona = (audience: Audience): Persona => (audience === 'teachers' ? 'teacher' : 'parent')

/** The persona from the `tg_audience` cookie, or null when the visitor has not chosen. */
export function personaFromCookies(cookies: string | null | undefined): Persona | null {
  const v = cookieValue(cookies, AUDIENCE_COOKIE)
  return v === 'teachers' || v === 'parents' ? toPersona(v) : null
}

export type Props = Record<string, string | number | boolean | null | undefined>
export type Sent = Record<string, string | number | boolean>

/** A property with no value is left out, not sent empty. `false` and 0 are values. */
export function clean(props: Props): Sent {
  const out: Sent = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) continue
    if (typeof v === 'string' && !v.trim()) continue
    out[k] = v
  }
  return out
}

export type Surface = 'library' | 'moment' | 'search' | 'saved_list' | 'article'

/** Where a game card sits. `position` is its 1-based place in its list. */
export type CardWhere = { audience: Audience; surface: Surface; moment?: string; article?: string; position?: number }

type TrackedGame = { _id: string; name: string; url?: string | null; site?: string | null }

/** `card_clicked`: a game's outbound button. `program` is the site name shown on the card ("PBS KIDS"). */
export const cardClicked = (game: TrackedGame, where: CardWhere): Sent =>
  clean({
    program: siteName(game),
    game: game.name,
    game_id: game._id,
    persona: toPersona(where.audience),
    external_url: game.url,
    surface: where.surface,
    moment: where.moment,
    article: where.article,
    position: where.position,
  })

/** `game_saved`: "+ Save" on a card. */
export const gameSaved = (game: TrackedGame, where: CardWhere): Sent =>
  clean({ game: game.name, game_id: game._id, program: siteName(game), persona: toPersona(where.audience), surface: where.surface })

/** `search_performed`: the query as it is sent (trimmed, lower case, 60 characters at most), or null when it is too short to send. */
export function searchQuery(raw: string | null | undefined): string | null {
  const q = (raw || '').trim().toLowerCase().slice(0, 60).trim()
  return q.length >= 2 ? q : null
}

/** These leave the site in a new tab. They are sent with the beacon transport, so they are not lost if the page closes. */
export const OUTBOUND_EVENTS = new Set(['card_clicked', 'challenge_clicked', 'brand_clicked'])

/** On every event: which site this is (the old WordPress site sent none) and the visitor's persona, when they have chosen. */
export const superProps = (cookies: string | null | undefined): Sent => clean({ site_version: 'next', persona: personaFromCookies(cookies) })

// ---------------------------------------------------------------------------------------------------
// track(), and PostHog behind it. Browser only from here on.
// ---------------------------------------------------------------------------------------------------

const POSTHOG_KEY = 'phc_LrAZrSULeHwpYvoRLOSNTDsiapKwT5yhy5dGZWVJb7E'

/** Where events go once tracking has started. Null = tracking is off, and `track()` does nothing. */
type Sink = {
  capture(name: string, props: Sent, beacon: boolean): void
  /** The visitor's persona changed (or is now known). */
  register(props: Sent): void
  /** A page was shown. Only the console sink uses it: PostHog counts pages by itself. */
  page(): void
}
let sink: Sink | null = null
const onStart = new Set<() => void>()

export const isTracking = () => sink !== null

/**
 * Send an event. Does nothing unless the visitor has accepted cookies on the production domain
 * (or, in the review mode, writes to the console and sends nothing).
 */
export function track(name: string, props: Props = {}): void {
  if (!sink) return
  sink.register(superProps(document.cookie))
  sink.capture(name, clean(props), OUTBOUND_EVENTS.has(name))
}

/**
 * Run `fn` now if tracking is on, and again whenever it is switched on (the visitor accepts cookies).
 * For events about something that is already on screen, such as the welcome pop-up. Returns the way to stop listening.
 */
export function whenTracking(fn: () => void): () => void {
  onStart.add(fn)
  if (sink) fn()
  return () => void onStart.delete(fn)
}

/** For the console sink only: a page was shown (first load, or a move between pages). */
export function pageShown(): void {
  sink?.page()
}

// PostHog's own names. Removed when a visitor declines.
const PH_PREFIXES = ['ph_', '__ph_', 'dmn_chk_', 'seenSurvey_', 'inProgressSurvey_', 'lastSeenSurveyDate', '_postHogToolbarParams']
const isPostHogName = (name: string) => PH_PREFIXES.some((p) => name.startsWith(p))

/** The cookie domains PostHog may have used: this host and each parent ("www.thinkinggames.com", ".thinkinggames.com"). */
function cookieDomains(host: string): string[] {
  const parts = host.split('.')
  const out = ['', host]
  for (let i = 0; i < parts.length - 1; i++) out.push('.' + parts.slice(i).join('.'))
  return out
}

/** Remove every cookie and stored value PostHog keeps in this browser. */
export function clearPostHogStorage(): void {
  try {
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0].trim()
      if (!name || !isPostHogName(name)) continue
      for (const domain of cookieDomains(window.location.hostname))
        document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`
    }
  } catch {
    // Cookies are blocked: there is nothing to remove.
  }
  for (const pick of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const store = pick()
      const names: string[] = []
      for (let i = 0; i < store.length; i++) names.push(store.key(i) || '')
      names.filter(isPostHogName).forEach((n) => store.removeItem(n))
    } catch {
      // Storage is blocked: there is nothing to remove.
    }
  }
}

type PostHog = typeof import('posthog-js').default
// PostHog's library, once it has been started on this page. It cannot be unloaded, so a visitor who declines
// after accepting gets it switched off (PH_OFF), and switched on again if they accept once more.
let posthog: PostHog | null = null
let stoppedAt: string | null = null

// Switched off: a visitor who has not opted in counts as opted out, and nothing is kept in the browser.
const PH_OFF = { opt_out_capturing_by_default: true, opt_out_persistence_by_default: true, disable_persistence: true }
const PH_ON = { opt_out_capturing_by_default: false, opt_out_persistence_by_default: false, disable_persistence: false }

function posthogSink(): Sink {
  // Events that arrive while the library is downloading wait here, in order.
  let waiting: ((ph: PostHog) => void)[] | null = []
  const run = (fn: (ph: PostHog) => void) => (waiting ? waiting.push(fn) : fn(posthog!))
  const self: Sink = {
    capture: (name, props, beacon) => run((ph) => ph.capture(name, props, beacon ? { transport: 'sendBeacon' } : undefined)),
    register: (props) =>
      run((ph) => {
        ph.register(props)
        if (!('persona' in props)) ph.unregister('persona')
      }),
    page: () => {},
  }
  // The only place PostHog's code is asked for. It is its own file, so nothing of it is downloaded before this line runs.
  import('posthog-js').then(
    ({ default: ph }) => {
      // Declined while it was downloading: it is not started.
      if (sink !== self) return
      if (!posthog) {
        ph.init(POSTHOG_KEY, {
          api_host: 'https://us.i.posthog.com',
          defaults: '2026-05-30',
          person_profiles: 'identified_only',
          disable_session_recording: true,
          // Before the first event, so the first $pageview already carries them.
          loaded: (instance) => instance.register(superProps(document.cookie)),
          // One $pageview per page. Choosing "parent" in the welcome pop-up changes the address from / to /parents
          // without showing another page, and PostHog would count that as a second view. A page that replaces
          // the address is the same page; a move to another page adds to the history and is still counted.
          before_send: (event) => (event?.event === '$pageview' && event.properties?.navigation_type === 'replaceState' ? null : event),
        })
        posthog = ph
      } else {
        // Accepted again after declining on this page.
        ph.set_config(PH_ON)
        ph.register(superProps(document.cookie))
        // PostHog counts pages as the address changes. One it missed while switched off is counted now.
        if (stoppedAt !== null && stoppedAt !== window.location.pathname) ph.capture('$pageview')
      }
      stoppedAt = null
      const queued = waiting || []
      waiting = null
      queued.forEach((fn) => fn(ph))
    },
    () => {
      // The download failed (offline, or blocked by the browser). Tracking stays off on this page.
      if (sink === self) sink = null
    },
  )
  return self
}

/** The review mode: every event is written to the console with what it would carry. Nothing is sent anywhere. */
function consoleSink(): Sink {
  let supers: Sent = superProps(document.cookie)
  const log = (name: string, props: Sent, note = '') => console.log(`[analytics debug] ${name}${note}`, { ...supers, ...props })
  let lastPath: string | null = null
  const self: Sink = {
    capture: (name, props, beacon) => log(name, props, beacon ? ' (beacon)' : ''),
    register: (props) => void (supers = props),
    page: () => {
      // One per page: a change of the query or the hash is the same page.
      if (window.location.pathname === lastPath) return
      lastPath = window.location.pathname
      log('$pageview', { $pathname: lastPath })
    },
  }
  console.log('[analytics debug] started. Events are written here and nothing is sent to PostHog.')
  return self
}

/** The visitor accepted. PostHog is downloaded and started (or, in the review mode, the console takes its place). */
export function startAnalytics(mode: Exclude<Mode, 'off'>): void {
  if (sink) return
  sink = mode === 'live' ? posthogSink() : consoleSink()
  if (mode === 'debug') sink.page()
  onStart.forEach((fn) => fn())
}

/** The visitor declined (or sends Global Privacy Control): capturing stops and PostHog's cookies and stored values are removed. */
export function stopAnalytics(): void {
  const wasOn = sink !== null
  sink = null
  if (posthog) {
    if (wasOn) stoppedAt = window.location.pathname
    posthog.set_config(PH_OFF)
  }
  clearPostHogStorage()
}
