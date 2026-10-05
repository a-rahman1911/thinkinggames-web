'use client'

import { useMemo, useState } from 'react'
import { ChallengeBanner } from './ChallengeBanner'
import { Badges, GameImage } from './GameBits'
import { Header } from './Header'
import { Highlight } from './Highlight'
import { TEACHER_GROUPS } from '@/sanity/groups'
import type { Game, TeachersData } from '@/sanity/types'

type Sel = Record<string, string | null>

const clean = (games?: (Game | null)[] | null) => (games || []).filter((g): g is Game => !!g)

export function TeachersView({ data }: { data: TeachersData }) {
  const { page, options } = data
  const moments = useMemo(() => data.moments.map((m) => ({ ...m, games: clean(m.games) })), [data.moments])
  const allGames = useMemo(() => {
    const map = new Map<string, Game>()
    moments.forEach((m) => m.games.forEach((g) => map.set(g._id, g)))
    return [...map.values()]
  }, [moments])

  const [open, setOpen] = useState<number>((page?.defaultOpen ?? 1) - 1)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState<Sel>({})

  const groups = TEACHER_GROUPS.map((g) => ({ ...g, options: options.filter((o) => o.group === g.key) })).filter(
    (g) => g.options.length,
  )
  const hasFilters = Object.values(sel).some(Boolean)
  // One choice per group; a game passes when it has every chosen option.
  const pass = (g: Game) => Object.values(sel).every((id) => !id || g.filters?.some((f) => f._id === id))

  const q = query.trim().toLowerCase()
  const hits = q ? allGames.filter((g) => g.name.toLowerCase().includes(q)) : []

  return (
    <div style={{ '--accent': 'var(--teacher)', '--accent-light': 'var(--teacher-light)' } as React.CSSProperties}>
      <Header current="teachers">
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="tsearch" className="sr-only">
            Search games by name
          </label>
          <input
            id="tsearch"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={page?.searchPlaceholder || 'Search games by name'}
          />
          <button type="submit">Search</button>
        </form>
      </Header>

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
        <ChallengeBanner data={page?.challenge} />

        {q ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }} aria-live="polite">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, letterSpacing: '-.02em' }}>
                {hits.length === 1 ? '1 game matches' : `${hits.length} games match`}
              </h2>
              <button className="link-btn" style={{ fontSize: 15 }} onClick={() => setQuery('')}>
                Back to moments
              </button>
            </div>
            {hits.length ? (
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
              <p className="empty">No games with that name yet.</p>
            )}
          </section>
        ) : (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: 'clamp(30px,3.6vw,44px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-.02em' }}>
                {page?.momentsHeading || "What's the moment?"}
              </h2>
              {page?.momentsSub && <p style={{ fontSize: 17, lineHeight: 1.5 }}>{page.momentsSub}</p>}
            </div>

            <div className="moments">
              {moments.map((m, i) => {
                const isOpen = open === i
                const shown = m.games.filter(pass)
                const panelId = `moment-${m._id}`
                return (
                  <div key={m._id} className={`moment${isOpen ? ' open' : ''}`}>
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
                          {m.games.length} {m.games.length === 1 ? 'game' : 'games'}
                        </span>
                        <span className="moment-icon" aria-hidden="true">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                    </h3>
                    {isOpen && (
                      <div id={panelId} className="moment-body">
                        {groups.length > 0 && (
                          <div className="seg-row">
                            {groups.map((g) => (
                              <div key={g.key} className="seg" role="group" aria-label={g.label}>
                                <span className="seg-label">{g.label}</span>
                                <div className="seg-opts">
                                  {g.options.map((o) => {
                                    const on = sel[g.key] === o._id
                                    return (
                                      <button
                                        key={o._id}
                                        aria-pressed={on}
                                        onClick={() => setSel((s) => ({ ...s, [g.key]: on ? null : o._id }))}
                                      >
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
                        )}
                        {shown.length ? (
                          <div className="rows">
                            {shown.map((g) => (
                              <GameRow key={g._id} game={g} meta={g.builds ? `Builds ${g.builds}` : undefined} />
                            ))}
                          </div>
                        ) : (
                          <p className="empty" style={{ fontSize: 16 }}>
                            No games match those filters for this moment.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function GameRow({ game, meta }: { game: Game; meta?: string }) {
  return (
    <article className="row">
      <GameImage game={game} w={132} h={99} />
      <div className="row-body">
        <div>
          <div className="row-name">{game.name}</div>
          {game.tagline && <div className="row-tagline">{game.tagline}</div>}
        </div>
        {meta && <span className="meta">{meta}</span>}
        <div className="row-foot">
          <Badges badges={game.badges} />
          {game.url && (
            <a className="btn-outline" href={game.url} target="_blank" rel="noopener">
              Open game ↗<span className="sr-only"> {game.name} (opens in new tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
