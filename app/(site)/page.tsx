import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Highlight } from '@/components/Highlight'
import { sanityFetch } from '@/sanity/client'
import { homeQuery } from '@/sanity/queries'
import type { HomePage } from '@/sanity/types'

const PERSONA = {
  teachers: { href: '/teachers', bg: 'var(--teacher-light)', hover: '#cfdfff', c: 'var(--teacher)', mascot: 'mascot-teacher.svg' },
  parents: { href: '/parents', bg: 'var(--parent-light)', hover: '#cdf3a6', c: 'var(--parent)', mascot: 'mascot-parent.svg' },
} as const

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<HomePage>(homeQuery)
  return { title: page?.seo?.title || { absolute: 'Thinking Games Initiative' }, description: page?.seo?.description }
}

export default async function Home() {
  const page = await sanityFetch<HomePage>(homeQuery)
  return (
    <>
      <Header wordmark />
      <main>
        <section className="wrap home-hero">
          <h1>
            <Highlight text={page?.headline} highlight={page?.highlight} />
          </h1>
          {page?.subline && <p>{page.subline}</p>}
        </section>
        <div className="wrap doors">
          {page?.panels?.map((p) => {
            const s = PERSONA[p.persona]
            return (
              <Link
                key={p.persona}
                href={s.href}
                className="door"
                style={{ '--bg': s.bg, '--bg-hover': s.hover, '--c': s.c } as React.CSSProperties}
              >
                {p.eyebrow && <div className="eyebrow">{p.eyebrow}</div>}
                {p.title && <div className="door-title">{p.title}</div>}
                {p.text && <div className="door-text">{p.text}</div>}
                {p.cta && <span className="door-cta">{p.cta} →</span>}
                <img src={`/brand/${s.mascot}`} alt="" className={`door-mascot ${p.persona === 'parents' ? 'parent' : ''}`} />
              </Link>
            )
          })}
        </div>
      </main>
    </>
  )
}
