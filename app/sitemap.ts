import type { MetadataRoute } from 'next'
import { loadPublicIdeas } from '@/components/ideas/load'
import { loadPrivacy } from '@/lib/privacy-load'

// `/` is not listed: it shows the Parents page (with the welcome pop-up) and its canonical is /parents.
// Ideas (round 11): /ideas and every article are added only while the section is switched on.
// Privacy (round 13): /privacy is added only when the page exists (a document with text).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://thinkinggames.com'
  const pages: MetadataRoute.Sitemap = ['/teachers', '/parents'].map((p) => ({ url: base + p, changeFrequency: 'weekly' }))
  const [ideas, privacy] = await Promise.all([loadPublicIdeas(), loadPrivacy()])
  return [
    ...pages,
    ...(ideas
      ? [
          { url: `${base}/ideas`, changeFrequency: 'weekly' as const },
          ...ideas.articles.map((a) => ({ url: `${base}/ideas/${a.slug}`, lastModified: a._updatedAt })),
        ]
      : []),
    ...(privacy ? [{ url: `${base}/privacy`, lastModified: privacy._updatedAt }] : []),
  ]
}
