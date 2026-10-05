# Status: thinkinggames.com rebuild

Running record of what is done, what is open, and decisions made. Updated in each PR.

## Done

- Next.js 15 + React 19 + Sanity v3 site: Home (option 1a), Teachers, Parents, Studio at /studio, /api/revalidate. (d1be127)
- Parents search box height fix. (384a3dd)
- Install, typecheck and production build pass locally against real Sanity (project rh1roy5u, dataset production, 34 seed documents).
- Design handoff committed to the repo under design-handoff/ (designs, docs, handoff README). The designs are the visual source of truth.

## Open, in order

1. Fix visual drift against the design files (list below). Not started; waiting on go-ahead for the two judgment calls.
2. Walk through opening /studio locally (sign-in, localhost:3000 CORS origin).
3. Vercel import with env vars set before the first deploy.
4. Sanity webhook to /api/revalidate plus CORS for the Vercel URL. Verify publish updates the live page.
5. Port analytics: PostHog, Meta Pixel, Google tag AW-18247964071, gated on CookieYes consent, suppressed on Kids URLs, no identify, no session recording.
6. Stop before staging domain, content migration and DNS cutover.

## Design drift found (step 1)

Compared at a 1280px viewport. Design files rendered locally; site rendered against the seed content.

### Home (Homepage.dc.html, option 1a)

- Hero grid columns are equal (1fr 1fr); design is 1.3fr / 1fr. The headline wraps to four lines instead of three and the subline column is wider.
- Hero subline has no bottom margin; design has 8px.
- Header vertical padding is 18px; design is 22px on Home only (Teachers and Parents are 18px).
- Header nav gap is 10px; design is 12px on Home only.
- Door eyebrow is 13px; design is 14px.
- Mission band mascot is 100px; design is 120px on Home only (100px on Teachers and Parents).
- Footer links: CMS content has Privacy, Terms, Contact. Design also has "Cookie settings". Content, not code. Belongs with the CookieYes work in step 5.

### Teachers (Teachers Page v2.dc.html)

- Moment blurbs render bold. The header button sits inside an h3 and inherits its weight. Design is weight 400.
- The moments heading row is missing the right-aligned total label ("6 moments · 6 games", 15px, weight 700, bottom-aligned). Judgment call: it is a count computed from CMS data, not invented, but the brief says no game counts in copy.
- Game row: name and tagline have no gap; design has 2px.
- Search empty state padding is 40px 32px; design is 40px all round.
- Moment empty state padding is 40px 32px; design is 32px.
- Challenge text in CMS reads "Five puzzles, five minutes, no score." Design reads "Five-question quiz, five minutes, no score." Content, not code. Judgment call: the Parents design uses "Five puzzles", so the two designs disagree.

### Parents (Parents Library.dc.html)

- Search box is missing the magnifier icon inside the left edge.
- Search box left padding is 20px and gap 10px; design is 22px and 12px.
- No-results panel padding is 40px 32px with 16px radius; design is 56px 32px with 20px radius.
- "Clear filters" button in the no-results panel is 14px with 9px 16px padding; design is 15px with 11px 20px padding.
- Footer links: same "Cookie settings" gap as Home.

Not drift: game order, game counts per moment, tag sets and thumbnails differ because the seed content is placeholder data.

## Design handoff workflow

- Designs are edited in Claude Design. Each round, the owner exports a designs-only zip ("the design export"): the three .dc.html files, support.js and assets/tg/. support.js must always be included or the files will not open in a browser.
- The export is attached in the session. The files are diffed against design-handoff/designs before any code changes, the design changes are reported, then the site is updated to match.
- One branch and one PR per handoff, carrying the updated design files and the matching code. STATUS.md records the round.
- The games, moments and filters inside the design files are placeholder data. Changes to them do not change seed/seed.ndjson unless the owner says so.
- Copy changes are listed by the owner at the end of each round and go straight into Studio. Code does not carry copy.

## Decisions

- Design handoff lives in the repo at design-handoff/. The repo is public, so the design files are public.
- Filter group names live in code (sanity/groups.ts); options are CMS documents.

## Environment notes

- The cloud session's network policy blocks rh1roy5u.api.sanity.io, so pages and the production build cannot reach Sanity from there. Local verification used a stand-in that evaluates the site's GROQ queries against seed/seed.ndjson. Allow the host in the environment's network settings to lift this.
