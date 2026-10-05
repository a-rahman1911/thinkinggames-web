# Handoff: thinkinggames.com rebuild (for Claude Cowork / Claude Code)

## Your job
Get the finished Next.js + Sanity codebase in `code/thinkinggames-web/` running, pushed to GitHub, and deployed to Vercel, with the Sanity CMS connected so edits go live without a redeploy.

The code was written without being run. **Expect a few install or type errors. Fix them, but don't redesign anything.** The HTML files in `designs/` are the visual source of truth.

## Context
- **Client:** Thinking Games Initiative (thinkinggames.com). The current site is WordPress on WP Engine and stays live until cutover.
- **Owner/operator:** a consultant. The repo is on their personal GitHub, and Vercel and Sanity start on their login before being transferred to the client.
- **Editors:** 2 people, a few edits a month. They edit text, games, images, URLs and filters in Sanity Studio at `/studio`.
- **Budget:** up to $60/mo. The plan costs about $20/mo (Vercel Pro); Sanity Free plan.
- **Scope:** Home, Teachers and Parents pages only. Kids and Philosophy pages are intentionally **out of scope**.

## Steps (do them in order, and confirm with the user before any step that costs money or changes DNS)

### 1. Repo
- Target: `https://github.com/a-rahman1911/thinkinggames-web` (branch `main`; currently only contains a README).
- Clone it, copy everything from `code/thinkinggames-web/` into it, **including dotfiles** (`.gitignore`, `.env.example`), and keep the code's README.

### 2. Install and fix
```bash
npm install
npm run typecheck
npm run build
```
- Fix any errors at their root. Keep dependency versions current-stable for Next 15, React 19, `next-sanity` and `sanity` v3. Upgrade or pin versions if peer-dependency conflicts appear.
- Known areas to double-check:
  - `app/studio/[[...tool]]/page.tsx`: the import paths for `metadata` and `viewport` from `next-sanity/studio`.
  - The `@sanity/image-url` type import path in `sanity/client.ts` and `sanity/types.ts`.
  - The Studio route must not inherit `app/(site)/layout.tsx`. It doesn't: the site layout lives in the `(site)` route group, and Studio sits at the `app/studio` level.
  - `app/not-found.tsx` imports `./globals.css` because it sits outside the `(site)` group.

### 3. Sanity
```bash
cp .env.example .env.local
npx sanity init --env .env.local --create-project "Thinking Games" --dataset production
```
- Don't let the init overwrite `sanity.config.ts` or `sanity.cli.ts`.
- Run `npm run seed` to import `seed/seed.ndjson`: placeholder games, moments, filter options and page text.
- Run `npm run dev`, then check `/`, `/teachers`, `/parents` and `/studio`. Add `http://localhost:3000` as a CORS origin when prompted.
- Compare each page against its file in `designs/` (open those in a browser) and fix any visual drift.

### 4. Commit and push
- `git add . && git commit -m "Initial site: Next.js + Sanity" && git push origin main`

### 5. Vercel (the user clicks; you guide them)
Follow **Phase 3** in `docs/SETUP-GUIDE.md`: import the repo, then set these environment variables:
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET=production`
- `SANITY_REVALIDATE_SECRET` (generate it with `openssl rand -hex 32`)

### 6. Sanity webhook and CORS
Follow **Phase 4** in `docs/SETUP-GUIDE.md`:
- Webhook: `POST https://<vercel-url>/api/revalidate` with the same secret.
- Test it: edit the Teachers headline in `/studio`, publish, and confirm the live page updates within about 10 seconds.

### 7. Stop before cutover
Phases 5–7 (staging domain, content migration, DNS cutover) need the user's go-ahead.

## Design reference
- `designs/Homepage.dc.html`: use option **1a** ("Two doors"). Ignore 1b.
- `designs/Teachers Page v2.dc.html`: search in the header, a subtle hero, the Thinking Challenge banner, and a "moments" accordion where only one is open at a time, with Grade / Minutes / Feels-like filters inside the open moment.
- `designs/Parents Library.dc.html`: a subtle hero, the Challenge banner, a filter sidebar, search, active chips and a card grid.
- Open these files directly in a browser; `support.js` must sit next to them. They are **high-fidelity**, so match spacing, type and color.

### Design tokens (already in `app/globals.css`)
| Token | Hex |
|---|---|
| Ink (text, dark bands) | `#1e1e4e` |
| Ink 2 (footer strip) | `#16163d` |
| Orange (accent, focus) | `#f27332` |
| Orange light | `#fce3d6` |
| Teacher | `#5d96ff` |
| Teacher light | `#dfeaff` |
| Parent | `#a8ed62` |
| Parent light | `#dcf8c0` |
| Muted text | `#4a4d6e` |
| Line | `#e2e4ec` |
| Soft background | `#f8f8fa` |

- **Font:** Inter at weights 400, 500, 700 and 800.
- **Radii:** 999px for pills and buttons, 20px for cards, the accordion and the banner; 16px for rows; 10px for thumbnails.
- **Max content width:** 1280px. Side padding is `clamp(20px,5vw,64px)`.

### Behavior rules
- **Teachers accordion:** only one moment is open at a time. Clicking the open one closes it. The moment that opens first is set by `teachersPage.defaultOpen` in the CMS (1-based; 0 means all closed).
- **Teachers filters:** one choice per group, and clicking it again clears it. A game shows only if it matches every chosen option. Filters carry over when you open another moment.
- **Teachers search:** typing replaces the accordion with matching games, each labeled "Good for <moments>". "Back to moments" clears the search.
- **Parents filters:** a game shows if it matches any ticked option within a group and every group that has a tick. Each option shows how many games it would leave, and options that would leave none are disabled.
- **Challenge banner:** the age buttons open in a new tab, and "Copy link" copies `shareUrl`, showing "Link copied ✓" for 1.6s.

## Out of scope for now (listed in the code README)
- PostHog + CookieYes consent gating. Port it from the WP theme's `header.php`; the WP files are on the user's machine as `site-thinkinggmsprd-live`.
- 301 redirects from the old WP URLs.
- Privacy and Terms pages.
- Real content and images.

## Files
- `code/thinkinggames-web/`: the full codebase
- `designs/`: the HTML design references and brand SVGs
- `docs/SETUP-GUIDE.md`: phases 1–7, accounts through DNS cutover
- `docs/SITE-INVENTORY.md`: the current WP site, the route map and the content model
