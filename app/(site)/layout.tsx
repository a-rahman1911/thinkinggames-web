import '../globals.css'
import { Footer } from '@/components/Footer'
import { sanityFetch } from '@/sanity/client'
import { settingsQuery } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await sanityFetch<Settings>(settingsQuery)
  return (
    <>
      {children}
      <Footer settings={settings} />
    </>
  )
}
