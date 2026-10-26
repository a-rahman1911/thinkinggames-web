# thinkinggames-web

The Thinking Games website: Next.js 15 (App Router) + Sanity CMS, deployed on Vercel.

- **Site:** `/`, `/teachers`, `/parents`
- **CMS (Studio):** `/studio`. Editors log in here to edit text, games, moments, skills and "When" options. Publishing updates the live site in seconds, with no redeploy.

## First-time setup

```bash
npm install
cp .env.example .env.local

# 1. Create the Sanity project (log in with the account that should own it).
npx sanity init --env .env.local --create-project "Thinking Games" --dataset production
#    → this writes NEXT_PUBLIC_SANITY_PROJECT_ID into .env.local. Say "no" to any prompt
#      that offers to add config files or a template; they already exist here.

# 2. Load the placeholder content (6 games, 6 moments, skills, "When" options, page text).
#    --replace overwrites documents whose IDs match the seed file; it does not wipe the dataset,
#    so documents with other IDs are left in place. Never run it against the live dataset.
npm run seed

# 3. Run it.
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/studio. The first time you open the Studio, Sanity asks you to add `http://localhost:3000` as a CORS origin; click **Add**.

## Deploy (Vercel)
1. Vercel → **Add New → Project** → import this repo. The framework is detected as Next.js.
2. Add the environment variables from `.env.local`, plus `SANITY_REVALIDATE_SECRET` (any long random string).
3. Deploy, then complete Phase 4 in `SETUP-GUIDE.md`: add CORS origins and the webhook to `https://<your-site>/api/revalidate` using the same secret.

## How content flows
| Studio | Shows up on |
|---|---|
| Site settings | Footer mission text and links (all pages) |
| Home page | Headline, highlight word, two audience panels |
| Teachers page | Headline, search placeholder, Challenge banner, which moment opens first |
| Parents page | Headline, Challenge banner, empty-results message |
| Games | Three tabs. **Shared**: name, subtitle, URL, image, icon, and the facts (age range, minutes, players, cost, offline, no reading, platforms, skills, feels like), plus a `hidden` switch that takes the game off both pages. **Teachers**: "On Teachers page", grades (set by hand), and optional overrides. **Parents**: "On Parents page", "When", and the same overrides. An override (URL, subtitle, image, icon, minutes, skills, feels like, badges, featured) replaces the shared value on that page only; blank = use the shared value |
| Teacher moments | The accordion sections; `order` sets their position. Each moment has a **games** list: which games show under it and in what order. Drag to reorder in Studio. Only games that are on the Teachers page can be added |
| Skills | The "Builds …" line on cards. 1 to 3 per game |
| When options | The Parents "When" filter |

Games carry **facts only**. Everything shown is derived from them in `lib/derive.ts`, so filters and badges always agree. Each page first calls `resolve(game, 'teachers' | 'parents')`, which folds that audience's overrides into the shared values; every rule below works on the resolved values:

| Shown | Derived from |
|---|---|
| Teachers "Grade" (K-1, 2-3, 4-5) | `teachers.grades`, set by hand |
| Parents "Age" (4-5, 6-8, 9-11) | `ageFrom`–`ageTo`; a game matches every band its range overlaps |
| "Minutes" filter (5 / 10 / 20 / 30+) and the "N min" badge | resolved `minutes`, one of "5", "10", "20", "30+"; each game matches its own value only; the badge reads e.g. "30+ min" |
| Parents "Also": No reading needed, Together | `noReading`; `players` has anything other than Solo |
| Badges (first one highlighted) | cost, players joined with " / ", "N min", Offline, No reading needed, in that order; the audience's badges list keeps only those kinds (empty = all) |
| "Builds …" | resolved skill titles joined with " · " |
| Order inside a moment | the moment's games list, as ordered in Studio |
| Teachers search and the Parents Library | that audience's featured first, then A–Z; hidden games and games switched off for that audience are left out |

## Importing games from the spreadsheet

Editors fill in the Games spreadsheet (see its Guide and Lists tabs) and send it with a folder of images.

```bash
npm run import:games -- Games.xlsx ./images --dry-run   # validate only, prints a per-row error table
npm run import:games -- Games.xlsx ./images             # write
npm run import:games -- Games.xlsx ./images --prune     # also delete games that are no longer in the sheet
npm run import:games -- scripts/games-final.xlsx scripts/images --sheet=Sheet2 --dry-run   # the final games list (below)
```

