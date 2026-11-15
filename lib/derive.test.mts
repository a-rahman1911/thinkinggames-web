import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alsoTags,
  badges,
  facetValues,
  gradesFromAge,
  matchesSelection,
  optionCount,
  PARENT_AGE_BANDS,
  parentAgeBands,
  parentGroups,
  resolve,
  shownTo,
  sortGames,
  teacherFeel,
  TEACHER_GROUPS,
  type FacetKey,
  type GameFacts,
  type Selection,
} from './derive.ts'

const game = (over: Partial<GameFacts> = {}): GameFacts => ({
  name: 'Test',
  subtitle: 'Shared subtitle',
  url: 'https://example.com/shared',
  image: { alt: 'shared image' },
  icon: { alt: 'shared icon' },
  ageFrom: 6,
  ageTo: 11,
  minutes: '5',
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
  assert.equal(t.minutes, '5')
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
      minutes: '20',
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
  assert.equal(t.minutes, '20')
  assert.deepEqual(t.skills, [{ title: 'Number sense' }])
  assert.equal(t.feelsLike, 'Math')
  assert.deepEqual(t.badgeKinds, ['Players', 'Minutes'])
  assert.equal(t.featured, true)

  const p = resolve(g, 'parents')
  assert.equal(p.url, 'https://example.com/shared')
  assert.equal(p.subtitle, 'Shared subtitle')
  assert.equal(p.minutes, '5')
  assert.deepEqual(p.skills, [{ title: 'Logical deduction' }])
  assert.equal(p.feelsLike, 'A game')
  assert.equal(p.badgeKinds, null)
  assert.equal(p.featured, false)
})

