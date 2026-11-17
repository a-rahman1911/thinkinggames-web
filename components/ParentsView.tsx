'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandsPanel } from './BrandsPanel'
import { ChallengeBanner } from './ChallengeBanner'
import { ParentGameCard } from './GameBits'
import { Header } from './Header'
import { Highlight } from './Highlight'
import { SaveButton } from './saved/SaveButton'
import { SavedList } from './saved/SavedList'
import { IdeaStrip } from './ideas/IdeaStrip'
import type { IdeasForPage } from './ideas/load'
import type { SavedListData } from './saved/load'
import { track } from '@/lib/analytics'
import { matchesSelection, optionCount, parentGroups, resolve, shownTo, sortGames, type FacetKey, type Selection } from '@/lib/derive'
import type { AudienceGame, ParentsData } from '@/sanity/types'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ParentsView({ data, savedList, ideas }: { data: ParentsData; savedList?: SavedListData; ideas?: IdeasForPage }) {
  const { page } = data
  // Featured (for parents) first, then A to Z, with the parents overrides folded in.
  const games = useMemo(
    () => sortGames((data.games || []).filter((g) => shownTo(g, 'parents')).map((g) => resolve(g, 'parents'))),
    [data.games],
  )
  const groups = useMemo(() => parentGroups(data.skills || [], games), [data.skills, games])
  const [sel, setSel] = useState<Selection>({})
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // Mobile only: the filters sidebar opens as a full-screen panel. On desktop the panel state is never set.
  const [panelOpen, setPanelOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  // While the panel is open: focus moves into it and is trapped there, Esc closes it, the page behind
  // does not scroll, and it closes if the window grows past the mobile breakpoint. Focus returns to the toggle.
  useEffect(() => {
    if (!panelOpen) return
    const panel = panelRef.current
    if (!panel) return
    const focusables = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPanelOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const i = list.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        list[list.length - 1].focus()
      } else if (!e.shiftKey && (i === -1 || i === list.length - 1)) {
        e.preventDefault()
        list[0].focus()
      }
    }
    const wide = window.matchMedia('(min-width: 641px)')
    const onWide = () => wide.matches && setPanelOpen(false)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    wide.addEventListener('change', onWide)
    const toggle = toggleRef.current
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      wide.removeEventListener('change', onWide)
      toggle?.focus()
    }
  }, [panelOpen])

  // The search box narrows everything, counts included. Within the filters: OR within a group, AND across groups.
  const named = q ? games.filter((g: AudienceGame) => g.name.toLowerCase().includes(q)) : games

  // Ticking or unticking an option (in the panel, or the × of its chip) is the `filter_applied` event (round 14).
  // `results_count` is the games shown after the change.
  const toggle = (group: FacetKey, value: string) => {
    const cur = sel[group] || []
    const selected = !cur.includes(value)
    const next = { ...sel, [group]: selected ? [...cur, value] : cur.filter((x) => x !== value) }
    setSel(next)
    const gr = groups.find((g) => g.key === group)
    track('filter_applied', {
      page: 'parents',
      group: gr?.label,
      value: gr?.options.find((o) => o.value === value)?.label,
      selected,
      results_count: named.filter((g) => matchesSelection(g, groups, next)).length,
    })
  }

  const results = named.filter((g) => matchesSelection(g, groups, sel))
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
      <Header current="parents" ideasLabel={ideas?.navLabel} />

      <section className="wrap hero">
        <h1>
          <Highlight text={page?.headline} highlight={page?.highlight} />
        </h1>
        {page?.subline && <p>{page.subline}</p>}
      </section>

      <div className="wrap challenge-stack" style={{ paddingTop: 'clamp(24px,3vw,32px)' }}>
        <ChallengeBanner data={page?.challenge} audience="parents" />
        <BrandsPanel brands={data.brands} page="parents" />
      </div>

      <main className="wrap lib" style={{ paddingBlock: 'clamp(24px,3vw,32px) clamp(64px,8vw,112px)' }}>
        <aside
          id="filters-panel"
          ref={panelRef}
          className={`filters${panelOpen ? ' open' : ''}`}
          aria-label="Filters"
          role={panelOpen ? 'dialog' : undefined}
          aria-modal={panelOpen ? true : undefined}
        >
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
                const count = optionCount(named, groups, sel, gr.key, o.value)
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
          <div className="filters-foot">
            <button type="button" className="filters-show" onClick={() => setPanelOpen(false)}>
              Show {results.length === 1 ? '1 game' : `${results.length} games`}
            </button>
          </div>
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

          <div className="filters-bar">
            <button
              ref={toggleRef}
              type="button"
              className={`filters-toggle${active.length ? ' on' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              aria-controls="filters-panel"
              onClick={() => setPanelOpen(true)}
            >
              Filters{active.length ? ` · ${active.length}` : ''}
            </button>
          </div>

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
              {results.map((g, i) => (
                <ParentGameCard
                  key={g._id}
                  game={g}
                  where={{ audience: 'parents', surface: 'library', position: i + 1 }}
                  save={savedList ? <SaveButton game={g} where={{ audience: 'parents', surface: 'library' }} /> : undefined}
                />
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
      {ideas && <IdeaStrip heading={ideas.heading} cards={ideas.strip} allLink />}
      {savedList && <SavedList audience="parents" games={games} all={savedList.games} />}
    </div>
  )
}
