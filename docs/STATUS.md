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
- 2026-10-26: "Brands we support" panel (Teachers Page v2 and Parents Library in Claude Design), directly under the Challenge banner on both pages, 16px below it. New `brand` document (name, logo, URL, a show switch and an order per page), listed in Studio as "Brands we support" under Games. `components/BrandsPanel.tsx`: a bordered panel with the label and an auto-fit grid of logo tiles (min 140px), each a link that opens in a new tab, labelled "{name} (opens in new tab)", with an aria-hidden ↗. Each page queries its own brands (showOnTeachers / teachersOrder, showOnParents / parentsOrder) under the existing 'sanity' tag. The panel is hidden when the page has no brands, and a brand without a logo or URL is left out, so a half-filled brand never shows a broken tile. Seeded in production: Math Makers (Teachers 1, Parents 2, https://www.ululab.com, the Ululab developer site), Math Jams (Teachers 2, URL left empty: no official site could be confirmed), Funexpected (Parents 1, https://funexpectedapps.com). No logos yet, so the panel stays hidden on both pages until the logos (and the Math Jams URL) are added in Studio. Checked at 360, 390 and 1280px with stand-in logos: no horizontal scroll, 72px tiles. At 360px each tile takes a full row; at 390px two tiles share a row and a wide logo is scaled down to fit its 80px box. Screenshots in docs/screenshots/brands/. The design files in design-handoff/ were not updated (no design export was attached).
- Teachers game card, option 2d (Teachers Page v2 in Claude Design), for moment rows and search results alike: the card is a column. A top row puts the 16:10 thumbnail (clamp(112px, 28%, 132px)) beside the name and subtitle, centred; under it, full width, the "Builds …" / "Good for …" line; then a footer with the badges and a solid "Open game ↗" button (ink, orange on hover, 44px tall). The footer wraps: the badges take a 220px basis, so when the card is wide enough for both (about 350px inside the card, every desktop card) the button sits on the right of the badges; when it is narrower (every phone) the badges get the full width and the button gets its own full-width row below them. No media query is involved. The rows grid now fits two cards from 420px each (was 500px). At 640px and below the thumbnail is 112px (was 88px); the old full-width-button rule is gone, since the wrap does that job. Checked at 360, 390, 430 and 1280px: no horizontal scroll, the badges span the full card width on phones, and the button fills its row with no empty space beside it. Screenshots in docs/screenshots/c1-mobile/ updated. The design file in design-handoff/ was not updated in this round (no design export was attached).
- Real game data, part 1 (code): minutes are now one of "5", "10", "20", "30+" (strings, radio in Studio for the shared value and both overrides). The Minutes filter has those four options and each game matches its own value only; the badge reads "{value} min". `scripts/migrate-minutes.mts` converts stored numbers (10 → "10"). The import accepts only those four values, can read the final games list (`--sheet=Sheet2` of `scripts/games-final.xlsx`) as an update-only source, and turns every card image into a 1600×1000 JPG (centre crop, quality 85, under 1 MB) with sharp, taking Drive links. The Minutes columns of the template sheets are a 5,10,20,30+ dropdown and the Guide tab says so. See "Real data import notes".
- The footer is pinned to the bottom of the screen on pages shorter than it (the 404 page everywhere, the home page on very tall screens). Taller pages render pixel-identical to before.
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
- "Open game" spanned the full width of the row's text column, under the badges. Replaced by the option 2d card: the button sits at the right of the badges on wide cards and on its own full-width row below them on narrow cards, through flex-wrap rather than a media query.
- In the filter panel, "Clear all" shows once a filter or search is active, as on desktop.
- Two focus rings were clipped by their container's overflow on every screen size (the in-moment filter options and the moment headers). They are now drawn inside the element; this changes nothing until an element has keyboard focus.

## Task B2 notes

- Production (rh1roy5u/production) was already in the audience shape when this task started: all six games carried `teachers{}` / `parents{}` and all six moments had a games list, written in one transaction on 2026-10-12, with no `showOn`, `moments` or `featured` left on any game. The main branch's code still queried `showOn`, so the migration script's dry run and run against production both reported nothing to do. The migrate path was exercised against the old-shape seed through a local stand-in; the result is byte-for-byte what production holds, and is what `seed/seed.ndjson` now contains.
- Within a moment, games show in the moment's list order. The migration appended the old links featured-first then A–Z (the order the site showed), so nothing moved.
- Teachers grades are no longer worked out from the age range on the site. `gradesFromAge` in lib/derive.ts remains for the migration and seed only.
- The import does not require "Teacher moments" when a game is on the Teachers page (only grades, and "When" for parents, are required). A game with no moment is reachable through Teachers search and can be added to a moment in Studio.
- Moment → game references are strong. `--prune` takes a game out of every moment list before deleting it; in Studio, Sanity blocks deleting a game until it is removed from its moments.
- Dry run of `scripts/Games - Initial 60.xlsx` with `--allow-missing-images`: 366 problems, all blank required cells that the sheet's own Review tab marks as "fill in" (Subtitle, Minutes, Players and No reading needed on all 60 rows; Image description, Cost and Works offline on the 42 non-PBS rows). Every filled value validates.

## Real data import notes

- Source: `scripts/games-final.xlsx`, tab "Sheet2" (60 rows), supplied in the session; added to the repo as is apart from the Minutes dropdowns and Guide text.
- Production already matched Sheet2 on moments, grades, ages, When and URLs, so the import adds no moment entries; it fills in the real subtitles, minutes, players, no-reading flags, skills, feels-like and banners.
- Banners: 29 distinct Drive files for 60 games. The cloud session cannot reach drive.usercontent.google.com or googleapis.com, so 28 were pulled through the Google Drive connector into `scripts/images/<drive id>.<ext>` (git-ignored), which the import finds first. The Couch Games logo (`CGLogoSVG (1).png`, used by Make a Scene, Cappy & Tappy, Tents and Trees, Handshakes) could not be brought in; those four keep their placeholder until the file is put in `scripts/images/` as `1ZJF-9rTOFF8bz3hE4kD7x5AGxKMzJUIf.png` and the import re-run.
- 25 banners are 1600×1000 already and are only re-encoded (the PBS KIDS and PlayMath ones are transparent PNGs, now on white). Three are wide logos (Beast Academy, Star Stuff, Thinky Games); a 16:10 crop would cut 35–52% of them, so they are fitted on white with a 10% margin instead.
- Dry run of Sheet2: 5 problems, so nothing was written. Primary skills "logical reasoning" on Checkers Kids, Sum Blocks and CrossyBlock Math (not a skill; the first import mapped it to Logical deduction); "SuperWEIRD Math" has no existing game (production has "SuperWEIRD"); SuperWEIRD Math lists 4 skills (max 3; the first import kept the first 3). No subtitle is over 50 characters.
- Owner's decisions (2026-10-26): "logical reasoning" becomes Logical deduction, and Sheet2 now says so (C19, C33, C45). SuperWEIRD Math keeps its first 3 skills (Number sense dropped, C54). The existing "SuperWEIRD" game (`game-superweird`) is renamed "SuperWEIRD Math" before the import, so the row matches it and no duplicate is created. Wide logos stay whole on white with a margin and transparent images go on white; both are the importer's default. The Couch Games logo is skipped for now.

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

- 2026-10-26: the cloud session's proxy refuses drive.usercontent.google.com, drive.google.com and googleapis.com, so Drive files come in through the Google Drive connector instead (small files come back inline and are hard to save, which is why the Couch Games logo is missing).
- The cloud session's network policy allows api.sanity.io and GitHub but blocks thinkinggames-web.vercel.app, so the live site cannot be fetched from a cloud session unless that host is added to the environment's Allowed domains. As of 2026-10-21 both rh1roy5u.apicdn.sanity.io and thinkinggames-web.vercel.app are reachable from the cloud session.
- Earlier note: the cloud session's network policy blocked rh1roy5u.api.sanity.io, so pages and the production build cannot reach Sanity from there. Local verification used a stand-in that evaluates the site's GROQ queries against seed/seed.ndjson. Allow the host in the environment's network settings to lift this.
