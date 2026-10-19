import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alsoTags,
  badges,
  builds,
  facetValues,
  gradesFromAge,
  minutesBucket,
  parentAgeBands,
  parentGroups,
  resolve,
  shownTo,
  sortGames,
  teacherFeel,
  type GameFacts,
} from './derive.ts'

const game = (over: Partial<GameFacts> = {}): GameFacts => ({
  name: 'Test',
  subtitle: 'Shared subtitle',
  url: 'https://example.com/shared',
  image: { alt: 'shared image' },
  icon: { alt: 'shared icon' },
  ageFrom: 6,
  ageTo: 11,
  minutes: 5,
  players: ['Solo'],
  cost: 'Free',
  offline: false,
  noReading: false,
  feelsLike: 'A game',
  skills: [{ title: 'Logical deduction' }],
  teachers: { show: true, grades: ['2-3', '4-5'] },
  parents: { show: true, when: [{ _id: 'when-weekend' }] },
  ...over,
})

test('resolve: shared values when the audience sets no overrides', () => {
  const t = resolve(game(), 'teachers')
  assert.equal(t.audience, 'teachers')
  assert.equal(t.subtitle, 'Shared subtitle')
  assert.equal(t.url, 'https://example.com/shared')
  assert.deepEqual(t.image, { alt: 'shared image' })
  assert.deepEqual(t.icon, { alt: 'shared icon' })
  assert.equal(t.minutes, 5)
  assert.deepEqual(t.skills, [{ title: 'Logical deduction' }])
  assert.equal(t.feelsLike, 'A game')
  assert.equal(t.featured, false)
  assert.equal(t.badgeKinds, null)
  assert.ok(!('teachers' in t) && !('parents' in t), 'audience objects are folded in, not carried')
})

test('resolve: each override replaces the shared value for that audience only', () => {
  const g = game({
    teachers: {
      show: true,
      grades: ['K-1'],
      url: 'https://example.com/teachers',
      subtitle: 'Project it',
      image: { alt: 'teacher image' },
      icon: { alt: 'teacher icon' },
      minutes: 20,
      skills: [{ title: 'Number sense' }],
      feelsLike: 'Math',
      badges: ['Players', 'Minutes'],
      featured: true,
    },
  })
  const t = resolve(g, 'teachers')
  assert.equal(t.url, 'https://example.com/teachers')
  assert.equal(t.subtitle, 'Project it')
  assert.deepEqual(t.image, { alt: 'teacher image' })
  assert.deepEqual(t.icon, { alt: 'teacher icon' })
  assert.equal(t.minutes, 20)
  assert.deepEqual(t.skills, [{ title: 'Number sense' }])
  assert.equal(t.feelsLike, 'Math')
  assert.deepEqual(t.badgeKinds, ['Players', 'Minutes'])
  assert.equal(t.featured, true)

  const p = resolve(g, 'parents')
  assert.equal(p.url, 'https://example.com/shared')
  assert.equal(p.subtitle, 'Shared subtitle')
  assert.equal(p.minutes, 5)
  assert.deepEqual(p.skills, [{ title: 'Logical deduction' }])
  assert.equal(p.feelsLike, 'A game')
  assert.equal(p.badgeKinds, null)
  assert.equal(p.featured, false)
})

test('resolve: null, empty skills and empty badges fall back to the shared value / all badges', () => {
  const r = resolve(game({ parents: { show: true, subtitle: null, minutes: null, skills: [], badges: [], featured: null } }), 'parents')
  assert.equal(r.subtitle, 'Shared subtitle')
  assert.equal(r.minutes, 5)
  assert.deepEqual(r.skills, [{ title: 'Logical deduction' }])
  assert.equal(r.badgeKinds, null)
  assert.equal(r.featured, false)
  const none = resolve(game({ teachers: null, parents: null }), 'teachers')
  assert.equal(none.subtitle, 'Shared subtitle')
  assert.deepEqual(none.grades, [])
})

test('resolve: grades are the hand-set teachers.grades, when is parents.when; each empty for the other audience', () => {
  const g = game({ ageFrom: 5, ageTo: 6, teachers: { show: true, grades: ['4-5'] }, parents: { show: true, when: [{ _id: 'when-a' }] } })
  const t = resolve(g, 'teachers')
  assert.deepEqual(t.grades, ['4-5'], 'used as is, not worked out from the age range')
  assert.deepEqual(t.when, [])
  const p = resolve(g, 'parents')
  assert.deepEqual(p.grades, [])
  assert.deepEqual(p.when, [{ _id: 'when-a' }])
})

test('shownTo: the audience show switch, and the shared hidden switch wins', () => {
  assert.equal(shownTo(game(), 'teachers'), true)
  assert.equal(shownTo(game({ teachers: { show: false } }), 'teachers'), false)
  assert.equal(shownTo(game({ teachers: { show: false } }), 'parents'), true)
  assert.equal(shownTo(game({ teachers: null }), 'teachers'), false)
  assert.equal(shownTo(game({ hidden: true }), 'parents'), false)
})

