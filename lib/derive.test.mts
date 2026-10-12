import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  GRADES,
  TEACHER_GROUPS,
  alsoTags,
  badges,
  builds,
  facetValues,
  minutesBucket,
  parentAgeBands,
  parentGroups,
  resolve,
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
  teachers: { show: true, grades: ['2-3'] },
  parents: { show: true, when: [{ _id: 'when-free-time' }] },
  ...over,
})

test('resolve: shared values when the audience has no overrides', () => {
  const t = resolve(game(), 'teachers')
  assert.equal(t.audience, 'teachers')
  assert.equal(t.url, 'https://example.com/shared')
  assert.equal(t.subtitle, 'Shared subtitle')
  assert.deepEqual(t.image, { alt: 'shared image' })
  assert.deepEqual(t.icon, { alt: 'shared icon' })
  assert.equal(t.minutes, 5)
  assert.deepEqual(t.skills, [{ title: 'Logical deduction' }])
  assert.equal(t.feelsLike, 'A game')
  assert.equal(t.featured, false)
  assert.deepEqual(t.badgeKinds, [])
  assert.ok(!('teachers' in t) && !('parents' in t), 'audience objects are folded in, not passed through')
})

test('resolve: each override wins when set, only for its own audience', () => {
  const g = game({
    teachers: {
      show: true,
      grades: ['K-1'],
      url: 'https://example.com/teachers',
      subtitle: 'Teacher subtitle',
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
  assert.equal(t.subtitle, 'Teacher subtitle')
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
  assert.deepEqual(p.image, { alt: 'shared image' })
  assert.equal(p.minutes, 5)
  assert.deepEqual(p.skills, [{ title: 'Logical deduction' }])
  assert.equal(p.feelsLike, 'A game')
  assert.deepEqual(p.badgeKinds, [])
  assert.equal(p.featured, false)
})

test('resolve: empty overrides (null, "", []) fall back to the shared value', () => {
  const t = resolve(game({ teachers: { show: true, url: '', subtitle: null, minutes: null, skills: [], feelsLike: '' } }), 'teachers')
  assert.equal(t.url, 'https://example.com/shared')
  assert.equal(t.subtitle, 'Shared subtitle')
  assert.equal(t.minutes, 5)
  assert.deepEqual(t.skills, [{ title: 'Logical deduction' }])
  assert.equal(t.feelsLike, 'A game')
})

test('resolve: grades belong to teachers, when belongs to parents', () => {
  const g = game({ teachers: { show: true, grades: ['K-1', '4-5'] }, parents: { show: true, when: [{ _id: 'when-a' }, { _id: 'when-b' }] } })
  const t = resolve(g, 'teachers')
  const p = resolve(g, 'parents')
  assert.deepEqual(t.grades, ['K-1', '4-5'])
  assert.deepEqual(t.when, [])
  assert.deepEqual(p.grades, [])
  assert.deepEqual(p.when.map((w) => w._id), ['when-a', 'when-b'])
  assert.deepEqual(resolve(game({ teachers: null, parents: null }), 'teachers').grades, [])
  assert.deepEqual(resolve(game({ teachers: null, parents: null }), 'parents').when, [])
})

test('teachers grade filter uses the hand-set grades as is, never the age range', () => {
  // Ages 6 to 11 would once have meant every grade; the editor chose only 4-5.
  const t = resolve(game({ ageFrom: 6, ageTo: 11, teachers: { show: true, grades: ['4-5'] } }), 'teachers')
  assert.deepEqual(facetValues(t, 'grade'), ['4-5'])
  assert.deepEqual(facetValues(resolve(game({ teachers: { show: true, grades: [] } }), 'teachers'), 'grade'), [])
  assert.deepEqual(TEACHER_GROUPS[0].options.map((o) => o.value), [...GRADES])
})

test('parents age bands: still worked out from the age range', () => {
  assert.deepEqual(parentAgeBands(game({ ageFrom: 4, ageTo: 5 })), ['Ages 4-5'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 5, ageTo: 6 })), ['Ages 4-5', 'Ages 6-8'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 8, ageTo: 11 })), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 3, ageTo: 14 })), ['Ages 4-5', 'Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(parentAgeBands(game({ ageFrom: 12, ageTo: 14 })), [])
  assert.deepEqual(facetValues(resolve(game({ ageFrom: 8, ageTo: 11 }), 'parents'), 'age'), ['Ages 6-8', 'Ages 9-11'])
})

test('minutes bucket: 5 if at most 5, 10 if 6 to 10, 20 if more than 10', () => {
  assert.equal(minutesBucket(1), '5')
  assert.equal(minutesBucket(5), '5')
  assert.equal(minutesBucket(6), '10')
  assert.equal(minutesBucket(10), '10')
  assert.equal(minutesBucket(11), '20')
  assert.equal(minutesBucket(120), '20')
})

