'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BackToTop } from './BackToTop'
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
import { ABOVE_PHONE, SIDEBAR } from '@/lib/breakpoints'
import {
  COLLAPSED_COUNT,
  collapsedOptions,
  collapsible,
  matchesSelection,
  optionCount,
  optionsNoun,
  parentGroups,
  resolve,
  shownTo,
  sortGames,
  type FacetKey,
  type Selection,
} from '@/lib/derive'
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
  // Up to 860px (lib/breakpoints.ts) the filters open as a full-screen panel from the "Filters" button. From 861px
  // they are the sidebar and the panel state is never set.
  const [panelOpen, setPanelOpen] = useState(false)
  // Round 18: which long groups ("Thinking skill") show all their options in the sidebar. Collapsed on every load.
  const [expanded, setExpanded] = useState<Partial<Record<FacetKey, boolean>>>({})
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const filtersBarRef = useRef<HTMLDivElement>(null)
  const moreRefs = useRef<Partial<Record<FacetKey, HTMLButtonElement | null>>>({})

  // Rounds 17 and 18, above 640px: a search typed or a filter changed leaves the bar that sticks at the top where it
  // is on the screen. From 861px that is the search bar (the search box, the count and the chips); from 641 to 860px,
  // where the filters are in the panel, it is the "Filters" bar. While the bar is stuck at the top, that shows the new
  // results from their start, right under it. Without this the page would jump as the list changes (the browser
  // keeps some card in place, or the page runs out), or leave the new results out of sight above the bar. (The
  // results column is at least a screen tall there, so the page is always long enough for this.) Phones, and a change
  // made while the bar is off the screen, are as before.
  const keep = useRef<{ bar: HTMLElement; at: number } | null>(null)
  const beforeChange = () => {
    keep.current = null
    if (!window.matchMedia(ABOVE_PHONE).matches) return
    const bar = window.matchMedia(SIDEBAR).matches ? barRef.current : filtersBarRef.current
    const box = bar?.getBoundingClientRect()
    if (bar && box && box.bottom > 0 && box.top < window.innerHeight) keep.current = { bar, at: Math.max(0, box.top) }
  }
  useLayoutEffect(() => {
    const k = keep.current
    if (!k) return
    keep.current = null
    // The bar's own place in the page, as if it did not stick (measured before the page is painted).
    k.bar.style.position = 'relative'
    const natural = window.scrollY + k.bar.getBoundingClientRect().top
    k.bar.style.position = ''
    window.scrollTo({ top: natural - k.at, behavior: 'instant' })
  })

  // Round 18, from 861px: the sidebar is never taller than the screen and scrolls inside itself (app/globals.css).
  // While there are options below what it shows, `data-more` puts a white fade over its foot. A classic (not overlay)
  // scroll bar gets its own room to the right of the sidebar (--filters-sb, its width), so the text does not move when
  // one appears. Measured after a scroll, and after any change in the sidebar's size or its content's (a group
  // expanded, the screen resized, the font loaded); in the next frame, so that the width it sets is not measured in
  // the same pass.
  useEffect(() => {
    const aside = panelRef.current
    if (!aside) return
    const update = () => {
      aside.toggleAttribute('data-more', aside.scrollHeight - aside.scrollTop - aside.clientHeight > 1)
      aside.style.setProperty('--filters-sb', `${aside.offsetWidth - aside.clientWidth}px`)
    }
    let frame = 0
    const later = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const sizes = new ResizeObserver(later)
    sizes.observe(aside)
    for (const child of aside.children) sizes.observe(child)
    aside.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
      aside.removeEventListener('scroll', update)
    }
  }, [])

  // While the panel is open: focus moves into it and is trapped there, Esc closes it, the page behind
  // does not scroll, and it closes if the window grows wide enough for the sidebar. Focus returns to the toggle.
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
    const wide = window.matchMedia(SIDEBAR)
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
    beforeChange()
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
    beforeChange()
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
          {groups.map((gr) => {
            // Round 18: in the sidebar a long group shows its first four options, then "Show all N"; the rest follow
            // the button and show when it is pressed. While collapsed, a ticked option beyond the four still shows
            // (lib/derive.ts). Which ones are hidden is CSS (`.fgroup.collapsed .fopt-more`), only from 861px: the
            // panel lists every option and has no button.
            const long = collapsible(gr.options)
            const open = !!expanded[gr.key]
            const shown = new Set(collapsedOptions(gr.options, sel[gr.key]).map((o) => o.value))
            const option = (o: (typeof gr.options)[number], i: number) => {
              const on = !!sel[gr.key]?.includes(o.value)
              const count = optionCount(named, groups, sel, gr.key, o.value)
              return (
                <button
                  key={o.value}
                  className={`fopt${shown.has(o.value) ? '' : ' fopt-more'}`}
                  aria-pressed={on}
                  disabled={!on && count === 0}
                  onClick={() => {
                    // Unticking an option that only shows because it is ticked hides it: focus goes to the button
                    // just above it instead of being lost. (In the panel the button is not shown and this does nothing.)
                    const hides = long && !open && on && i >= COLLAPSED_COUNT
                    toggle(gr.key, o.value)
                    if (hides) moreRefs.current[gr.key]?.focus()
                  }}
                >
                  <span className="fbox" aria-hidden="true">
                    <span />
                  </span>
                  <span className="fname">{o.label}</span>
                  <span className="fcount">{count}</span>
                </button>
              )
            }
            return (
              <fieldset key={gr.key} className={`fgroup${long && !open ? ' collapsed' : ''}`}>
                <legend>{gr.label}</legend>
                {long ? (
                  <>
                    {gr.options.slice(0, COLLAPSED_COUNT).map((o, i) => option(o, i))}
                    <button
                      ref={(el) => {
                        moreRefs.current[gr.key] = el
                      }}
                      type="button"
                      className="link-btn fmore"
                      aria-expanded={open}
                      onClick={() => setExpanded((x) => ({ ...x, [gr.key]: !open }))}
                    >
                      {open ? 'Show fewer' : `Show all ${gr.options.length}`}
                      <span className="sr-only"> {optionsNoun(gr)}</span>
                    </button>
                    {gr.options.slice(COLLAPSED_COUNT).map((o, i) => option(o, i + COLLAPSED_COUNT))}
                  </>
                ) : (
                  gr.options.map((o, i) => option(o, i))
                )}
              </fieldset>
            )
          })}
          <div className="filters-foot">
            <button type="button" className="filters-show" onClick={() => setPanelOpen(false)}>
              Show {results.length === 1 ? '1 game' : `${results.length} games`}
            </button>
          </div>
        </aside>

        <div className="results to-top-area">
          {/* From 861px the search box and the count with its chips stay at the top of the screen, as one bar
              (rounds 17 and 18). Up to 860px the bar is `display: contents`, so only "Filters" sticks, as on phones. */}
          <div ref={barRef} className="results-bar">
            <label className="search lg">
              <span className="search-icon" aria-hidden="true">
                <span />
              </span>
              <span className="sr-only">Search games by name</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  beforeChange()
                  setQuery(e.target.value)
                }}
                placeholder={page?.searchPlaceholder || 'Search games by name'}
              />
            </label>

            <div ref={filtersBarRef} className="filters-bar">
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
          <BackToTop />
        </div>
      </main>
      {ideas && <IdeaStrip heading={ideas.heading} cards={ideas.strip} allLink />}
      {savedList && <SavedList audience="parents" games={games} all={savedList.games} />}
    </div>
  )
}
