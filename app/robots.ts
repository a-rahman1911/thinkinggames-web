import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Block indexing on preview/staging deploys; only production is indexed.
  const isProd = process.env.VERCEL_ENV === 'production'
  return isProd
    ? { rules: { userAgent: '*', allow: '/', disallow: '/studio' }, sitemap: 'https://thinkinggames.com/sitemap.xml' }
    : { rules: { userAgent: '*', disallow: '/' } }
}
