import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Highlight } from '@/components/Highlight'
import { IdeasIndex } from '@/components/ideas/IdeasIndex'
import { loadIdeas, toCard } from '@/components/ideas/load'

// Ideas (round 11). With the section switched off this address answers 404, like any address that does not exist.

export async function generateMetadata(): Promise<Metadata> {
  const ideas = await loadIdeas()
  if (!ideas) return {}
  const { texts } = ideas
  return {
    title: texts.seo?.title || texts.navLabel,
    description: texts.seo?.description || texts.intro,
    alternates: { canonical: '/ideas' },
  }
}

export default async function IdeasPage() {
  const ideas = await loadIdeas()
  if (!ideas) notFound()
  const { texts, articles } = ideas
  return (
    <div style={{ '--accent-light': 'var(--orange-light)' } as React.CSSProperties}>
      <Header current="ideas" ideasLabel={texts.navLabel} />
      <section className="wrap hero">
        <h1>
          <Highlight text={texts.headline} highlight={texts.highlight} />
        </h1>
        <p>{texts.intro}</p>
      </section>
      <main className="wrap idea-index">
        <IdeasIndex cards={articles.map(toCard)} />
      </main>
    </div>
  )
}
