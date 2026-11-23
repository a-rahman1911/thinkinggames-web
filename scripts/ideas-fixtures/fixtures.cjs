// Made-up articles for checks and screenshots. They exist only here: nothing is written to Sanity.
// They refer to real games by id, and reuse two pictures already in the dataset as a cover and a Picture block.

const now = () => new Date().toISOString()
let n = 0
const key = () => `k${++n}`

const span = (text, marks = []) => ({ _type: 'span', _key: key(), text, marks })
const block = (style, children, extra = {}) => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: typeof children === 'string' ? [span(children)] : children,
  ...extra,
})
const p = (text) => block('normal', text)
const h2 = (text) => block('h2', text)
const h3 = (text) => block('h3', text)
const li = (text, listItem = 'bullet') => block('normal', text, { listItem, level: 1 })
const game = (id) => ({ _type: 'gameCard', _key: key(), game: { _type: 'reference', _ref: id, _weak: true } })
const tip = (text, label = 'Tip') => ({ _type: 'tip', _key: key(), label, text })
const quote = (text, source) => ({ _type: 'quote', _key: key(), text, source })
const image = (ref, extra = {}) => ({ _type: 'image', asset: { _type: 'reference', _ref: ref }, ...extra })

const WIDE = 'image-5f90b1781f9db7ff62535ff71b9633ada5f0d318-1600x1000-jpg'
const SQUARE = 'image-52aafc85287ae815b481ac4ba4dc020dc44d50cf-1080x1080-png'

const filler =
  'Thinking games work best when nobody is in a hurry. Sit beside your child, let them make the first move, and resist the urge to point at the answer. A wrong move is information: it shows what they tried and what the game did back. Ask what they expected to happen. Then let them try again.'

const article = (slug, audience, publishedAt, title, summary, body, extra = {}) => ({
  _id: `fixture-article-${slug}`,
  _type: 'article',
  _createdAt: `${publishedAt}T09:00:00Z`,
  _updatedAt: `${publishedAt}T09:00:00Z`,
  title,
  slug: { _type: 'slug', current: slug },
  audience,
  summary,
  publishedAt,
  body,
  ...extra,
})

