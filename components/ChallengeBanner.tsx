'use client'

import { toPersona, track } from '@/lib/analytics'
import type { Audience } from '@/lib/audience'
import type { Challenge } from '@/sanity/types'

/** `audience` is the page it is on, for the `challenge_clicked` event (round 14). */
export function ChallengeBanner({ data, audience }: { data?: Challenge; audience: Audience }) {
  if (!data || data.show === false) return null

  return (
    <section className="challenge" aria-labelledby="challenge-title">
      <div className="challenge-copy">
        {data.eyebrow && <div className="eyebrow">{data.eyebrow}</div>}
        <h2 id="challenge-title" className="challenge-title">
          {data.title}
        </h2>
        {data.text && <p>{data.text}</p>}
      </div>
      <div className="challenge-actions">
        {data.buttons?.map((b) => (
          <a
            key={b.label}
            className="challenge-age"
            href={b.url}
            target="_blank"
            rel="noopener"
            onClick={() => track('challenge_clicked', { band: b.label, persona: toPersona(audience), external_url: b.url })}
          >
            {b.label}
          </a>
        ))}
      </div>
    </section>
  )
}