test('minutes bucket and minutes badge use the resolved minutes', () => {
  const g = game({ minutes: 5, teachers: { show: true, minutes: 20 }, parents: { show: true } })
  const t = resolve(g, 'teachers')
  const p = resolve(g, 'parents')
  assert.deepEqual(facetValues(t, 'minutes'), ['20'])
  assert.deepEqual(badges(t), ['Free', 'Solo', '20 min'])
  assert.deepEqual(facetValues(p, 'minutes'), ['5'])
  assert.deepEqual(badges(p), ['Free', 'Solo', '5 min'])
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

test('badges: the audience badge list limits which kinds show, keeping the fixed order', () => {
  const full = game({ cost: 'Paid', players: ['Pairs'], minutes: 10, offline: true, noReading: true })
  const all = ['Paid', 'Pairs', '10 min', 'Offline', 'No reading needed']
  assert.deepEqual(badges(resolve(full, 'teachers')), all, 'no list means every badge')
  assert.deepEqual(badges(resolve({ ...full, teachers: { show: true, badges: [] } }, 'teachers')), all, 'an empty list means every badge')
  assert.deepEqual(
    badges(resolve({ ...full, teachers: { show: true, badges: ['No reading needed', 'Cost'] } }, 'teachers')),
    ['Paid', 'No reading needed'],
    'order follows BADGE_KINDS, not the list',
  )
  assert.deepEqual(badges(resolve({ ...full, parents: { show: true, badges: ['Minutes'] } }, 'parents')), ['10 min'])
  assert.deepEqual(badges(resolve({ ...full, parents: { show: true, badges: ['Minutes'] } }, 'teachers')), all, 'the other audience is untouched')
  assert.deepEqual(
    badges(resolve({ ...full, offline: false, teachers: { show: true, badges: ['Offline', 'Players'] } }, 'teachers')),
    ['Pairs'],
    'a listed kind with nothing to show is skipped',
  )
})

test('builds line joins the resolved skill titles with a middle dot', () => {
  assert.equal(builds(game()), 'Logical deduction')
  assert.equal(builds(game({ skills: [{ title: 'Number sense' }, { title: 'Logical deduction' }] })), 'Number sense · Logical deduction')
  assert.equal(builds(game({ skills: null })), '')
  assert.equal(builds(resolve(game({ parents: { show: true, skills: [{ title: 'Arithmetic' }] } }), 'parents')), 'Arithmetic')
})

test('teacher feel is lower case', () => {
  assert.equal(teacherFeel(game({ feelsLike: 'A game' })), 'a game')
  assert.equal(teacherFeel(game({ feelsLike: 'Math' })), 'math')
  assert.deepEqual(facetValues(resolve(game({ teachers: { show: true, feelsLike: 'Math' } }), 'teachers'), 'feel'), ['math'])
})

test('sort: the audience\'s own featured first, then by name, hidden dropped', () => {
  const list = [
    game({ name: 'Zeta' }),
    game({ name: 'Alpha', hidden: true }),
    game({ name: 'Mid', teachers: { show: true, featured: true } }),
    game({ name: 'Beta', parents: { show: true, featured: true } }),
  ]
  assert.deepEqual(sortGames(list.map((g) => resolve(g, 'teachers'))).map((g) => g.name), ['Mid', 'Beta', 'Zeta'])
  assert.deepEqual(sortGames(list.map((g) => resolve(g, 'parents'))).map((g) => g.name), ['Beta', 'Mid', 'Zeta'])
  assert.equal(list.length, 4, 'input is not mutated in length')
})

test('facet values per filter group', () => {
  const g = resolve(
    game({ ageFrom: 8, ageTo: 11, minutes: 10, players: ['Pairs'], noReading: true, feelsLike: 'Math', teachers: { show: true, grades: ['2-3', '4-5'] }, parents: { show: true, when: [{ _id: 'when-weekend' }] } }),
    'teachers',
  )
  assert.deepEqual(facetValues(g, 'grade'), ['2-3', '4-5'])
  assert.deepEqual(facetValues(g, 'minutes'), ['10'])
  assert.deepEqual(facetValues(g, 'feel'), ['math'])
  assert.deepEqual(facetValues(g, 'age'), ['Ages 6-8', 'Ages 9-11'])
  assert.deepEqual(facetValues(g, 'feelsLike'), ['Math'])
  assert.deepEqual(facetValues(g, 'also'), ['No reading needed', 'Together'])
  assert.deepEqual(facetValues(g, 'when'), [], 'when is a parents value')
  const p = resolve(game({ parents: { show: true, when: [{ _id: 'when-weekend' }] } }), 'parents')
  assert.deepEqual(facetValues(p, 'when'), ['when-weekend'])
})

test('parent groups keep Age, When, Feels like, Also order and drop empty When', () => {
  const groups = parentGroups([{ _id: 'when-a', title: 'Weekend' }])
  assert.deepEqual(groups.map((g) => g.label), ['Age', 'When', 'Feels like', 'Also'])
  assert.deepEqual(groups[1].options, [{ value: 'when-a', label: 'Weekend' }])
  assert.deepEqual(parentGroups([]).map((g) => g.label), ['Age', 'Feels like', 'Also'])
})