function articles() {
  // Every block, with an uploaded cover.
  const everyBlock = [
    block('normal', [
      span('The ten minutes after dinner are '),
      span('the easiest ten minutes', ['strong']),
      span(' of the day to fill with a game. Nobody is rushing out of the door, and '),
      span('nobody is tired yet', ['em']),
      span('. Here is how to use them. Start with '),
      span('the parent library', ['l1']),
      span(', or read '),
      span('what researchers say about play', ['l2']),
      span('.'),
    ]),
    p(filler),
    h2('Pick one game and stay with it'),
    p('A new game every night is exciting for a week. A game you return to is where the thinking gets deeper.'),
    game('game-down-the-tubes'),
    h3('What to look for'),
    li('A game that takes ten minutes or less'),
    li('Something with no reading, so everyone can join'),
    li('Rules you can explain in one sentence'),
    tip('Ask "what did you notice?" before you ask "what is the answer?"'),
    h2('Make it a routine'),
    li('Clear the table', 'number'),
    li('Open the game together', 'number'),
    li('Stop while it is still fun', 'number'),
    quote('It stopped feeling like homework the day I stopped keeping score.', 'A parent of two, Ohio'),
    { ...image(SQUARE), _type: 'picture', _key: key(), alt: 'A game night poster', caption: 'Ten minutes is enough. Stop while it is still fun.' },
    game('game-all-ten'),
    p(filler),
  ]
  everyBlock[0].markDefs = [
    { _type: 'link', _key: 'l1', href: '/parents' },
    { _type: 'link', _key: 'l2', href: 'https://example.com/research' },
  ]

  return [
    article('ten-minutes-after-dinner', 'parents', '2026-11-12', 'Ten minutes after dinner', 'A small routine that turns the quiet part of the evening into the best thinking time of the day.', everyBlock, {
      author: 'Maya Lin',
      cover: image(WIDE, { alt: 'A chess game for kids', hotspot: { _type: 'sanity.imageHotspot', x: 0.5, y: 0.4, height: 0.5, width: 0.6 } }),
      seo: { _type: 'seo', description: 'How to turn ten minutes after dinner into a game routine.' },
    }),
    article('three-warm-ups-for-monday', 'teachers', '2026-11-10', 'Three warm-ups for Monday morning', 'Short games that settle a class and get everyone talking about strategy before the lesson starts.', [
      p(filler),
      h2('Project one, play together'),
      game('game-code-breaker'),
      p('Let the class vote on each move. The argument about which move is better is the lesson.'),
      game('game-dominoes'),
      tip('Give the losing side the last word: "what would you change?"', 'Try this'),
      game('game-fair-shares'),
      h3('When it runs long'),
      li('Pause and ask for a prediction'),
      li('Pick it up after lunch'),
      quote('The quietest student in the room explained the winning move.'),
      p(filler),
    ], { author: 'Sam Ortiz' }),
    article('what-to-say-while-they-play', 'both', '2026-11-07', 'What to say while they play', 'Five questions that keep a child thinking, and three habits that quietly do the thinking for them.', [
      p(filler),
      game('game-folds'),
      h2('Questions that open things up'),
      li('What did you try first?'),
      li('What would happen if you went the other way?'),
      game('game-handshakes'),
      p(filler),
      p(filler),
    ]),
    article('one-game-for-the-car', 'parents', '2026-11-03', 'One game for the car', 'Waiting rooms and back seats are thinking time. One game to keep on your phone.', [p(filler), game('game-clue-jr'), p('Keep it to one round.')], {
      author: 'Maya Lin',
    }),
    article('when-a-game-is-too-hard', 'teachers', '2026-10-28', 'When a game is too hard', 'How to tell productive struggle from plain frustration, and what to do about each.', [
      p(filler),
      h2('Signs of the good kind of stuck'),
      li('They are still making moves'),
      li('They can say what they are trying'),
      tip('Offer a smaller version of the same puzzle, not the answer.'),
      p(filler),
      p(filler),
      p(filler),
    ]),
    // A hidden game and a game that no longer exists: both are left out, the rest of the article stays.
    article('games-that-need-no-reading', 'both', '2026-10-21', 'Games that need no reading', 'For the youngest players, and for anyone still learning English.', [
      p(filler),
      game('fixture-hidden-game'),
      game('game-deleted-long-ago'),
      game('game-boo'),
      p('The other two games this article once named are gone; the article does not mind.'),
    ]),
    article('a-shelf-of-four', 'parents', '2026-10-14', 'A shelf of four', 'Four games that cover a whole week of different moods.', [
      p(filler),
      game('game-big-numbers'),
      game('game-chess'),
      game('game-blockbuster-billy'),
      game('game-awesome-obstacles'),
    ]),
    article('stations-without-chaos', 'teachers', '2026-10-06', 'Stations without chaos', 'Running four game stations in a room of thirty, with one adult.', [p(filler), game('game-cappy-tappy'), game('game-elevator-antics'), p(filler)]),
  ]
}

/** The made-up documents for one mode: "on", "empty" or "off". */
exports.fixtures = function fixtures(mode) {
  n = 0
  const page = { _id: 'ideasPage', _type: 'ideasPage', enabled: mode !== 'off' }
  if (mode === 'empty') return [page]
  const list = articles()
  return [
    page,
    ...list,
    { _id: 'fixture-hidden-game', _type: 'game', name: 'A hidden game', url: 'https://example.com', ageFrom: 5, ageTo: 8, minutes: '10', hidden: true, teachers: { show: true }, parents: { show: true } },
    // Drafts, seen only in the private preview: an unpublished article, and an unpublished change to a published one.
    { ...article('not-published-yet', 'parents', '2026-11-14', 'Not published yet', 'A draft that only the preview shows.', [p(filler), game('game-all-ten')]), _id: 'drafts.fixture-article-not-published-yet' },
    { ...list[3], _id: `drafts.${list[3]._id}`, title: 'One game for the car (edited draft)' },
    // What the Studio "Preview" action writes: a one-time secret, valid for an hour.
    { _id: 'drafts.fixture-preview-secret', _type: 'sanity.previewUrlSecret', _updatedAt: now(), secret: 'fixture-secret', studioUrl: 'http://localhost:3000/studio' },
  ]
}