test('resolve: null, empty skills and empty badges fall back to the shared value / all badges', () => {
  const r = resolve(game({ parents: { show: true, subtitle: null, minutes: null, skills: [], badges: [], featured: null } }), 'parents')
  assert.equal(r.subtitle, 'Shared subtitle')
  assert.equal(r.minutes, '5')
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

test('minutes filter: options 5 / 10 / 20 / 30+, and each game matches its own value only', () => {
  assert.deepEqual(TEACHER_GROUPS.find((g) => g.key === 'minutes')!.options.map((o) => o.value), ['5', '10', '20', '30+'])
  for (const m of ['5', '10', '20', '30+']) assert.deepEqual(facetValues(resolve(game({ minutes: m }), 'teachers'), 'minutes'), [m])
  assert.deepEqual(badges(game({ minutes: '30+' })), ['Free', 'Solo', '30+ min'])
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
    badges(game({ cost: 'Free with account', players: ['Solo', 'Whole class'], minutes: '20', offline: true, noReading: true })),
    ['Free with account', 'Solo / Whole class', '20 min', 'Offline', 'No reading needed'],
  )
  assert.deepEqual(badges(game({ cost: null, players: [] })), ['5 min'])
})

test('badges: the audience badges list keeps only those kinds, in the fixed order; empty means all', () => {
  const full = game({ cost: 'Paid', players: ['Pairs'], minutes: '10', offline: true, noReading: true })
  assert.deepEqual(badges(resolve(full, 'teachers')), ['Paid', 'Pairs', '10 min', 'Offline', 'No reading needed'])
  const some = game({ ...full, teachers: { show: true, badges: ['No reading needed', 'Minutes', 'Cost'] } })
  assert.deepEqual(badges(resolve(some, 'teachers')), ['Paid', '10 min', 'No reading needed'], 'fixed order, not list order')
  assert.deepEqual(badges(resolve(some, 'parents')), ['Paid', 'Pairs', '10 min', 'Offline', 'No reading needed'])
  assert.deepEqual(badges({ ...full, badgeKinds: ['players'] }), ['Pairs'], 'kind names match regardless of case')
  assert.deepEqual(badges({ ...full, badgeKinds: ['Offline'], offline: false }), [], 'a kept kind with no value shows nothing')
})

test('badges and minutes filter use the resolved minutes', () => {
  const g = game({ minutes: '5', teachers: { show: true, minutes: '20' } })
  assert.deepEqual(badges(resolve(g, 'teachers')), ['Free', 'Solo', '20 min'])
  assert.deepEqual(facetValues(resolve(g, 'teachers'), 'minutes'), ['20'])
  assert.deepEqual(badges(resolve(g, 'parents')), ['Free', 'Solo', '5 min'])
  assert.deepEqual(facetValues(resolve(g, 'parents'), 'minutes'), ['5'])
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
    minutes: '10',
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

// ---- Parents "Thinking skill" filter (round 12) ----
const SKILLS = [
  { _id: 'skill-logic', title: 'Logical deduction' },
  { _id: 'skill-number', title: 'Number sense' },
  { _id: 'skill-memory', title: 'Working memory' },
  { _id: 'skill-arith', title: 'Arithmetic' },
]
const sk = (...ids: string[]) => ids.map((id) => ({ _id: id, title: SKILLS.find((s) => s._id === id)!.title }))
const forParents = (list: ReturnType<typeof game>[]) => list.filter((g) => shownTo(g, 'parents')).map((g) => resolve(g, 'parents'))

test('parent groups are Age, Thinking skill, Feels like, Also; no When', () => {
  const games = forParents([game({ skills: sk('skill-number', 'skill-logic') })])
  const groups = parentGroups(SKILLS, games)
  assert.deepEqual(groups.map((g) => g.label), ['Age', 'Thinking skill', 'Feels like', 'Also'])
  assert.deepEqual(groups.map((g) => g.key), ['age', 'skill', 'feelsLike', 'also'])
  assert.deepEqual(groups[1].options, [
    { value: 'skill-logic', label: 'Logical deduction' },
    { value: 'skill-number', label: 'Number sense' },
  ], 'the skill documents in their own order, by title; not the order on a game')
  assert.deepEqual(parentGroups(SKILLS, []).map((g) => g.label), ['Age', 'Feels like', 'Also'], 'no skills in use: no group')
})

test('thinking skill: a skill no game shown to parents has is left out', () => {
  const games = forParents([
    game({ name: 'Shown', skills: sk('skill-logic') }),
    game({ name: 'Teachers only', skills: sk('skill-memory'), parents: { show: false } }),
    game({ name: 'Hidden', skills: sk('skill-arith'), hidden: true }),
    // Parents see the parents override, not the shared skills.
    game({ name: 'Override', skills: sk('skill-memory'), parents: { show: true, skills: sk('skill-number') } }),
  ])
  assert.deepEqual(parentGroups(SKILLS, games)[1].options.map((o) => o.label), ['Logical deduction', 'Number sense'])
})

test('thinking skill: any ticked skill matches; groups combine; counts follow the other groups', () => {
  const games = forParents([
    game({ name: 'A', ageFrom: 4, ageTo: 5, feelsLike: 'Math', skills: sk('skill-logic', 'skill-number') }),
    game({ name: 'B', ageFrom: 6, ageTo: 8, feelsLike: 'A game', skills: sk('skill-number') }),
    game({ name: 'C', ageFrom: 9, ageTo: 11, feelsLike: 'A game', skills: sk('skill-memory') }),
    game({ name: 'D', ageFrom: 9, ageTo: 11, feelsLike: 'Math', skills: null }),
  ])
  const groups = parentGroups(SKILLS, games)
  const names = (sel: Selection) => games.filter((g) => matchesSelection(g, groups, sel)).map((g) => g.name)
  const count = (sel: Selection, key: FacetKey, value: string) => optionCount(games, groups, sel, key, value)

  assert.deepEqual(facetValues(games[0], 'skill'), ['skill-logic', 'skill-number'])
  assert.deepEqual(facetValues(games[3], 'skill'), [])
  assert.deepEqual(names({}), ['A', 'B', 'C', 'D'])
  assert.deepEqual(names({ skill: ['skill-number'] }), ['A', 'B'])
  assert.deepEqual(names({ skill: ['skill-logic', 'skill-memory'] }), ['A', 'C'], 'any ticked skill')
  assert.deepEqual(names({ skill: ['skill-number'], feelsLike: ['A game'] }), ['B'], 'every group with a tick')
  assert.deepEqual(names({ skill: [] }), ['A', 'B', 'C', 'D'], 'an emptied group filters nothing')

  // Nothing ticked: each skill counts its games.
  assert.deepEqual(['skill-logic', 'skill-number', 'skill-memory'].map((s) => count({}, 'skill', s)), [1, 2, 1])
  // A tick in the group does not change that group's own counts.
  assert.equal(count({ skill: ['skill-logic'] }, 'skill', 'skill-memory'), 1)
  // A ticked skill narrows the counts in the other groups.
  const sel = { skill: ['skill-number'] }
  assert.deepEqual(PARENT_AGE_BANDS.map((b) => count(sel, 'age', b.label)), [1, 1, 0])
  assert.deepEqual([count(sel, 'feelsLike', 'Math'), count(sel, 'feelsLike', 'A game')], [1, 1])
  // A tick in another group narrows the skill counts; a skill can fall to zero.
  assert.deepEqual(['skill-logic', 'skill-number', 'skill-memory'].map((s) => count({ age: ['Ages 9-11'] }, 'skill', s)), [0, 0, 1])
})

test('thinking skill: a skill without an id is matched by its title', () => {
  assert.deepEqual(facetValues(resolve(game({ skills: [{ title: 'Number sense' }] }), 'parents'), 'skill'), ['Number sense'])
})
