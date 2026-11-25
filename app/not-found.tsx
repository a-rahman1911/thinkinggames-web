import './globals.css'
import Link from 'next/link'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ConsentBanner } from '@/components/consent/ConsentBanner'
import { loadTracking } from '@/components/consent/load'
import { loadIdeasLabel } from '@/components/ideas/load'
import { sanityFetch } from '@/sanity/client'
import { settingsQuery } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

// Unmatched URLs land here, outside the (site) layout, so this page renders the site footer itself.
export default async function NotFound() {
  const [settings, ideasLabel, tracking] = await Promise.all([sanityFetch<Settings>(settingsQuery), loadIdeasLabel(), loadTracking()])
  return (
    <>
      {/* The footer logo's target (round 16): first in the page, so the next Tab after it starts from the top. */}
      <div id="top" tabIndex={-1} />
      {tracking && <ConsentBanner texts={tracking} />}
      <div className="page">
        <Header ideasLabel={ideasLabel} />
        <main className="wrap hero" style={{ paddingBottom: 96, '--accent': 'var(--orange-light)' } as React.CSSProperties}>
          <h1>
            This page <span className="hl">wandered off.</span>
          </h1>
          <p>
            Try the <Link href="/teachers">teacher toolkit</Link> or the <Link href="/parents">parent library</Link>.
          </p>
        </main>
      </div>
      <Footer settings={settings} cookieSettings={!!tracking} />
    </>
  )
}
