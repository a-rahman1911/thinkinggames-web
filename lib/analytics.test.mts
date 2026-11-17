import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CONSENT_COOKIE,
  NO_CONSENT,
  OUTBOUND_EVENTS,
  TRACKING_DEFAULTS,
  cardClicked,
  clean,
  consentCookie,
  consentState,
  cookieValue,
  debugFlag,
  gameSaved,
  isProductionHost,
  isTracking,
  personaFromCookies,
  searchQuery,
  superProps,
  toPersona,
  track,
  trackingTexts,
  whenTracking,
} from './analytics.ts'

const PROD = 'thinkinggames.com'

// ---- track() without consent ----

test('track: does nothing until tracking has been started', () => {
  // This runs in Node, where there is no document, window or PostHog: any attempt to touch them would throw.
  assert.equal(isTracking(), false)
  assert.doesNotThrow(() => track('card_clicked', { program: 'PBS KIDS' }))
  assert.doesNotThrow(() => track('welcome_popup_shown'))
  assert.equal(isTracking(), false)
})

test('whenTracking: the callback is not run while tracking is off', () => {
  let runs = 0
  const stop = whenTracking(() => runs++)
  assert.equal(runs, 0)
  stop()
})

// ---- consent state ----

test('consentState: switch off means off, whatever else is true', () => {
  for (const host of [PROD, 'www.thinkinggames.com', 'localhost'])
    assert.deepEqual(consentState({ enabled: false, host, cookies: 'tg_consent=accepted', debug: true }), NO_CONSENT)
})

test('consentState: on the production domain, no choice yet shows the banner and captures nothing', () => {
  for (const host of [PROD, 'www.thinkinggames.com', 'WWW.ThinkingGames.com'])
    assert.deepEqual(consentState({ enabled: true, host, cookies: '' }), { mode: 'live', gpc: false, choice: null, banner: true, capture: false })
})

test('consentState: accepted captures, declined does not, and neither shows the banner', () => {
  assert.deepEqual(consentState({ enabled: true, host: PROD, cookies: 'tg_audience=teachers; tg_consent=accepted' }), {
    mode: 'live',
    gpc: false,
    choice: 'accepted',
    banner: false,
    capture: true,
  })
  assert.deepEqual(consentState({ enabled: true, host: PROD, cookies: 'tg_consent=declined' }), {
    mode: 'live',
    gpc: false,
    choice: 'declined',
    banner: false,
    capture: false,
  })
})

test('consentState: a cookie with any other value is no choice', () => {
  for (const cookies of ['tg_consent=yes', 'tg_consent=', 'tg_consent=ACCEPTED', 'xtg_consent=accepted', 'tg_consent_old=accepted'])
    assert.equal(consentState({ enabled: true, host: PROD, cookies }).choice, null, cookies)
})

test('consentState: Global Privacy Control counts as declined, with no banner, even after an earlier accept', () => {
  for (const cookies of ['', 'tg_consent=accepted', 'tg_consent=declined']) {
    const c = consentState({ enabled: true, host: PROD, gpc: true, cookies })
    assert.equal(c.gpc, true)
    assert.equal(c.banner, false)
    assert.equal(c.capture, false)
  }
  // Only the browser's own `true` counts.
  for (const gpc of [undefined, null, false, 'true', 1, '1'])
    assert.equal(consentState({ enabled: true, host: PROD, gpc, cookies: 'tg_consent=accepted' }).capture, true)
})

test('consentState: off on every host but the production domain', () => {
  for (const host of ['thinkinggames-web.vercel.app', 'thinkinggames-web-git-x.vercel.app', 'localhost', '127.0.0.1', 'staging.thinkinggames.com', 'thinkinggames.com.evil.example', 'notthinkinggames.com', ''])
    assert.deepEqual(consentState({ enabled: true, host, cookies: 'tg_consent=accepted' }), NO_CONSENT, host)
})

test('consentState: the review switch works off production, and is ignored on production', () => {
  assert.deepEqual(consentState({ enabled: true, host: 'thinkinggames-web.vercel.app', cookies: '', debug: true }), {
    mode: 'debug',
    gpc: false,
    choice: null,
    banner: true,
    capture: false,
  })
  assert.equal(consentState({ enabled: true, host: 'localhost', cookies: 'tg_consent=accepted', debug: true }).capture, true)
  assert.equal(consentState({ enabled: true, host: PROD, cookies: '', debug: true }).mode, 'live')
})

test('isProductionHost', () => {
  assert.equal(isProductionHost('thinkinggames.com'), true)
  assert.equal(isProductionHost('www.thinkinggames.com'), true)
  assert.equal(isProductionHost('www.thinkinggames.com.'), true)
  assert.equal(isProductionHost('thinkinggames-web.vercel.app'), false)
  assert.equal(isProductionHost(undefined), false)
})

test('cookieValue: one cookie out of a document.cookie string', () => {
  assert.equal(cookieValue('a=1; tg_consent=accepted; b=2', CONSENT_COOKIE), 'accepted')
  assert.equal(cookieValue('tg_consent=declined', CONSENT_COOKIE), 'declined')
  assert.equal(cookieValue('a=1', CONSENT_COOKIE), null)
  assert.equal(cookieValue('', CONSENT_COOKIE), null)
  assert.equal(cookieValue(null, CONSENT_COOKIE), null)
})

