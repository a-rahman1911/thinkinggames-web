# Status: thinkinggames.com rebuild

Running record of what is done, what is open, and decisions made. Updated in each PR.

## Done

- Next.js 15 + React 19 + Sanity v3 site: Home (option 1a), Teachers, Parents, Studio at /studio, /api/revalidate. (d1be127)
- Parents search box height fix. (384a3dd)
- Install, typecheck and production build pass locally against real Sanity (project rh1roy5u, dataset production, 34 seed documents).
- Design handoff committed to the repo under design-handoff/ (designs, docs, handoff README). The designs are the visual source of truth.
- 2026-10-12 build check in the cloud session: typecheck passes, production build compiles with no warnings and prerenders all nine routes, and /, /teachers, /parents and /studio return 200 in a browser. No code changes were needed. Sanity was reached through the seed-content stand-in because the session's network policy still blocks the Sanity hosts; Studio therefore stops at its loading spinner there (it cannot reach api.sanity.io to sign in). The home page requests /favicon.ico, which does not exist yet.

## Open, in order

1. Fix visual drift against the design files: done, see below.
2. Walk through opening /studio locally (sign-in, localhost:3000 CORS origin).
3. Vercel import with env vars set before the first deploy: done, see below.
4. Sanity webhook to /api/revalidate plus CORS for the Vercel URL: done, see below.
5. Port analytics: PostHog, Meta Pixel, Google tag AW-18247964071, gated on CookieYes consent, suppressed on Kids URLs, no identify, no session recording.
6. Stop before staging domain, content migration and DNS cutover.

- Design drift fixes (step 1) and the favicon (app/icon.svg from the TGI mascot). See the list below for what changed.
- Task B, games backend: games now carry facts (age range, minutes, players, cost, offline, no reading, platforms, skills, feels like, when, moments, show on) and lib/derive.ts turns them into filters, badges, the "Builds" line and sort order. filterOption documents and sanity/groups.ts are gone. New skill and whenOption documents. Spreadsheet import at scripts/import-games.mts. Seed rewritten to the new model. Studio lists Games, Teacher moments, Skills, When options.

- 2026-10-19: Vercel is connected and live. Production domain: https://thinkinggames-web.vercel.app/. Main deploys on every merge. The Sanity webhook points to /api/revalidate on that domain, so a publish in Studio goes live in seconds without a redeploy. **To check a deploy, fetch the production domain and look at what it serves; do not rely on GitHub commit statuses or check runs** (Vercel posts none on this repository).
- Every game image is 16:10. Teachers row and search thumbnails went from 4:3 (132×99) to 16:10 (132×82.5 on desktop, 88×55 at 640px and below), and request a 264×165 crop from Sanity, the same 16:10 crop as the 800×500 Parents cards. The image field asks editors for 1600×1000.
- 404 page now renders the site footer (app/not-found.tsx sits outside the (site) layout, so it fetches the site settings itself). It still returns HTTP 404.
- Task C1, mobile layout (≤640px): header on two rows (logo + pills, then the Teachers search), smaller hero, Challenge banner with a 3-column age grid, compact moments with stacked in-moment filters that scroll sideways if too wide, full-width "Open game", stacked home doors, smaller footer. On Parents the sidebar becomes a full-screen filter panel opened from a sticky "Filters · N" button; the panel traps focus, closes on Esc and returns focus to the button. Checked at 360, 390 and 430px: no horizontal scroll, every tap target at least 44px, every focus ring visible and unclipped. Desktop (641px and up) renders pixel-identical to the previous build. Screenshots in docs/screenshots/c1-mobile/.
- Task B2, game properties by audience: the game document has Shared, Teachers and Parents tabs. `teachers{}` and `parents{}` each carry a show switch, their own filter data (grades set by hand; when) and optional overrides of the shared values. `lib/derive.ts` gained `resolve(game, audience)`; the views only use resolved games. Moments own an ordered games list (source of truth for membership and order; drag to reorder in Studio). Import rewritten for the Guide tab's Teacher*/Parent* columns, with a `--allow-missing-images` test flag. `scripts/migrate-audience.mts` migrates a dataset; seed rewritten to the new shape.

