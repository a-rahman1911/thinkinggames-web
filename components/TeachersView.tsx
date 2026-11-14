'use client'

import { useMemo, useState } from 'react'
import { BrandsPanel } from './BrandsPanel'
import { ChallengeBanner } from './ChallengeBanner'
import { Badges, GameImage, GameLink, GameSite } from './GameBits'
import { Header } from './Header'
import { Highlight } from './Highlight'
import { TEACHER_GROUPS, badges, builds, facetValues, resolve, shownTo, sortGames, type FacetKey } from '@/lib/derive'
import type { AudienceGame, TeachersData } from '@/sanity/types'

type Sel = Partial<Record<FacetKey, string | null>>

export function TeachersView({ data }: { data: TeachersData }) {
  const { page } = data
  // Games inside a moment keep the order of the moment's games list (set by hand in Studio).
  const moments = useMemo(
    () =>
      (data.moments || []).map((m) => ({
        ...m,
        games: (m.games || []).filter((g) => shownTo(g, 'teachers')).map((g) => resolve(g, 'teachers')),
      })),
    [data.moments],
  )
  // Search results: featured (for teachers) first, then A to Z.
  const allGames = useMemo(() => {
    const map = new Map<string, AudienceGame>()
    moments.forEach((m) => m.games.forEach((g) => map.set(g._id, g)))
    return sortGames([...map.values()])
  }, [moments])

  const [open, setOpen] = useState<number>((page?.defaultOpen ?? 1) - 1)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState<Sel>({})

  const groups = TEACHER_GROUPS
  const hasFilters = Object.values(sel).some(Boolean)
  // One choice per group; a game passes when it matches every chosen option.
  const pass = (g: AudienceGame) =>
    (Object.entries(sel) as [FacetKey, string | null][]).every(([key, v]) => !v || facetValues(g, key).includes(v))

  const q = query.trim().toLowerCase()
  const named = q ? allGames.filter((g) => g.name.toLowerCase().includes(q)) : []
  const hits = named.filter(pass)

  return (
    <div style={{ '--accent': 'var(--teacher)', '--accent-light': 'var(--teacher-light)' } as React.CSSProperties}>
      <Header current="teachers" />

      <section className="wrap hero">
        <h1>
          <Highlight text={page?.headline} highlight={page?.highlight} />
        </h1>
        {page?.subline && <p>{page.subline}</p>}
      </section>

      <main
        className="wrap"
        style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBlock: 'clamp(24px,3vw,32px) clamp(64px,8vw,112px)' }}
      >
        <div className="challenge-stack">
          <ChallengeBanner data={page?.challenge} />
          <BrandsPanel brands={data.brands} />
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: q ? 20 : 32 }}>
          {q ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }} aria-live="polite">
              <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, letterSpacing: '-.02em' }}>
                {hits.length === 1 ? '1 game matches' : `${hits.length} games match`}
              </h2>
              <button className="link-btn" style={{ fontSize: 15 }} onClick={() => setQuery('')}>
                Back to moments
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: 'clamp(30px,3.6vw,44px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-.02em' }}>
                {page?.momentsHeading || "What's the moment?"}
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.5 }}>
                {page?.momentsSub || 'Open one to see its games. Narrow them all at once with the filters.'}
              </p>
            </div>
          )}

          {/* Search and filters for the whole page. It stays in place while searching, so the box keeps focus. */}
          <div className="toolbar">
            <label className="search">
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
            {groups.map((g) => (
              <div key={g.key} className="seg" role="group" aria-label={g.label}>
                <span className="seg-label">{g.label}</span>
                <div className="seg-opts">
                  {g.options.map((o) => {
                    const on = sel[g.key] === o.value
                    return (
                      <button key={o.value} aria-pressed={on} onClick={() => setSel((s) => ({ ...s, [g.key]: on ? null : o.value }))}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {hasFilters && (
              <button className="link-btn" onClick={() => setSel({})}>
                Clear
              </button>
            )}
          </div>

          {q ? (
            hits.length ? (
              <div className="rows">
                {hits.map((g) => (
                  <GameRow
                    key={g._id}
                    game={g}
                    meta={
                      'Good for ' +
                      moments
                        .filter((m) => m.games.some((x) => x._id === g._id))
                        .map((m) => m.title.toLowerCase())
                        .join(' · ')
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="empty">{named.length ? 'No games with that name match those filters.' : 'No games with that name yet.'}</p>
            )
          ) : (
            <div className="moments">
              {moments.map((m, i) => {
                const isOpen = open === i
                const shown = m.games.filter(pass)
                const panelId = `moment-${m._id}`
                return (
                  <div key={m._id} className={`moment${isOpen ? ' open' : ''}${shown.length ? '' : ' none'}`}>
                    <h3 style={{ margin: 0 }}>
                      <button
                        className="moment-head"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? -1 : i)}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span className="moment-title">{m.title}</span>
                          {m.blurb && <span className="moment-blurb">{m.blurb}</span>}
                        </span>
                        <span className="moment-count">
                          {shown.length} {shown.length === 1 ? 'game' : 'games'}
                        </span>
                        <span className="moment-icon" aria-hidden="true">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                    </h3>
                    {isOpen && (
                      <div id={panelId} className="moment-body">
                        {shown.length ? (
                          <div className="rows">
                            {shown.map((g) => (
                              <GameRow key={g._id} game={g} meta={g.skills?.length ? `Builds ${builds(g)}` : undefined} />
                            ))}
                          </div>
                        ) : (
                          <p className="empty sm">No games in this moment match those filters.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function GameRow({ game, meta }: { game: AudienceGame; meta?: string }) {
  return (
    <article className="row">
      <div className="row-top">
        <GameImage image={game.image} icon={game.icon} w={112} />
        <div className="row-text">
          <div className="row-name">{game.name}</div>
          <GameSite game={game} />
          {game.subtitle && <div className="row-tagline">{game.subtitle}</div>}
          {meta && <span className="meta">{meta}</span>}
        </div>
      </div>
      <div className="row-foot">
        <div className="row-badges">
          <Badges badges={badges(game)} />
        </div>
        <GameLink game={game} className="btn-open" label="Open game" />
      </div>
    </article>
  )
}
