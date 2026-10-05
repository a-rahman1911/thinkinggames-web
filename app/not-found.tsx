import './globals.css'
import Link from 'next/link'
import { Header } from '@/components/Header'

export default function NotFound() {
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
    </>
  )
}