test('consentCookie: 12 months, whole site, SameSite=Lax', () => {
  assert.equal(consentCookie('accepted'), 'tg_consent=accepted; Max-Age=31536000; Path=/; SameSite=Lax')
  assert.equal(consentCookie('declined'), 'tg_consent=declined; Max-Age=31536000; Path=/; SameSite=Lax')
})

test('debugFlag: the review switch in the address', () => {
  assert.equal(debugFlag('?analytics=debug'), 'debug')
  assert.equal(debugFlag('?list=a,b&analytics=debug-gpc'), 'debug-gpc')
  assert.equal(debugFlag('?analytics=off'), 'off')
  for (const s of ['', '?analytics=', '?analytics=1', '?debug=1', null, undefined]) assert.equal(debugFlag(s), null)
})

test('trackingTexts: the default wherever Studio has nothing', () => {
  assert.deepEqual(trackingTexts(null), TRACKING_DEFAULTS)
  assert.deepEqual(trackingTexts({ text: '  ', acceptLabel: null }), TRACKING_DEFAULTS)
  assert.deepEqual(trackingTexts({ text: 'Cookies?', acceptLabel: ' Yes ', declineLabel: 'No', gpcText: 'Off.' }), {
    text: 'Cookies?',
    acceptLabel: 'Yes',
    declineLabel: 'No',
    gpcText: 'Off.',
  })
})

// ---- what events carry ----

test('clean: a property with no value is left out; false and 0 are values', () => {
  assert.deepEqual(clean({ a: 'x', b: undefined, c: null, d: '', e: '  ', f: false, g: 0, h: NaN }), { a: 'x', f: false, g: 0 })
})

test('persona: teacher or parent, from the page or from the tg_audience cookie', () => {
  assert.equal(toPersona('teachers'), 'teacher')
  assert.equal(toPersona('parents'), 'parent')
  assert.equal(personaFromCookies('tg_audience=teachers'), 'teacher')
  assert.equal(personaFromCookies('x=1; tg_audience=parents'), 'parent')
  assert.equal(personaFromCookies('tg_audience=kids'), null)
  assert.equal(personaFromCookies(''), null)
})

test('superProps: site_version on every event, persona once the visitor has chosen', () => {
  assert.deepEqual(superProps(''), { site_version: 'next' })
  assert.deepEqual(superProps('tg_audience=teachers; tg_consent=accepted'), { site_version: 'next', persona: 'teacher' })
})

const game = { _id: 'game-down-the-tubes', name: 'Down the Tubes', url: 'https://pbskids.org/games/down-the-tubes', site: null }

test('cardClicked: in a Teachers moment', () => {
  assert.deepEqual(cardClicked(game, { audience: 'teachers', surface: 'moment', moment: 'Morning warm-up', position: 3 }), {
    program: 'PBS KIDS',
    game: 'Down the Tubes',
    game_id: 'game-down-the-tubes',
    persona: 'teacher',
    external_url: 'https://pbskids.org/games/down-the-tubes',
    surface: 'moment',
    moment: 'Morning warm-up',
    position: 3,
  })
})

test('cardClicked: in the Parents library and in an article; what does not apply is left out', () => {
  assert.deepEqual(cardClicked(game, { audience: 'parents', surface: 'library', position: 1 }), {
    program: 'PBS KIDS',
    game: 'Down the Tubes',
    game_id: 'game-down-the-tubes',
    persona: 'parent',
    external_url: 'https://pbskids.org/games/down-the-tubes',
    surface: 'library',
    position: 1,
  })
  const inArticle = cardClicked(game, { audience: 'parents', surface: 'article', article: 'rainy-day-games', position: 2 })
  assert.equal(inArticle.article, 'rainy-day-games')
  assert.equal('moment' in inArticle, false)
})

test('cardClicked: program is the game\'s own site name when it has one, and is left out when none is known', () => {
  assert.equal(cardClicked({ ...game, site: 'PBS KIDS Games' }, { audience: 'parents', surface: 'library' }).program, 'PBS KIDS Games')
  const unknown = cardClicked({ _id: 'g', name: 'G', url: 'https://example.org/g' }, { audience: 'parents', surface: 'saved_list', position: 1 })
  assert.equal('program' in unknown, false)
  assert.equal(unknown.surface, 'saved_list')
})

test('gameSaved', () => {
  assert.deepEqual(gameSaved(game, { audience: 'teachers', surface: 'search', position: 4 }), {
    game: 'Down the Tubes',
    game_id: 'game-down-the-tubes',
    program: 'PBS KIDS',
    persona: 'teacher',
    surface: 'search',
  })
})

test('searchQuery: trimmed, lower case, 60 characters at most, and nothing under 2 characters', () => {
  assert.equal(searchQuery('  Sum Blocks '), 'sum blocks')
  assert.equal(searchQuery('ab'), 'ab')
  for (const q of ['', ' ', 'a', ' a ', null, undefined]) assert.equal(searchQuery(q), null)
  assert.equal(searchQuery('x'.repeat(80))!.length, 60)
  // A cut that lands after a space leaves no trailing space.
  assert.equal(searchQuery('a'.repeat(59) + ' b'), 'a'.repeat(59))
})

test('outbound events use the beacon transport', () => {
  assert.deepEqual([...OUTBOUND_EVENTS].sort(), ['brand_clicked', 'card_clicked', 'challenge_clicked'])
})