## Design drift found (step 1)

Fixed in the "Fix design drift" PR, except the items marked as decided otherwise.

Compared at a 1280px viewport. Design files rendered locally; site rendered against the seed content.

### Home (Homepage.dc.html, option 1a)

- Hero grid columns are equal (1fr 1fr); design is 1.3fr / 1fr. The headline wraps to four lines instead of three and the subline column is wider.
- Hero subline has no bottom margin; design has 8px.
- Header vertical padding is 18px; design is 22px on Home only (Teachers and Parents are 18px).
- Header nav gap is 10px; design is 12px on Home only.
- Door eyebrow is 13px; design is 14px.
- Mission band mascot is 100px; design is 120px on Home only (100px on Teachers and Parents).
- Footer links: CMS content has Privacy, Terms, Contact. Design also has "Cookie settings". Content, not code. Still open; belongs with the CookieYes work in step 5.

### Teachers (Teachers Page v2.dc.html)

- Moment blurbs render bold. The header button sits inside an h3 and inherits its weight. Design is weight 400.
- The moments heading row is missing the right-aligned total label ("6 moments · 6 games"). Decided: leave it out. The rule against game counts wins over the design.
- Game row: name and tagline have no gap; design has 2px.
- Search empty state padding is 40px 32px; design is 40px all round.
- Moment empty state padding is 40px 32px; design is 32px.
- Challenge text in CMS reads "Five puzzles, five minutes, no score." Design reads "Five-question quiz, five minutes, no score." Decided: "Five puzzles" stays on both pages. No change.

### Parents (Parents Library.dc.html)

- Search box is missing the magnifier icon inside the left edge.
- Search box left padding is 20px and gap 10px; design is 22px and 12px.
- No-results panel padding is 40px 32px with 16px radius; design is 56px 32px with 20px radius.
- "Clear filters" button in the no-results panel is 14px with 9px 16px padding; design is 15px with 11px 20px padding.
- Footer links: same "Cookie settings" gap as Home. Still open.

Not drift: game order, game counts per moment, tag sets and thumbnails differ because the seed content is placeholder data.

## Design handoff workflow

- Designs are edited in Claude Design. Each round, the owner exports a designs-only zip ("the design export"): the three .dc.html files, support.js and assets/tg/. support.js must always be included or the files will not open in a browser.
- The export is attached in the session. The files are diffed against design-handoff/designs before any code changes, the design changes are reported, then the site is updated to match.
- One branch and one PR per handoff, carrying the updated design files and the matching code. STATUS.md records the round.
- The games, moments and filters inside the design files are placeholder data. Changes to them do not change seed/seed.ndjson unless the owner says so.
- Copy changes are listed by the owner at the end of each round and go straight into Studio. Code does not carry copy.

## Task B notes

- Seed ages were chosen so the derived Grade and Age bands reproduce the old hand-linked filters exactly. Two visible differences from the old seed, both because the derivation rules now apply: Star Stuff (Pairs) counts as "Together" (Together count 3 → 4), and Set Daily Puzzle gains a "No reading needed" badge because its flag was already set. Badge order follows the new rule (cost, players, minutes, Offline, No reading needed) and skill titles are capitalized as in the Lists tab.
- The seed has no images, as before, so Studio shows the required-image validation on seed games until real images are imported.
- Required columns in the import follow the " *" markers on the sheet's own headers, so the Guide tab stays the single source of truth for editors. Platforms is therefore required in the import (the sheet marks it) but optional in the schema.
- The import carries over a "hidden" flag set in Studio; everything else on the game document is replaced.

## Task C1 notes

