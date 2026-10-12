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
3. Vercel import with env vars set before the first deploy.
4. Sanity webhook to /api/revalidate plus CORS for the Vercel URL. Verify publish updates the live page.
5. Port analytics: PostHog, Meta Pixel, Google tag AW-18247964071, gated on CookieYes consent, suppressed on Kids URLs, no identify, no session recording.
6. Stop before staging domain, content migration and DNS cutover.

- Design drift fixes (step 1) and the favicon (app/icon.svg from the TGI mascot). See the list below for what changed.
- Task B, games backend: games now carry facts (age range, minutes, players, cost, offline, no reading, platforms, skills, feels like, when, moments, show on) and lib/derive.ts turns them into filters, badges, the "Builds" line and sort order. filterOption documents and sanity/groups.ts are gone. New skill and whenOption documents. Spreadsheet import at scripts/import-games.mts. Seed rewritten to the new model. Studio lists Games, Teacher moments, Skills, When options.
- Task B2, audience split: the game document has three tabs (Shared, Teachers, Parents). Each audience tab has its own show switch, filters (Teachers: grades set by hand; Parents: when) and optional overrides (URL, subtitle, image, icon, minutes, skills, feels like, badges, featured). Moments carry an ordered games list, reordered by dragging in Studio. lib/derive.ts resolve() folds an audience's overrides in; the views only use resolved values. Import reads the Teacher*/Parent* columns of the new template. The dataset was migrated with scripts/migrate-audience.mts (see the Task B2 notes).

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

## Task B2 notes

- Migration ran on 2026-10-12 against rh1roy5u/production (transaction C7XTPBOLOdCkA2v95IIO4r): 6 games moved to the audience shape, 6 moments got their games list. The dry run was reviewed first. The script is safe to re-run; it reports "nothing to migrate" now.
- Grades were worked out from the age range once, during the migration (K-1 = ages 5–7, 2-3 = 7–9, 4-5 = 9–11). From now on they are set by hand on each game, so a game can sit in fewer or more grades than its age range suggests.
- Each moment's games list was rebuilt from the old game → moment links, in the order the site showed them (featured first, then A to Z). The /teachers and /parents pages rendered byte-for-byte the same DOM before and after, checked by diffing the prerendered HTML.
- The old global `featured` became both `teachers.featured` and `parents.featured`. Teacher featured only affects Teachers search order; the moment lists are hand-ordered.
- A hidden game stays in its moments' lists (hidden is a temporary switch); the query leaves it out while hidden.
- Import: "Teacher moments" is required when "On Teachers page" is Yes, as the Guide tab says, because a Teachers game outside every moment would not appear anywhere on the page. A game is only ever appended to a moment; removing it from a moment is done in Studio.
- Studio reference filter on a moment's games: `teachers.show == true`. Turning a game's Teachers switch off does not remove it from moments; the query drops it until it is switched back on.
- No live site yet (Vercel import is still open), so the dataset and `main` were allowed to differ for the minutes between the migration and the merge.

## Decisions

- Design handoff lives in the repo at design-handoff/. The repo is public, so the design files are public.
- Filter group names live in code (lib/derive.ts); "When" options are CMS documents, Grade options are fixed (K-1, 2-3, 4-5).
- Game properties are split by audience: a Shared tab plus Teachers and Parents tabs with their own show switch, filters and overrides. Views never read an override directly; they use resolve().
- No "N moments · N games" label on Teachers, even though the design shows one. No counts in copy.
- Challenge text is "Five puzzles, five minutes, no score." on both pages.
- Never run npm run seed against the live dataset. It uses --replace and would overwrite real content.
- The Home mission band shows the mascot at 120px (Home design) and the persona pages at 100px. Done in CSS with body:has(.home-hero) so the shared footer needs no prop.

## Environment notes

- The cloud session's network policy blocks rh1roy5u.api.sanity.io, so pages and the production build cannot reach Sanity from there. Local verification used a stand-in that evaluates the site's GROQ queries against seed/seed.ndjson. Allow the host in the environment's network settings to lift this.