test('parents age bands: a game matches every band its range overlaps', () => {
  assert.deepEqual(parentAgeBands(game({ ageFrom: 4, ageTo: 5 })), ['Ages 4-5'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 5, ageTo: 6 })), ['Ages 4-5', 'Ages 6-8'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 8, ageTo: 11 })), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 3, ageTo: 14 })), ['Ages 4-5', 'Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 12, ageTo: 14 })), [])
})

test('grades from age (migration and seed only): K-1 is 5 to 7, 2-3 is 7 to 9, 4-5 is 9 to 11', () => {
  assert.deepEqual(gradesFromAge(game({ ageFrom: 5, ageTo: 6 })), ['K-1'])
  assert.deepEqual(gradesFromAge(game({ ageFrom: 7, ageTo: 7 })), ['K-1', '2-3'])
  assert.deepEqual(gradesFromAge(game({ ageFrom: 8, ageTo: 11 })), ['2-3', '4-5'])
  assert.deepEqual(gradesFromAge(game({ ageFrom: 10, ageTo: 11 })), ['4-5'])
  assert.deepEqual(gradesFromAge(game({ ageFrom: 3, ageTo: 4 })), [])
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

test('badges: the audience badges list keeps only those kinds, in the fixed order; empty means all', () => {
  const full = game({ cost: 'Paid', players: ['Pairs'], minutes: 10, offline: true, noReading: true })
  assert.deepEqual(badges(resolve(full, 'teachers')), ['Paid', 'Pairs', '10 min', 'Offline', 'No reading needed'])
  const some = game({ ...full, teachers: { show: true, badges: ['No reading needed', 'Minutes', 'Cost'] } })
  assert.deepEqual(badges(resolve(some, 'teachers')), ['Paid', '10 min', 'No reading needed'], 'fixed order, not list order')
  assert.deepEqual(badges(resolve(some, 'parents')), ['Paid', 'Pairs', '10 min', 'Offline', 'No reading needed'])
  assert.deepEqual(badges({ ...full, badgeKinds: ['players'] }), ['Pairs'], 'kind names match regardless of case')
  assert.deepEqual(badges({ ...full, badgeKinds: ['Offline'], offline: false }), [], 'a kept kind with no value shows nothing')
})

test('badges and minutes filter use the resolved minutes', () => {
  const g = game({ minutes: 5, teachers: { show: true, minutes: 20 } })
  assert.deepEqual(badges(resolve(g, 'teachers')), ['Free', 'Solo', '20 min'])
  assert.deepEqual(facetValues(resolve(g, 'teachers'), 'minutes'), ['20'])
  assert.deepEqual(badges(resolve(g, 'parents')), ['Free', 'Solo', '5 min'])
  assert.deepEqual(facetValues(resolve(g, 'parents'), 'minutes'), ['5'])
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

test('sort: the audience featured flag first, then A to Z, hidden dropped', () => {
  const list = [
    game({ name: 'Zeta', parents: { show: true, featured: true } }),
    game({ name: 'Alpha', hidden: true }),
    game({ name: 'Mid', teachers: { show: true, featured: true } }),
    game({ name: 'Beta' }),
  ]
  assert.deepEqual(
    sortGames(list.map((g) => resolve(g, 'teachers'))).map((g) => g.name),
    ['Mid', 'Beta', 'Zeta'],
  )
  assert.deepEqual(
    sortGames(list.map((g) => resolve(g, 'parents'))).map((g) => g.name),
    ['Zeta', 'Beta', 'Mid'],
  )
  assert.equal(list.length, 4, 'input is not mutated in length')
})

test('facet values per filter group, on resolved games', () => {
  const g = game({
    ageFrom: 8,
    ageTo: 11,
    minutes: 10,
    players: ['Pairs'],
    noReading: true,
    feelsLike: 'Math',
    teachers: { show: true, grades: ['K-1'] },
    parents: { show: true, when: [{ _id: 'when-weekend' }] },
  })
  const t = resolve(g, 'teachers')
  assert.deepEqual(facetValues(t, 'grade'), ['K-1'], 'hand-set grades, even when the age range says 2-3 and 4-5')
  assert.deepEqual(facetValues(t, 'minutes'), ['10'])
  assert.deepEqual(facetValues(t, 'feel'), ['math'])
  const p = resolve(g, 'parents')
  assert.deepEqual(facetValues(p, 'age'), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(facetValues(p, 'when'), ['when-weekend'])
  assert.deepEqual(facetValues(p, 'feelsLike'), ['Math'])
  assert.deepEqual(facetValues(p, 'also'), ['No reading needed', 'Together'])
  assert.deepEqual(facetValues(resolve(game({ feelsLike: 'A game', parents: { show: true, feelsLike: 'Math' } }), 'parents'), 'feelsLike'), ['Math'])
})

test('parent groups keep Age, When, Feels like, Also order and drop empty When', () => {
  const groups = parentGroups([{ _id: 'when-a', title: 'Weekend' }])
  assert.deepEqual(groups.map((g) => g.label), ['Age', 'When', 'Feels like', 'Also'])
  assert.deepEqual(groups[1].options, [{ value: 'when-a', label: 'Weekend' }])
  assert.deepEqual(parentGroups([]).map((g) => g.label), ['Age', 'Feels like', 'Also'])
})
