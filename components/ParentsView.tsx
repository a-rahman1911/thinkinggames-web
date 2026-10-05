'use client'

import { useState } from 'react'
import { ChallengeBanner } from './ChallengeBanner'
import { Badges, GameImage } from './GameBits'
import { Header } from './Header'
import { Highlight } from './Highlight'
import { PARENT_GROUPS } from '@/sanity/groups'
import type { Game, ParentsData } from '@/sanity/types'

type Sel = Record<string, string[]>

export function ParentsView({ data }: { data: ParentsData }) {
  const { page, games, options } = data
  const [sel, setSel] = useState<Sel>({})
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const groups = PARENT_GROUPS.map((g) => ({ ...g, options: options.filter((o) => o.group === g.key) })).filter(
    (g) => g.options.length,
  )

  // OR within a group, AND across groups. `skip` lets a group count its own options.
  const matches = (g: Game, skip?: string) => {
    if (q && !g.name.toLowerCase().includes(q)) return false
    return groups.every(
      (gr) => gr.key === skip || !sel[gr.key]?.length || sel[gr.key].some((id) => g.filters?.some((f) => f._id === id)),
    )
  }

  const toggle = (group: string, id: string) =>
    setSel((s) => {
      const cur = s[group] || []
      return { ...s, [group]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
    })

  const results = games.filter((g) => matches(g))
  const active = groups.flatMap((gr) =>
    (sel[gr.key] || []).map((id) => ({ group: gr.key, id, label: gr.options.find((o) => o._id === id)?.label || '' })),
  )
  const hasFilters = active.length > 0 || !!q
  const clearAll = () => {
    setSel({})
    setQuery('')
  }

  return (
    <div style={{ '--accent': 'var(--parent)', '--accent-light': 'var(--parent-light)' } as React.CSSProperties}>
      <Header current="parents" />

      <section className="wrap hero">
        <h1>
          <Highlight text={page?.headline} highlight={page?.highlight} />
        </h1>
        {page?.subline && <p>{page.subline}</p>}
      </section>

      <div className="wrap" style={{ paddingTop: 'clamp(24px,3vw,32px)' }}>
        <ChallengeBanner data={page?.challenge} />
      </div>

      <main className="wrap lib" style={{ paddingBlock: 'clamp(24px,3vw,32px) clamp(64px,8vw,112px)' }}>
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            {hasFilters && (
              <button className="link-btn" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          {groups.map((gr) => (
            <fieldset key={gr.key} className="fgroup">
              <legend>{gr.label}</legend>
              {gr.options.map((o) => {
                const on = !!sel[gr.key]?.includes(o._id)
                const count = games.filter((g) => g.filters?.some((f) => f._id === o._id) && matches(g, gr.key)).length
                return (
                  <button
                    key={o._id}
                    className="fopt"
                    aria-pressed={on}
                    disabled={!on && count === 0}
                    onClick={() => toggle(gr.key, o._id)}
                  >
                    <span className="fbox" aria-hidden="true">
                      <span />
                    </span>
                    <span className="fname">{o.label}</span>
                    <span className="fcount">{count}</span>
                  </button>
                )
              })}
            </fieldset>
          ))}
        </aside>

        <div className="results">
          <label className="search lg">
            <span className="sr-only">Search games by name</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={page?.searchPlaceholder || 'Search games by name'}
            />
          </label>

          <div className="chips" aria-live="polite">
            <strong>{results.length === 1 ? '1 game' : `${results.length} games`}</strong>
            {active.map((c) => (
              <button key={c.id} className="chip" onClick={() => toggle(c.group, c.id)} aria-label={`Remove ${c.label}`}>
                {c.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>

          {results.length ? (
            <div className="cards">
              {results.map((g) => (
                <article key={g._id} className="card">
                  <GameImage game={g} w={400} h={250} />
                  <div className="card-body">
                    <div>
                      <h3>{g.name}</h3>
                      {g.tagline && <p className="card-tagline">{g.tagline}</p>}
                    </div>
                    {g.builds && <span className="meta">Builds {g.builds}</span>}
                    <div className="tags">
                      <Badges badges={g.badges} />
                    </div>
                    {g.url && (
                      <a className="btn-play" href={g.url} target="_blank" rel="noopener">
                        Play ↗<span className="sr-only"> {g.name} (opens in new tab)</span>
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <img src="/brand/mascot-parent.svg" alt="" width={72} style={{ transform: 'rotate(-8deg)' }} />
              <p style={{ fontSize: 19, fontWeight: 800 }}>{page?.emptyText || 'Nothing matches all of those.'}</p>
              <button className="btn-outline" style={{ background: '#fff', cursor: 'pointer' }} onClick={clearAll}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
