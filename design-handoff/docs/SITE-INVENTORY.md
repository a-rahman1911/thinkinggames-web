# thinkinggames.com: current site inventory and new sitemap

## Current stack (WP Engine)
- Custom theme `thinkinggames` using ACF Pro, Yoast SEO, Wordfence and WP Migrate DB Pro.
- Brand tokens are in `theme.json`. Inter font. Colors:
  - Dark `#1e1e4e`, Orange `#f27332`
  - Teacher `#5d96ff`, Parent `#a8ed62`, Kid `#ffc700`, each with a light tint
- Analytics: PostHog (consent-gated through CookieYes). Tracking is fully suppressed on Kids pages. Server-side A/B tests run through `?ab_variant` and cookies.
- The mascot SVGs and Lottie mastheads (teacher, parent, kids, logo) can be reused as-is.

## Current pages → new routes
| Current | Template | New route |
|---|---|---|
| `/` Entry gate (persona chooser; redirects returning visitors by cookie) | page-entry-gate | `/` (same behavior; redirect runs in middleware, no JS flash) |
| `/teachers/` | page-persona | `/teachers` → **"Use it" accordion, one open at a time** (survey winner) |
| `/parents/` | page-persona | `/parents` → **Library with filters** (survey winner) |
| `/kids/` | page-persona | `/kids` (carried over; no tracking) |
| Philosophy | page-philosophy | `/philosophy` |
| Generic pages (privacy, terms…) | page.php | `/[slug]` |
| 404 | 404.php | `not-found` |

## Content today → Sanity schema
- **Initiative Card** (CPT). Fields: title, card image, external URL, CTA text, hide-from-personas, pin-to-top-for-personas.
  → `initiative` document with the same fields, plus per-persona URLs and copy.
- **Teacher, Parent and Kid tags** (one taxonomy per persona)
  → `tag` document with a `persona` field. These power the Library filters.
- **Persona page** (hero, benefits, grid heading, thinking level, go deeper, quote, section order)
  → `personaPage` singleton ×3.
- **Entry gate** (heading, subtext, action label) → `entryGate` singleton.
- **Site settings** (mission statement, menus, dev toolbar) → `siteSettings` singleton.
- **Yoast SEO fields** → `seo` object on every page.

## Carry over
- PostHog + CookieYes consent gating, including the explicit entry `$pageview`.
- Kids-page tracking suppression.
- A/B testing: move to PostHog feature flags, read in Next.js middleware.
- 301 redirects for any changed URLs.