- Below 390px the 28px mascot logo (144px wide) and the two pills (188px) cannot share one row inside the 20px page gutters; at 360px only 320px is available. Below 390px the header gap tightens to 8px and the mascot logo shrinks to 24px tall. The home wordmark still fits at 28px. At 390px and up every header value is as specified.
- The 34px hero applies to the Teachers, Parents and 404 heroes. The home hero keeps its own size (42px at 390px), since the Home section of the spec only lists the doors.
- "Open game" spans the full width of the row's text column, under the badges; the thumbnail column stays beside it.
- In the filter panel, "Clear all" shows once a filter or search is active, as on desktop.
- Two focus rings were clipped by their container's overflow on every screen size (the in-moment filter options and the moment headers). They are now drawn inside the element; this changes nothing until an element has keyboard focus.

## Task B2 notes

- Production (rh1roy5u/production) was already in the audience shape when this task started: all six games carried `teachers{}` / `parents{}` and all six moments had a games list, written in one transaction on 2026-10-12, with no `showOn`, `moments` or `featured` left on any game. The main branch's code still queried `showOn`, so the migration script's dry run and run against production both reported nothing to do. The migrate path was exercised against the old-shape seed through a local stand-in; the result is byte-for-byte what production holds, and is what `seed/seed.ndjson` now contains.
- Within a moment, games show in the moment's list order. The migration appended the old links featured-first then A–Z (the order the site showed), so nothing moved.
- Teachers grades are no longer worked out from the age range on the site. `gradesFromAge` in lib/derive.ts remains for the migration and seed only.
- The import does not require "Teacher moments" when a game is on the Teachers page (only grades, and "When" for parents, are required). A game with no moment is reachable through Teachers search and can be added to a moment in Studio.
- Moment → game references are strong. `--prune` takes a game out of every moment list before deleting it; in Studio, Sanity blocks deleting a game until it is removed from its moments.
- Dry run of `scripts/Games - Initial 60.xlsx` with `--allow-missing-images`: 366 problems, all blank required cells that the sheet's own Review tab marks as "fill in" (Subtitle, Minutes, Players and No reading needed on all 60 rows; Image description, Cost and Works offline on the 42 non-PBS rows). Every filled value validates.

## Content state (2026-10-19)

- rh1roy5u/production holds the 60 games from `scripts/Games - Initial 60.xlsx`, imported with `--allow-missing-images`. The six seed games were deleted first and removed from every moment list; the moments, skills and When options from the seed were kept.
- The 60 games carry **placeholder values and images**: the sheet's blank required cells were filled before import (Subtitle and Image description = the game name, Minutes = 10, Players = Solo, Cost = Free, Works offline = No, No reading needed = No; the 18 PBS KIDS rows already had Cost and Works offline), and every image is the grey placeholder because no image files have been supplied yet. The committed sheet carries those filled values, so the repo matches the CMS.
- Re-importing the real sheet with real values and an images folder replaces all of it: games are upserted by name, and the placeholder images are superseded by the uploaded files. Moment lists keep their order; only games not yet in a list are appended.

## Decisions

- Design handoff lives in the repo at design-handoff/. The repo is public, so the design files are public.
- Filter group names live in code (sanity/groups.ts); options are CMS documents.
- No "N moments · N games" label on Teachers, even though the design shows one. No counts in copy.
- Challenge text is "Five puzzles, five minutes, no score." on both pages.
- Never run npm run seed against the live dataset. It uses --replace and would overwrite real content.
- The Home mission band shows the mascot at 120px (Home design) and the persona pages at 100px. Done in CSS with body:has(.home-hero) so the shared footer needs no prop.

## Environment notes

- The cloud session's network policy allows api.sanity.io and GitHub but blocks thinkinggames-web.vercel.app, so the live site cannot be fetched from a cloud session unless that host is added to the environment's Allowed domains.
- Earlier note: the cloud session's network policy blocked rh1roy5u.api.sanity.io, so pages and the production build cannot reach Sanity from there. Local verification used a stand-in that evaluates the site's GROQ queries against seed/seed.ndjson. Allow the host in the environment's network settings to lift this.
