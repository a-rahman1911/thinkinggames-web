// The name of the site a game lives on, shown above the game's name on its card: "On PBS KIDS".
// This site is a guide: every game opens somewhere else, and the card says where.
//
// Nothing here touches Sanity or React, so it is unit-tested directly (lib/site.test.mts).

/** Known hosts. A host matches when it is one of these or ends with "." plus one of these (www. and other subdomains). */
export const SITE_NAMES: Record<string, string> = {
  'playmath.org': 'PlayMath',
  'pbskids.org': 'PBS KIDS',
  'beastacademy.com': 'Beast Academy',
  'inkwellgames.com': 'Inkwell Games',
  'couchgames.com': 'CouchGames',
  'superweird.io': 'SuperWEIRD',
  'starstuffedu.org': 'Star Stuff',
  'thinkygames.com': 'Thinky Games',
}

/** The site name for a host from the table, or null. */
export function siteFromUrl(url?: string | null): string | null {
  if (!url) return null
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return null
  }
  for (const [known, name] of Object.entries(SITE_NAMES)) if (host === known || host.endsWith(`.${known}`)) return name
  return null
}

/**
 * The site name for a game's card: the game's own `site` field if it is filled, otherwise worked out
 * from the URL the card links to (pass the resolved URL, after the audience override). Null = no name known.
 */
export const siteName = (g: { site?: string | null; url?: string | null }): string | null => g.site?.trim() || siteFromUrl(g.url)
