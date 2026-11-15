import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  audienceLabel,
  cardAudience,
  coverGames,
  filterArticles,
  formatDate,
  ideasHeading,
  moreArticles,
  newestFirst,
  readMinutes,
  stripArticles,
  visibleBody,
  wordCount,
  type BodyBlock,
  type IdeaAudience,
} from './ideas.ts'

type G = { _id: string; hidden?: boolean }
const text = (n: number): BodyBlock<G> => ({ _type: 'block', children: [{ text: Array(n).fill('word').join(' ') }] })
const gameBlock = (id: string | null, hidden = false): BodyBlock<G> => ({
  _type: 'gameCard',
  game: id ? { _id: id, hidden } : null,
})
const article = (id: string, audience: IdeaAudience, publishedAt: string, _createdAt = '2026-01-01T00:00:00Z') => ({
  _id: id,
  audience,
  publishedAt,
  _createdAt,
})
const ids = (list: { _id: string }[]) => list.map((a) => a._id)

test('read time: words ÷ 200, rounded up, at least 1', () => {
  assert.equal(readMinutes(null), 1)
  assert.equal(readMinutes([]), 1)
  assert.equal(readMinutes([text(1)]), 1)
  assert.equal(readMinutes([text(200)]), 1)
  assert.equal(readMinutes([text(201)]), 2)
  assert.equal(readMinutes([text(400)]), 2)
  assert.equal(readMinutes([text(150), text(150), text(150)]), 3)
})

test('word count: text blocks across their spans, tips and quotes; not games, pictures or captions', () => {
  const body: BodyBlock[] = [
    { _type: 'block', children: [{ text: 'Two words' }, { text: ' and three more' }] },
    { _type: 'tip', text: 'Ask what they  noticed.\nThen wait.' },
    { _type: 'quote', text: 'It felt like play' },
    { _type: 'gameCard', game: { _id: 'g', name: 'Many words in a game name' } },
    { _type: 'picture' },
    { _type: 'block', children: null },
  ]
  assert.equal(wordCount(body), 5 + 6 + 4)
})

test('a strip picks the three newest articles for its audience, with the ones for both', () => {
  const all = [
    article('t-old', 'teachers', '2026-01-05'),
    article('p-new', 'parents', '2026-06-01'),
    article('b-mid', 'both', '2026-03-01'),
    article('t-new', 'teachers', '2026-05-01'),
    article('p-old', 'parents', '2026-02-01'),
    article('t-mid', 'teachers', '2026-04-01'),
  ]
  assert.deepEqual(ids(stripArticles(all, 'teachers')), ['t-new', 't-mid', 'b-mid'])
  assert.deepEqual(ids(stripArticles(all, 'parents')), ['p-new', 'b-mid', 'p-old'])
  assert.deepEqual(stripArticles([article('t', 'teachers', '2026-01-01')], 'parents'), [])
  assert.deepEqual(stripArticles([], 'teachers'), [])
})

test('"More ideas" picks the three newest other articles that fit the audience, never the article itself', () => {
  const all = [
    article('p1', 'parents', '2026-06-01'),
    article('t1', 'teachers', '2026-05-01'),
    article('b1', 'both', '2026-04-01'),
    article('p2', 'parents', '2026-03-01'),
    article('p3', 'parents', '2026-02-01'),
    article('t2', 'teachers', '2026-01-01'),
  ]
  assert.deepEqual(ids(moreArticles(all, all[0])), ['b1', 'p2', 'p3'])
  assert.deepEqual(ids(moreArticles(all, all[1])), ['b1', 't2'])
  // An article for both audiences: any other article fits.
  assert.deepEqual(ids(moreArticles(all, all[2])), ['p1', 't1', 'p2'])
  // The only article: nothing, so the section is hidden.
  assert.deepEqual(moreArticles([all[0]], all[0]), [])
})

test('newest first; on the same date the one created last comes first; the input is not reordered', () => {
  const all = [
    article('a', 'both', '2026-03-01', '2026-03-01T08:00:00Z'),
    article('b', 'both', '2026-03-02', '2026-02-01T08:00:00Z'),
    article('c', 'both', '2026-03-01', '2026-03-01T09:00:00Z'),
  ]
  assert.deepEqual(ids(newestFirst(all)), ['b', 'c', 'a'])
  assert.deepEqual(ids(all), ['a', 'b', 'c'])
})

test('the index filter: articles for both appear under every choice', () => {
  const all = [article('t', 'teachers', '2026-01-03'), article('b', 'both', '2026-01-02'), article('p', 'parents', '2026-01-01')]
  assert.deepEqual(ids(filterArticles(all, 'all')), ['t', 'b', 'p'])
  assert.deepEqual(ids(filterArticles(all, 'teachers')), ['t', 'b'])
  assert.deepEqual(ids(filterArticles(all, 'parents')), ['b', 'p'])
})

test('the cover uses the first three games in the body, in order', () => {
  const body = [text(10), gameBlock('a'), text(10), gameBlock('b'), gameBlock('c'), gameBlock('d')]
  assert.deepEqual(ids(coverGames(body)), ['a', 'b', 'c'])
})

test('the cover skips hidden and missing games and counts a repeated game once', () => {
  const body = [gameBlock('a'), gameBlock('hidden', true), gameBlock(null), gameBlock('a'), gameBlock('b'), gameBlock('c'), gameBlock('d')]
  assert.deepEqual(ids(coverGames(body)), ['a', 'b', 'c'])
})

test('the cover with one, two or no games', () => {
  assert.deepEqual(ids(coverGames([gameBlock('a')])), ['a'])
  assert.deepEqual(ids(coverGames([gameBlock('a'), text(5), gameBlock('b')])), ['a', 'b'])
  assert.deepEqual(coverGames([text(5), gameBlock(null), gameBlock('x', true)]), [])
  assert.deepEqual(coverGames(null), [])
})

test('the body drops Game blocks whose game is hidden or gone and keeps everything else in order', () => {
  const body: BodyBlock<G>[] = [text(3), gameBlock('a'), gameBlock('hidden', true), { _type: 'tip', text: 'x' }, gameBlock(null), gameBlock('b')]
  const kept = visibleBody(body)
  assert.deepEqual(
    kept.map((b) => (b._type === 'gameCard' ? b.game?._id : b._type)),
    ['block', 'a', 'tip', 'b'],
  )
  assert.deepEqual(visibleBody(null), [])
})

test('labels, headings and which card an article uses', () => {
  assert.equal(audienceLabel('teachers'), 'For teachers')
  assert.equal(audienceLabel('parents'), 'For parents')
  assert.equal(audienceLabel('both'), 'For teachers and parents')
  assert.equal(ideasHeading('Ideas', 'parents'), 'Ideas for parents')
  assert.equal(ideasHeading('More ideas', 'teachers'), 'More ideas for teachers')
  assert.equal(ideasHeading('More ideas', 'both'), 'More ideas')
  assert.equal(cardAudience('teachers'), 'teachers')
  assert.equal(cardAudience('parents'), 'parents')
  assert.equal(cardAudience('both'), 'parents')
})

test('dates are calendar days', () => {
  assert.equal(formatDate('2026-11-14'), 'November 14, 2026')
  assert.equal(formatDate('2026-01-01'), 'January 1, 2026')
  assert.equal(formatDate(''), '')
  assert.equal(formatDate(null), '')
  assert.equal(formatDate('soon'), '')
})
