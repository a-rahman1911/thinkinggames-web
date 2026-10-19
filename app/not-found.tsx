import './globals.css'
import Link from 'next/link'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { sanityFetch } from '@/sanity/client'
import { settingsQuery } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

// Unmatched URLs land here, outside the (site) layout, so this page renders the site footer itself.
export default async function NotFound() {
  const settings = await sanityFetch<Settings>(settingsQuery)
  return (
    <>
      <Header />
      <main className="wrap hero" style={{ paddingBottom: 96, '--accent': 'var(--orange-light)' } as React.CSSProperties}>
        <h1>
          This page <span className="hl">wandered off.</span>
        </h1>
        <p>
          Try the <Link href="/teachers">teacher toolkit</Link> or the <Link href="/parents">parent library</Link>.
        </p>
      </main>
      <Footer settings={settings} />
    </>
  )
}
