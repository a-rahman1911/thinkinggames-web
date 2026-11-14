import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SITE_NAMES, siteFromUrl, siteName } from './site.ts'

test('each known host gives its site name', () => {
  const expected: Record<string, string> = {
    'playmath.org': 'PlayMath',
    'pbskids.org': 'PBS KIDS',
    'beastacademy.com': 'Beast Academy',
    'inkwellgames.com': 'Inkwell Games',
    'couchgames.com': 'CouchGames',
    'superweird.io': 'SuperWEIRD',
    'starstuffedu.org': 'Star Stuff',
    'thinkygames.com': 'Thinky Games',
  }
  assert.deepEqual(SITE_NAMES, expected)
  for (const [host, name] of Object.entries(expected)) assert.equal(siteFromUrl(`https://${host}/games/some-game?x=1`), name)
})

test('a leading www. is ignored', () => {
  assert.equal(siteFromUrl('https://www.starstuffedu.org/play'), 'Star Stuff')
  assert.equal(siteFromUrl('https://WWW.PBSKids.org/games'), 'PBS KIDS')
})

test('a subdomain matches on the end of the host', () => {
  assert.equal(siteFromUrl('https://edu.superweird.io/'), 'SuperWEIRD')
  assert.equal(siteFromUrl('https://www.play.beastacademy.com/x'), 'Beast Academy')
})

test('an unknown host gives no name, including one that only ends with the same letters', () => {
  assert.equal(siteFromUrl('https://example.com/game'), null)
  assert.equal(siteFromUrl('https://notpbskids.org/game'), null)
  assert.equal(siteFromUrl('https://pbskids.org.example.com/game'), null)
})

test('a missing or broken URL gives no name', () => {
  assert.equal(siteFromUrl(undefined), null)
  assert.equal(siteFromUrl(null), null)
  assert.equal(siteFromUrl(''), null)
  assert.equal(siteFromUrl('not a url'), null)
  assert.equal(siteName({}), null)
})

test('the site field wins over the host; an empty field falls back to the host', () => {
  assert.equal(siteName({ site: 'Math Playground', url: 'https://pbskids.org/games/x' }), 'Math Playground')
  assert.equal(siteName({ site: ' Math Playground ', url: null }), 'Math Playground')
  assert.equal(siteName({ site: '', url: 'https://pbskids.org/games/x' }), 'PBS KIDS')
  assert.equal(siteName({ site: '   ', url: 'https://pbskids.org/games/x' }), 'PBS KIDS')
  assert.equal(siteName({ site: null, url: 'https://example.com' }), null)
})
