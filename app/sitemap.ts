import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://thinkinggames.com'
  return ['', '/teachers', '/parents'].map((p) => ({ url: base + p, changeFrequency: 'weekly' }))
}
