import Link from 'next/link'
import { IdeaCardLink } from './IdeaCards'
import type { IdeaCard } from './load'

/**
 * A soft grey band with a heading and up to three articles. Above the footer on /teachers and /parents
 * ("Ideas for teachers", with an "All ideas →" link) and under an article ("More ideas for parents").
 * With no articles it renders nothing.
 */
export function IdeaStrip({ heading, cards, allLink }: { heading: string; cards: IdeaCard[]; allLink?: boolean }) {
  if (!cards.length) return null
  return (
    <section className="idea-strip" aria-labelledby="idea-strip-title">
      <div className="wrap">
        <div className="idea-strip-head">
          <h2 id="idea-strip-title">{heading}</h2>
          {allLink && (
            <Link href="/ideas" className="idea-all">
              All ideas →
            </Link>
          )}
        </div>
        <div className="idea-grid">
          {cards.map((c) => (
            <IdeaCardLink key={c.slug} card={c} />
          ))}
        </div>
      </div>
    </section>
  )
}
