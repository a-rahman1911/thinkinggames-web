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
#    Only on a fresh dataset: --replace wipes everything already there. Never run it against the live dataset.
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
| Games | Name, subtitle, URL, image, and the facts: age range, minutes, players, cost, offline, no reading, platforms, skills, feels like, when, teacher moments, show on |
| Teacher moments | The accordion sections; `order` sets their position. A game appears under a moment through the game's "Teacher moments" field |
| Skills | The "Builds …" line on cards. 1 to 3 per game |
| When options | The Parents "When" filter |

Games carry **facts only**. Everything shown is derived from them in `lib/derive.ts`, so filters and badges always agree:

| Shown | Derived from |
|---|---|
| Parents "Age" (4-5, 6-8, 9-11) and Teachers "Grade" (K-1 = ages 5–7, 2-3 = 7–9, 4-5 = 9–11) | `ageFrom`–`ageTo`; a game matches every band its range overlaps |
| "Minutes" filter (5 / 10 / 20) | `minutes`: 5 if at most 5, 10 if 6–10, 20 if more |
| Parents "Also": No reading needed, Together | `noReading`; `players` has anything other than Solo |
| Badges (first one highlighted) | cost, players joined with " / ", "N min", Offline, No reading needed, in that order |
| "Builds …" | skill titles joined with " · " |
| Order | featured first, then name; hidden games are left out |

## Importing games from the spreadsheet

Editors fill in the Games spreadsheet (see its Guide and Lists tabs) and send it with a folder of images.

```bash
npm run import:games -- Games.xlsx ./images --dry-run   # validate only, prints a per-row error table
npm run import:games -- Games.xlsx ./images             # write
npm run import:games -- Games.xlsx ./images --prune     # also delete games that are no longer in the sheet
```

- Needs `SANITY_WRITE_TOKEN` in `.env.local` (Sanity → API → Tokens, Editor role). Server only.
- Every row is validated first. If any row has a problem, nothing is written.
- Games are upserted by `game-<slugified name>`, so re-running updates. Rows whose Notes contain "EXAMPLE ROW" are skipped.
- Skills, moments and "When" values are matched case-insensitively against the Lists tab and the dataset; new ones are created.
- A "hidden" flag set in Studio survives re-imports.

## Code map
- `app/(site)/`: pages (server components that fetch from Sanity)
- `components/TeachersView.tsx`: search, one-open-at-a-time accordion, in-moment filters
- `components/ParentsView.tsx`: library filters (OR within a group, AND across groups) and live counts
- `components/ChallengeBanner.tsx`: shared banner with "Copy link"
- `sanity/schemas.ts`: the CMS content model
- `lib/derive.ts`: facts → filters, badges, "Builds" line, sort order (unit tests: `npm test`)
- `scripts/import-games.mts`: spreadsheet import
- `app/api/revalidate/route.ts`: webhook target that refreshes pages after a publish

## Not yet done (Phase 6)
- PostHog + CookieYes consent gating, ported from the WordPress theme's `header.php`
- 301 redirects from old WordPress URLs, in `next.config.mjs`
- Privacy and Terms pages (the footer links point to `/privacy` and `/terms`)
- Real game images, URLs and copy (the seed data is placeholder)
- Middleware that sends returning visitors straight to their audience page (needs a decision; see `SITE-INVENTORY.md`)