- Needs `SANITY_WRITE_TOKEN` in `.env.local` (Sanity → API → Tokens, Editor role). Server only.
- Columns are the Shared, Teacher* and Parent* columns described on the sheet's Guide tab (`scripts/games-template.xlsx`). A Teacher*/Parent* "only if different" column left blank means "use the Shared value". Teacher grades are required when "On Teachers page" is Yes; "When (parents)" is required when "On Parents page" is Yes.
- Every row is validated first. If any row has a problem, nothing is written.
- Games are upserted by `game-<slugified name>`, so re-running updates. Rows whose Notes contain "EXAMPLE ROW" are skipped.
- Skills, moments and "When" values are matched case-insensitively against the Lists tab and the dataset; new ones are created.
- "Teacher moments": the game is added to the **end** of each listed moment's games list if it is not already there. Existing entries are never reordered or removed; reorder in Studio. Sheet row order sets the order of the games added in one run.
- An override image reuses the shared image description as its alt text.
- A "hidden" flag set in Studio survives re-imports.
- Minutes must be 5, 10, 20 or 30+ (the sheet's dropdown). Anything else is a row error.
- A subtitle over 50 characters is listed in the report and imported as written.
- `--allow-missing-images` (testing only) replaces an image file that cannot be found with a grey placeholder instead of failing the row. Off by default.

### Card images

An "Image file" cell (or a Teacher/Parent image file) can be a file name or a link, including a Google Drive share link. The import looks first for a file in the images folder whose name, or name without extension, is the cell or its Drive file ID (`scripts/images/<drive id>.png`, say), then downloads it (Drive files through `drive.usercontent.google.com`, which needs the file shared with "Anyone with the link"; the download is saved to the images folder, so each Drive file is fetched once). Every card image is then centre-cropped to 16:10, resized to 1600×1000 and saved as a JPG on white (quality 85, under 1 MB; copies in `<images>/processed/`). A source a crop would cut by more than a quarter, such as a wide logo, is fitted on white with a margin instead. Icons are uploaded as they are. `scripts/images/` is git-ignored.

### The final games list (`--sheet=Sheet2`)

`scripts/games-final.xlsx`, tab "Sheet2", is the real data for the 60 games. A tab with its headers (Game, URL, Primary skills, Best teacher moment, Parent moment, Feels like, Teacher Group, Parent Group, Subtitle, Minutes, Players, No Reading Needed?, Banners, optional Image description) only **updates existing games**:

- Each row must match an existing game by name (case-insensitive). Nothing is created; `--prune` is refused.
- Skills, moments and "When" values must already exist. "Last 10 minutes" means "The last 10 minutes" and "Friday reward" means "Friday reward time". Feels like "Game" means "A game".
- Parent Group 5-6 / 7-8 / 9-10 sets Age from and Age to. Teacher Group sets Teacher grades.
- Image description is optional; blank means "{name} screenshot".
- Only those fields are written. Cost, Works offline, platforms, partner, notes, icon, the on-page switches, overrides, featured and hidden keep their current values.
- An image that cannot be found or downloaded is listed, and that game keeps its current image. Every other problem stops the run as usual.

### One-off migration of minutes to options

Minutes used to be a whole number. `scripts/migrate-minutes.mts` turns the shared and override values into the option strings (5 → "5", 10 → "10", 20 → "20", 30 or more → "30+"; anything else goes up to the next option and is listed). Run it once the code that reads strings is deployed. Safe to re-run.

```bash
node --env-file-if-exists=.env.local scripts/migrate-minutes.mts --dry-run
node --env-file-if-exists=.env.local scripts/migrate-minutes.mts
```

### One-off migration to the audience shape

`scripts/migrate-audience.mts` moved existing games from the old `showOn` / `featured` / `when` / `moments` fields to `teachers{}` and `parents{}` (grades worked out once from the age range) and built each moment's games list from the old game → moment links. It is safe to re-run; games already in the new shape are left alone.

```bash
node --env-file-if-exists=.env.local scripts/migrate-audience.mts --dry-run
node --env-file-if-exists=.env.local scripts/migrate-audience.mts
```

## Code map
- `app/(site)/`: pages (server components that fetch from Sanity)
- `components/TeachersView.tsx`: search, one-open-at-a-time accordion, in-moment filters
- `components/ParentsView.tsx`: library filters (OR within a group, AND across groups) and live counts; on mobile (≤640px) the filters open as a full-screen panel from a sticky "Filters" button
- `components/ChallengeBanner.tsx`: shared banner with "Copy link"
- `sanity/schemas.ts`: the CMS content model
- `lib/derive.ts`: resolve per audience, then facts → filters, badges, "Builds" line, sort order (unit tests: `npm test`)
- `scripts/import-games.mts`: spreadsheet import
- `scripts/migrate-audience.mts`: one-off migration to the per-audience shape
- `scripts/migrate-minutes.mts`: one-off migration of minutes to the 5 / 10 / 20 / 30+ options
- `app/api/revalidate/route.ts`: webhook target that refreshes pages after a publish

## Not yet done (Phase 6)
- PostHog + CookieYes consent gating, ported from the WordPress theme's `header.php`
- 301 redirects from old WordPress URLs, in `next.config.mjs`
- Privacy and Terms pages (the footer links point to `/privacy` and `/terms`)
- Real game images, URLs and copy (the seed data is placeholder)
- Middleware that sends returning visitors straight to their audience page (needs a decision; see `SITE-INVENTORY.md`)
