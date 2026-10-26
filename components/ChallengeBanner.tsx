import type { Challenge } from '@/sanity/types'

export function ChallengeBanner({ data }: { data?: Challenge }) {
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
          <a key={b.label} className="challenge-age" href={b.url} target="_blank" rel="noopener">
            {b.label}
          </a>
        ))}
      </div>
    </section>
  )
}
