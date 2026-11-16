import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText, type PortableTextComponents } from 'next-sanity'
import { Header } from '@/components/Header'
import { loadIdeasLabel } from '@/components/ideas/load'
import { PRIVACY_TITLE, formatUpdated } from '@/lib/privacy'
import { loadPrivacy } from '@/lib/privacy-load'

// Privacy policy (round 13). The text is the "Privacy policy" document in Studio.
// With no document, or an empty body, this address answers 404.

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPrivacy()
  if (!page) return {}
  return {
    title: page.seo?.title || page.title?.trim() || PRIVACY_TITLE,
    description: page.seo?.description,
    alternates: { canonical: '/privacy' },
  }
}

// The whole menu: text, two heading levels, bulleted lists, bold, italic, links. Anything else is left out.
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
  },
  list: { bullet: ({ children }) => <ul>{children}</ul> },
  marks: {
    link: ({ value, children }) => {
      const href: string = value?.href || ''
      if (!href) return <>{children}</>
      if (href.startsWith('/')) return <Link href={href}>{children}</Link>
      if (href.startsWith('mailto:')) return <a href={href}>{children}</a>
      return (
        <a href={href} target="_blank" rel="noopener">
          {children}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      )
    },
  },
  unknownType: () => null,
  unknownMark: ({ children }) => <>{children}</>,
}

export default async function PrivacyPage() {
  const [page, ideasLabel] = await Promise.all([loadPrivacy(), loadIdeasLabel()])
  if (!page) notFound()
  const updated = formatUpdated(page.updated)
  return (
    <>
      <Header ideasLabel={ideasLabel} />
      <main className="wrap privacy">
        <article>
          <h1>{page.title?.trim() || PRIVACY_TITLE}</h1>
          {updated && <p className="privacy-date">Last updated {updated}</p>}
          <PortableText value={page.body!} components={components} onMissingComponent={false} />
        </article>
      </main>
    </>
  )
}
