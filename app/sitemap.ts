import type { MetadataRoute } from 'next'
import { loadPublicIdeas } from '@/components/ideas/load'

// `/` is not listed: it shows the Parents page (with the welcome pop-up) and its canonical is /parents.
// Ideas (round 11): /ideas and every article are added only while the section is switched on.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://thinkinggames.com'
  const pages: MetadataRoute.Sitemap = ['/teachers', '/parents'].map((p) => ({ url: base + p, changeFrequency: 'weekly' }))
  const ideas = await loadPublicIdeas()
  if (!ideas) return pages
  return [
    ...pages,
    { url: `${base}/ideas`, changeFrequency: 'weekly' },
    ...ideas.articles.map((a) => ({ url: `${base}/ideas/${a.slug}`, lastModified: a._updatedAt })),
  ]
}
