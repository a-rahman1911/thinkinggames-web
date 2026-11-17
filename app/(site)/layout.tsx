import '../globals.css'
import { Footer } from '@/components/Footer'
import { ConsentBanner } from '@/components/consent/ConsentBanner'
import { loadTracking } from '@/components/consent/load'
import { PreviewBar } from '@/components/ideas/PreviewBar'
import { isPreview } from '@/components/ideas/preview'
import { sanityFetch } from '@/sanity/client'
import { settingsQuery } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Ideas (round 11): a browser in preview gets a bar on every page. Everyone else gets nothing.
  // Round 14: `tracking` is null while tracking is switched off, and then nothing of it is on the page.
  const [settings, preview, tracking] = await Promise.all([sanityFetch<Settings>(settingsQuery), isPreview(), loadTracking()])
  return (
    <>
      {tracking && <ConsentBanner texts={tracking} />}
      {preview && <PreviewBar />}
      <div className="page">{children}</div>
      <Footer settings={settings} cookieSettings={!!tracking} />
    </>
  )
}
