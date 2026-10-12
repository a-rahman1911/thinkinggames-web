import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alsoTags,
  badges,
  builds,
  facetValues,
  gradeBands,
  minutesBucket,
  parentAgeBands,
  parentGroups,
  sortGames,
  teacherFeel,
  type GameFacts,
} from './derive.ts'

const game = (over: Partial<GameFacts> = {}): GameFacts => ({
  name: 'Test',
  ageFrom: 6,
  ageTo: 11,
  minutes: 5,
  players: ['Solo'],
  cost: 'Free',
  offline: false,
  noReading: false,
  feelsLike: 'A game',
  skills: [{ title: 'Logical deduction' }],
  ...over,
})

test('parents age bands: a game matches every band its range overlaps', () => {
  assert.deepEqual(parentAgeBands(game({ ageFrom: 4, ageTo: 5 })), ['Ages 4-5'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 5, ageTo: 6 })), ['Ages 4-5', 'Ages 6-8'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 8, ageTo: 11 })), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 3, ageTo: 14 })), ['Ages 4-5', 'Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 12, ageTo: 14 })), [])
})

test('teachers grade bands: K-1 is 5 to 7, 2-3 is 7 to 9, 4-5 is 9 to 11', () => {
  assert.deepEqual(gradeBands(game({ ageFrom: 5, ageTo: 6 })), ['K-1'])
  assert.deepEqual(gradeBands(game({ ageFrom: 7, ageTo: 7 })), ['K-1', '2-3'])
  assert.deepEqual(gradeBands(game({ ageFrom: 8, ageTo: 11 })), ['2-3', '4-5'])
  assert.deepEqual(gradeBands(game({ ageFrom: 10, ageTo: 11 })), ['4-5'])
  assert.deepEqual(gradeBands(game({ ageFrom: 3, ageTo: 4 })), [])
})

test('minutes bucket: 5 if at most 5, 10 if 6 to 10, 20 if more than 10', () => {
  assert.equal(minutesBucket(1), '5')
  assert.equal(minutesBucket(5), '5')
  assert.equal(minutesBucket(6), '10')
  assert.equal(minutesBucket(10), '10')
  assert.equal(minutesBucket(11), '20')
  assert.equal(minutesBucket(120), '20')
})

test('also tags: No reading needed from the flag, Together when anyone but Solo plays', () => {
  assert.deepEqual(alsoTags(game()), [])
  assert.deepEqual(alsoTags(game({ noReading: true })), ['No reading needed'])
  assert.deepEqual(alsoTags(game({ players: ['Pairs'] })), ['Together'])
  assert.deepEqual(alsoTags(game({ players: ['Solo', 'Whole class'] })), ['Together'])
  assert.deepEqual(alsoTags(game({ noReading: true, players: ['Small group'] })), ['No reading needed', 'Together'])
})

test('badges: cost, players, minutes, Offline, No reading needed, in that order', () => {
  assert.deepEqual(badges(game()), ['Free', 'Solo', '5 min'])
  assert.deepEqual(
    badges(game({ cost: 'Free with account', players: ['Solo', 'Whole class'], minutes: 20, offline: true, noReading: true })),
    ['Free with account', 'Solo / Whole class', '20 min', 'Offline', 'No reading needed'],
  )
  assert.deepEqual(badges(game({ cost: null, players: [] })), ['5 min'])
})

test('builds line joins skill titles with a middle dot', () => {
  assert.equal(builds(game()), 'Logical deduction')
  assert.equal(builds(game({ skills: [{ title: 'Number sense' }, { title: 'Logical deduction' }] })), 'Number sense · Logical deduction')
  assert.equal(builds(game({ skills: null })), '')
})

test('teacher feel is lower case', () => {
  assert.equal(teacherFeel(game({ feelsLike: 'A game' })), 'a game')
  assert.equal(teacherFeel(game({ feelsLike: 'Math' })), 'math')
})

test('sort: featured first, then by name, hidden dropped', () => {
  const list = [
    game({ name: 'Zeta' }),
    game({ name: 'Alpha', hidden: true }),
    game({ name: 'Mid', featured: true }),
    game({ name: 'Beta' }),
  ]
  assert.deepEqual(
    sortGames(list).map((g) => g.name),
    ['Mid', 'Beta', 'Zeta'],
  )
  assert.equal(list.length, 4, 'input is not mutated in length')
})

test('facet values per filter group', () => {
  const g = game({ ageFrom: 8, ageTo: 11, minutes: 10, players: ['Pairs'], noReading: true, feelsLike: 'Math', when: [{ _id: 'when-weekend' }] })
  assert.deepEqual(facetValues(g, 'grade'), ['2-3', '4-5'])
  assert.deepEqual(facetValues(g, 'minutes'), ['10'])
  assert.deepEqual(facetValues(g, 'feel'), ['math'])
  assert.deepEqual(facetValues(g, 'age'), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(facetValues(g, 'when'), ['when-weekend'])
  assert.deepEqual(facetValues(g, 'feelsLike'), ['Math'])
  assert.deepEqual(facetValues(g, 'also'), ['No reading needed', 'Together'])
})

test('parent groups keep Age, When, Feels like, Also order and drop empty When', () => {
  const groups = parentGroups([{ _id: 'when-a', title: 'Weekend' }])
  assert.deepEqual(groups.map((g) => g.label), ['Age', 'When', 'Feels like', 'Also'])
  assert.deepEqual(groups[1].options, [{ value: 'when-a', label: 'Weekend' }])
  assert.deepEqual(parentGroups([]).map((g) => g.label), ['Age', 'Feels like', 'Also'])
})
