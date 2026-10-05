# thinkinggames-web

The Thinking Games website: Next.js 15 (App Router) + Sanity CMS, deployed on Vercel.

- **Site:** `/`, `/teachers`, `/parents`
- **CMS (Studio):** `/studio`. Editors log in here to edit text, games, moments and filters. Publishing updates the live site in seconds, with no redeploy.

## First-time setup

```bash
npm install
cp .env.example .env.local

# 1. Create the Sanity project (log in with the account that should own it).
npx sanity init --env .env.local --create-project "Thinking Games" --dataset production
#    → this writes NEXT_PUBLIC_SANITY_PROJECT_ID into .env.local. Say "no" to any prompt
#      that offers to add config files or a template; they already exist here.

# 2. Load the placeholder content (6 games, 6 moments, filters, page text).
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
| Teacher moments | The accordion. Drag games into each moment; `order` sets their position |
| Games | Name, tagline, "Builds", image, URL, badges, which filters it matches |
| Filter options | The options inside each filter group (Grade, Minutes, Age, When…) |

Filter **groups** are defined in `sanity/groups.ts`. Adding a new group is a small code change; adding or renaming **options** is done in Studio.

## Code map
- `app/(site)/`: pages (server components that fetch from Sanity)
- `components/TeachersView.tsx`: search, one-open-at-a-time accordion, in-moment filters
- `components/ParentsView.tsx`: library filters (OR within a group, AND across groups) and live counts
- `components/ChallengeBanner.tsx`: shared banner with "Copy link"
- `sanity/schemas.ts`: the CMS content model
- `app/api/revalidate/route.ts`: webhook target that refreshes pages after a publish

## Not yet done (Phase 6)
- PostHog + CookieYes consent gating, ported from the WordPress theme's `header.php`
- 301 redirects from old WordPress URLs, in `next.config.mjs`
- Privacy and Terms pages (the footer links point to `/privacy` and `/terms`)
- Real game images, URLs and copy (the seed data is placeholder)
- Middleware that sends returning visitors straight to their audience page (needs a decision; see `SITE-INVENTORY.md`)
