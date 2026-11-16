// Old WordPress addresses (the domain moved to this site on 2026-11-16).
const OLD_ADDRESSES = [
  ['/privacy-policy', '/privacy'],
  ['/kids', '/parents'],
  ['/our-philosophy', '/'],
  ['/contact', '/'],
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js would first send "/kids/" to "/kids" and only then to "/parents": two hops. With its own
  // trailing-slash redirect switched off, the old addresses below go to their new page in one hop, with or
  // without the slash, and the last rule does for every other address what Next.js did ("/teachers/" → "/teachers").
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      ...OLD_ADDRESSES.flatMap(([source, destination]) => [
        { source, destination, permanent: true },
        { source: `${source}/`, destination, permanent: true },
      ]),
      { source: '/:path+/', destination: '/:path+', permanent: true },
    ]
  },
}

export default nextConfig
