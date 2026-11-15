import Link from 'next/link'
import { audienceLabel } from '@/lib/ideas'
import { IdeaCover } from './IdeaCover'
import type { IdeaCard } from './load'

/** An article in a grid: cover, audience label, title, summary, date and read time. The whole card is one link. */
export function IdeaCardLink({ card }: { card: IdeaCard }) {
  return (
    <Link href={`/ideas/${card.slug}`} className={`idea-card idea-${card.audience}`}>
      <IdeaCover card={card} size="card" />
      <div className="idea-card-text">
        <span className="idea-chip">{audienceLabel(card.audience)}</span>
        <h3>{card.title}</h3>
        {card.summary && <p className="idea-card-sum">{card.summary}</p>}
        <span className="idea-meta">{card.meta}</span>
      </div>
    </Link>
  )
}

/** The newest article on /ideas, as a large card. */
export function IdeaLead({ card }: { card: IdeaCard }) {
  return (
    <Link href={`/ideas/${card.slug}`} className={`idea-lead idea-${card.audience}`}>
      <IdeaCover card={card} size="lead" />
      <div className="idea-lead-text">
        <span className="idea-chip">{audienceLabel(card.audience)}</span>
        <h2>{card.title}</h2>
        {card.summary && <p className="idea-lead-sum">{card.summary}</p>}
        <span className="idea-meta">{card.meta}</span>
        <span className="idea-read" aria-hidden="true">
          Read it →
        </span>
      </div>
    </Link>
  )
}
