import '../globals.css'
import { Footer } from '@/components/Footer'
import { PreviewBar } from '@/components/ideas/PreviewBar'
import { isPreview } from '@/components/ideas/preview'
import { sanityFetch } from '@/sanity/client'
import { settingsQuery } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Ideas (round 11): a browser in preview gets a bar on every page. Everyone else gets nothing.
  const [settings, preview] = await Promise.all([sanityFetch<Settings>(settingsQuery), isPreview()])
  return (
    <>
      {preview && <PreviewBar />}
      <div className="page">{children}</div>
      <Footer settings={settings} />
    </>
  )
}
