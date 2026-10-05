# thinkinggames.com setup guide (Next.js + Sanity + Vercel)

Steps marked **(You)** are done in a browser and take minutes. Steps marked **(Build)** are done by Claude Code or a developer in the repo.

---

## Phase 1: Accounts (You, about 30 min)
The repo lives on your personal GitHub. Vercel and Sanity should be owned by the **client** (a shared client email such as `web@…`), so they keep the hosting and the content if the engagement ends.

1. **GitHub (your personal account):** create a **private** repo: `thinkinggames-web`. Tick "Add a README".
   - Repo → Settings → **Collaborators** → invite people as needed (Write to work on the code, Admin to manage the repo). Collaborators are free.
   - At handoff, Settings → **Transfer ownership** moves the repo to the client's account or org. Commit history stays intact, and Vercel reconnects in one click.
2. **Vercel:** sign up with the client email, create a **Pro team** ($20/mo, billed to the client), and invite yourself.
   - The client's Vercel team can deploy a repo on your personal GitHub. Install the Vercel GitHub app on your account and grant it access to this one repo only.
3. **Sanity:** sign up with the client email (Free plan) and invite yourself as Administrator.
   - You don't need to create a project yet; the build step creates it.

## Phase 2: Scaffold the repo (Build, about 1 hr)
1. Clone the repo locally.
2. Create the app: `npx create-next-app@latest .` (TypeScript, App Router, Tailwind optional).
3. Create the CMS: `npm create sanity@latest`. Choose **"create new project"**, dataset `production`, and embed the Studio at `/studio`.
4. Add `next-sanity` and build the schemas from `SITE-INVENTORY.md`:
   - `siteSettings`: header, footer, mission text, links
   - `homePage`, `teachersPage`, `parentsPage`: headline, subline, Challenge banner fields
   - `moment`: title, blurb, order, games[]
   - `game`: name, tagline, builds, image, URL, tags, grades, minutes, feelsLike, ages
   - `filterOption`: group, label, order, persona
5. Build the pages from `Homepage.dc.html`, `Teachers Page v2.dc.html` and `Parents Library.dc.html`.
6. Add `/api/revalidate`, which Sanity's webhook calls to refresh pages.
7. Push to `main`.

## Phase 3: Connect Vercel (You, 10 min)
1. Vercel → **Add New → Project** → import `thinkinggames-web`.
2. Add these **Environment Variables** (Build provides the values):
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` = `production`
   - `SANITY_API_READ_TOKEN`
   - `SANITY_REVALIDATE_SECRET` (any long random string)
   - `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (copy from the current site)
3. Click **Deploy**. You get a URL like `thinkinggames-web.vercel.app`.
4. From now on, every pushed branch gets its own preview URL, and `main` is production.

## Phase 4: Connect Sanity (You, 10 min)
At sanity.io/manage → your project:
1. **API → CORS origins:** add `http://localhost:3000`, the `*.vercel.app` URL, and later `https://thinkinggames.com`. Tick "Allow credentials".
2. **API → Webhooks → Create:**
   - URL: `https://<site>/api/revalidate`
   - Trigger on create, update and delete
   - Secret: the same value as `SANITY_REVALIDATE_SECRET`
3. **Members:** invite the product owner as **Editor** (2 seats is within the Free plan).
4. Test: open `<site>/studio`, edit a headline and publish. The live page should update within seconds, with no redeploy.

## Phase 5: Staging domain (You, 5 min)
1. Vercel → Project → **Settings → Domains** → add `staging.thinkinggames.com`.
2. At your DNS host, add the **CNAME** record Vercel shows (usually `cname.vercel-dns.com`).
3. Review the new site at staging while the current site stays live.

## Phase 6: Content and parity (You + Build)
1. Enter the real games, moments and filters in Studio. WP admin → Tools → Export can provide the current text and images.
2. List every current URL and add 301 redirects for any that change (in `next.config` `redirects()`).
3. Carry over PostHog, CookieYes consent gating, and no tracking on any kids URLs.
4. Run the QA checklist: mobile, filters, search, Challenge links, 404 page, page titles and SEO, analytics events.

## Phase 7: Cutover (You, 15 min plus waiting)
1. **A day before:** at your DNS host, lower the TTL on `thinkinggames.com` and `www` to 300 seconds.
2. Vercel → Domains → add `thinkinggames.com` and `www.thinkinggames.com`, and set one to redirect to the other.
3. At your DNS host, replace the WP Engine records with the **A** and **CNAME** values Vercel shows.
4. Vercel issues the SSL certificate automatically, usually within minutes.
5. **Rollback:** put the old WP Engine records back. With the low TTL, that takes about 5 minutes.
6. Keep WP Engine running for 2 weeks, take a final backup, then cancel it.

---

## Monthly cost
Vercel Pro is $20. GitHub, Sanity and the domain cost nothing new, for about $20/mo in total.
