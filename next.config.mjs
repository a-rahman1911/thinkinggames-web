/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add 301s from old WordPress URLs here before cutover (Phase 6).
  async redirects() {
    return [
      // { source: '/old-path/', destination: '/parents', permanent: true },
    ]
  },
}

export default nextConfig
