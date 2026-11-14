import type { MetadataRoute } from 'next'

// `/` is not listed: it shows the Parents page (with the welcome pop-up) and its canonical is /parents.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://thinkinggames.com'
  return ['/teachers', '/parents'].map((p) => ({ url: base + p, changeFrequency: 'weekly' }))
}
