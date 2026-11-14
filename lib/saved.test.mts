import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_LINK, cleanIds, countLabel, knownIds, listText, listUrl, mergeIds, parseListParam, parseStored, toggleId } from './saved.ts'

test('the stored value is a JSON array of ids; anything else is an empty list', () => {
  assert.deepEqual(parseStored('["game-a","game-b"]'), ['game-a', 'game-b'])
  assert.deepEqual(parseStored(null), [])
  assert.deepEqual(parseStored(''), [])
  assert.deepEqual(parseStored('not json'), [])
  assert.deepEqual(parseStored('{"a":1}'), [])
  assert.deepEqual(parseStored('"game-a"'), [])
})

test('invalid and repeated ids are dropped, order is kept', () => {
  assert.deepEqual(cleanIds(['game-b', 'game-a', 'game-b', 7, null, '', 'has space', '<script>', 'ok_1.x']), ['game-b', 'game-a', 'ok_1.x'])
  assert.deepEqual(cleanIds('game-a'), [])
})

test('a ?list= value is comma-separated and capped at 30', () => {
  assert.deepEqual(parseListParam('game-a,game-b, game-c,,game-a'), ['game-a', 'game-b', 'game-c'])
  assert.deepEqual(parseListParam(null), [])
  assert.deepEqual(parseListParam(''), [])
  const many = Array.from({ length: 40 }, (_, i) => `game-${i}`)
  assert.equal(parseListParam(many.join(',')).length, MAX_LINK)
  assert.equal(MAX_LINK, 30)
})

test('toggle adds at the end and removes', () => {
  assert.deepEqual(toggleId(['a'], 'b'), ['a', 'b'])
  assert.deepEqual(toggleId(['a', 'b'], 'a'), ['b'])
})

test('merge keeps the saved order and adds only what is missing', () => {
  assert.deepEqual(mergeIds(['a', 'b'], ['b', 'c', 'a', 'd']), ['a', 'b', 'c', 'd'])
})

test('ids that match no game are dropped', () => {
  const games = new Set(['a', 'c'])
  assert.deepEqual(knownIds(['a', 'b', 'c'], (id) => games.has(id)), ['a', 'c'])
})

test('counts read naturally', () => {
  assert.equal(countLabel(1), '1 game')
  assert.equal(countLabel(3), '3 games')
  assert.equal(countLabel(1, 'saved game'), '1 saved game')
  assert.equal(countLabel(3, 'saved game'), '3 saved games')
})

test('the link is for the page the visitor is on and holds at most 30 games', () => {
  assert.equal(listUrl('https://thinkinggames.com', 'teachers', ['game-a', 'game-b']), 'https://thinkinggames.com/teachers?list=game-a,game-b')
  assert.equal(listUrl('https://thinkinggames.com/', 'parents', ['game-a']), 'https://thinkinggames.com/parents?list=game-a')
  const many = Array.from({ length: 40 }, (_, i) => `game-${i}`)
  const url = listUrl('https://x.test', 'parents', many)
  assert.equal(parseListParam(new URL(url).searchParams.get('list')).length, 30)
  assert.ok(url.endsWith('game-29'))
})

test('the text version: title, then each game with its URL on the next line, then the link', () => {
  const text = listText(
    [
      { _id: 'a', name: 'Down the Tubes', subtitle: 'Fix the pipes', url: 'https://pbskids.org/tubes' },
      { _id: 'b', name: 'No Subtitle', url: 'https://example.org/b' },
      { _id: 'c', name: 'Same', subtitle: 'Same' },
    ],
    'https://thinkinggames.com/parents?list=a,b,c',
  )
  assert.equal(
    text,
    [
      'Thinking Games list',
      '• Down the Tubes: Fix the pipes',
      'https://pbskids.org/tubes',
      '• No Subtitle',
      'https://example.org/b',
      '• Same',
      'https://thinkinggames.com/parents?list=a,b,c',
    ].join('\n'),
  )
})
