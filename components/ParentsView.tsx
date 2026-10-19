'use client'

import { useMemo, useState } from 'react'
import { ChallengeBanner } from './ChallengeBanner'
import { Badges, GameImage } from './GameBits'
import { Header } from './Header'
import { Highlight } from './Highlight'
import { badges, builds, facetValues, parentGroups, resolve, shownTo, sortGames, type FacetKey } from '@/lib/derive'
import type { AudienceGame, ParentsData } from '@/sanity/types'

type Sel = Partial<Record<FacetKey, string[]>>

export function ParentsView({ data }: { data: ParentsData }) {
  const { page } = data
  // Featured (for parents) first, then A to Z, with the parents overrides folded in.
  const games = useMemo(
    () => sortGames((data.games || []).filter((g) => shownTo(g, 'parents')).map((g) => resolve(g, 'parents'))),
    [data.games],
  )
  const groups = useMemo(() => parentGroups(data.whenOptions || []), [data.whenOptions])
  const [sel, setSel] = useState<Sel>({})
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  // OR within a group, AND across groups. `skip` lets a group count its own options.
  const matches = (g: AudienceGame, skip?: FacetKey) => {
    if (q && !g.name.toLowerCase().includes(q)) return false
    return groups.every((gr) => {
      const chosen = sel[gr.key]
      if (gr.key === skip || !chosen?.length) return true
      const values = facetValues(g, gr.key)
      return chosen.some((v) => values.includes(v))
    })
  }

  const toggle = (group: FacetKey, value: string) =>
    setSel((s) => {
      const cur = s[group] || []
      return { ...s, [group]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] }
    })

  const results = games.filter((g) => matches(g))
  const active = groups.flatMap((gr) =>
    (sel[gr.key] || []).map((value) => ({
      group: gr.key,
      value,
      label: gr.options.find((o) => o.value === value)?.label || '',
    })),
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
                const on = !!sel[gr.key]?.includes(o.value)
                const count = games.filter((g) => facetValues(g, gr.key).includes(o.value) && matches(g, gr.key)).length
                return (
                  <button
                    key={o.value}
                    className="fopt"
                    aria-pressed={on}
                    disabled={!on && count === 0}
                    onClick={() => toggle(gr.key, o.value)}
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
            <span className="search-icon" aria-hidden="true">
              <span />
            </span>
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
              <button key={c.value} className="chip" onClick={() => toggle(c.group, c.value)} aria-label={`Remove ${c.label}`}>
                {c.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>

          {results.length ? (
            <div className="cards">
              {results.map((g) => (
                <article key={g._id} className="card">
                  <GameImage image={g.image} w={400} h={250} />
                  <div className="card-body">
                    <div>
                      <h3>{g.name}</h3>
                      {g.subtitle && <p className="card-tagline">{g.subtitle}</p>}
                    </div>
                    {g.skills?.length ? <span className="meta">Builds {builds(g)}</span> : null}
                    <div className="tags">
                      <Badges badges={badges(g)} />
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
            <div className="empty panel">
              <img src="/brand/mascot-parent.svg" alt="" width={72} style={{ transform: 'rotate(-8deg)' }} />
              <p style={{ fontSize: 19, fontWeight: 800 }}>{page?.emptyText || 'Nothing matches all of those.'}</p>
              <button className="btn-clear" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
