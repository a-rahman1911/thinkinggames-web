'use client'

import { useState } from 'react'
import { filterArticles, type PageAudience } from '@/lib/ideas'
import { IdeaCardLink, IdeaLead } from './IdeaCards'
import type { IdeaCard } from './load'

type Choice = 'all' | PageAudience

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'teachers', label: 'For teachers' },
  { value: 'parents', label: 'For parents' },
]

/** The list on /ideas: a filter (one choice at a time), the newest article as a large card, the rest in a grid. */
export function IdeasIndex({ cards }: { cards: IdeaCard[] }) {
  const [choice, setChoice] = useState<Choice>('all')
  // Articles for both audiences appear under every choice. The cards arrive newest first.
  const [lead, ...rest] = filterArticles(cards, choice)
  const count = rest.length + (lead ? 1 : 0)

  if (!cards.length) return <p className="empty">Nothing here yet.</p>

  return (
    <>
      <div className="idea-filter" role="group" aria-label="Show ideas">
        {CHOICES.map((c) => (
          <button key={c.value} type="button" aria-pressed={choice === c.value} onClick={() => setChoice(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {count === 1 ? '1 article' : `${count} articles`}
      </p>
      {lead ? (
        <>
          <IdeaLead card={lead} />
          {rest.length > 0 && (
            <div className="idea-grid">
              {rest.map((c) => (
                <IdeaCardLink key={c.slug} card={c} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="empty">Nothing here yet.</p>
      )}
    </>
  )
}
