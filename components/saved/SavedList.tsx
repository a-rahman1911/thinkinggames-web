'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GameImage } from '../GameBits'
import { GameLink } from '../GameLink'
import type { SavedGame } from './load'
import { readSaved, useSaved, writeSaved } from './store'
import { track, whenTracking } from '@/lib/analytics'
import { LIST_PARAM, MAX_LINK, countLabel, knownIds, listText, listUrl, mergeIds, parseListParam, type SavedAudience } from '@/lib/saved'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
const ACCENT = {
  teachers: { '--accent': 'var(--teacher)', '--accent-light': 'var(--teacher-light)' },
  parents: { '--accent': 'var(--parent)', '--accent-light': 'var(--parent-light)' },
} as Record<SavedAudience, React.CSSProperties>

type Copied = { kind: 'link' | 'text'; value: string }

/**
 * Saved list (test, round 8): the tray at the bottom of the screen and the drawer it opens. Mounted once per
 * page, and only when the feature is on. `games` are the games as the current page shows them; `all` are
 * every game's shared values, for a saved game this page does not list.
 *
 * The drawer has two modes. "mine" is the visitor's own list. "shared" is a list from a link
 * (/teachers?list=… or /parents?list=…): it opens by itself and leaves the visitor's own list alone
 * until they press "Save all to my list".
 */
export function SavedList({ audience, games, all }: { audience: SavedAudience; games: SavedGame[]; all: SavedGame[] }) {
  const { ids, available } = useSaved()
  // The page's own values win over the shared ones.
  const byId = useMemo(() => new Map([...all, ...games].map((g) => [g._id, g])), [all, games])
  // Ids that no longer match a game are dropped: never shown, never counted, and gone at the next change.
  const mine = useMemo(() => knownIds(ids, (id) => byId.has(id)), [ids, byId])

  const [mode, setMode] = useState<'mine' | 'shared' | null>(null)
  const [shared, setShared] = useState<string[]>([])
  const [done, setDone] = useState<'link' | 'text' | null>(null)
  const [blocked, setBlocked] = useState<Copied | null>(null)
  const [announce, setAnnounce] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLButtonElement>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  const dropParam = () => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(LIST_PARAM)) return
    url.searchParams.delete(LIST_PARAM)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }

  const close = () => {
    setMode(null)
    setBlocked(null)
    setDone(null)
    dropParam()
    // The tray comes back with the next render; return focus to its button if it is there.
    requestAnimationFrame(() => trayRef.current?.focus({ preventScroll: true }))
  }

  // A shared link opens the drawer in "shared" mode. Only on /teachers and /parents: `/` is the welcome page.
  const checkedLink = useRef(false)
  useEffect(() => {
    if (checkedLink.current || !available) return
    checkedLink.current = true
    if (window.location.pathname.replace(/\/+$/, '') !== `/${audience}`) return
    const list = knownIds(parseListParam(new URLSearchParams(window.location.search).get(LIST_PARAM)), (id) => byId.has(id))
    if (list.length) {
      setShared(list)
      setMode('shared')
    } else dropParam()
  }, [available, audience, byId])

  // `saved_list_shared_opened` (round 14): once, while the shared view shows. A visitor who has not chosen about
  // cookies yet is counted at the moment they accept, if the shared view is still showing.
  const sharedSent = useRef(false)
  useEffect(() => {
    if (mode !== 'shared') return
    return whenTracking(() => {
      if (sharedSent.current) return
      sharedSent.current = true
      track('saved_list_shared_opened', { count: shared.length })
    })
  }, [mode, shared.length])

  // While the drawer is open: focus moves in and is trapped, Esc closes it, and the page behind is inert.
  // (That it does not scroll is CSS: body:has(.saved-backdrop).) Same approach as WelcomeDialog.
  const open = mode !== null
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.focus({ preventScroll: true })
    const behind = [...document.querySelectorAll<HTMLElement>('.page, .ftr')].filter((el) => !el.inert)
    behind.forEach((el) => (el.inert = true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const list = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
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
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      behind.forEach((el) => (el.inert = false))
    }
  }, [open])

  // The count is announced politely when it changes, but not when the page loads with a list already saved.
  const count = mine.length
  const settled = useRef<number | null>(null)
  useEffect(() => {
    const t = setTimeout(() => (settled.current = knownIds(readSaved(), (id) => byId.has(id)).length), 0)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (settled.current === null || settled.current === count) return
    settled.current = count
    setAnnounce(count ? `${countLabel(count)} saved` : 'No games saved')
  }, [count])

  // "Link copied ✓" / "Copied ✓" go back to the button's label after 1.6 seconds.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(null), 1600)
    return () => clearTimeout(t)
  }, [done])

  // The clipboard was blocked: the link or text is shown in a field, selected and ready to copy by hand.
  useEffect(() => {
    if (!blocked) return
    fieldRef.current?.focus()
    fieldRef.current?.select()
  }, [blocked])

  if (!available) return null

  const rows = (mode === 'shared' ? shared : mine).map((id) => byId.get(id)).filter((g): g is SavedGame => !!g)
  const allSaved = shared.every((id) => mine.includes(id))

  const copy = async (kind: Copied['kind']) => {
    const url = listUrl(window.location.origin, audience, mine)
    // On touch devices that have one, the link goes to the share sheet instead.
    if (kind === 'link' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Thinking Games list', url })
        track('saved_list_link_copied', { count: mine.length, method: 'share' })
        return
      } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return
      }
    }
    const value = kind === 'link' ? url : listText(rows, url)
    // Counted whether the browser copies it or shows it in the field below to be copied by hand.
    track('saved_list_link_copied', { count: mine.length, method: kind })
    try {
      await navigator.clipboard.writeText(value)
      setBlocked(null)
      setDone(kind)
    } catch {
      setDone(null)
      setBlocked({ kind, value })
    }
  }

  // After a button removes itself (×, Clear list, Save all), focus goes back to the drawer.
  const refocus = () => dialogRef.current?.focus({ preventScroll: true })
  const remove = (id: string) => {
    writeSaved(mine.filter((x) => x !== id))
    setBlocked(null)
    refocus()
  }
  const clear = () => {
    writeSaved([])
    setBlocked(null)
    refocus()
  }
  const saveAll = () => {
    writeSaved(mergeIds(mine, shared))
    setMode('mine')
    refocus()
  }

  const title = mode === 'shared' ? countLabel(rows.length) : rows.length ? countLabel(rows.length, 'saved game') : 'No saved games'

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {count > 0 && !open && (
        <div className="saved-tray">
          <div>
            <span>{countLabel(count)} saved</span>
            <button
              ref={trayRef}
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setMode('mine')
                track('saved_list_opened', { count })
              }}
            >
              View list
            </button>
          </div>
        </div>
      )}

      {open &&
        createPortal(
          <div className="saved-backdrop" style={ACCENT[audience]} onClick={(e) => e.target === e.currentTarget && close()}>
            <div ref={dialogRef} className="saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-title" tabIndex={-1}>
              <div className="saved-head">
                <div>
                  <p className="saved-label">{mode === 'shared' ? 'Shared with you' : 'Your list'}</p>
                  <h2 id="saved-title">{title}</h2>
                </div>
                <button type="button" className="saved-close" aria-label="Close" onClick={close}>
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div className="saved-list">
                {rows.length ? (
                  <ul>
                    {rows.map((g, i) => (
                      <li key={g._id} className="saved-row">
                        <GameImage image={g.image} icon={g.icon} w={56} />
                        <div className="saved-row-text">
                          <div className="saved-row-name">{g.name}</div>
                          {g.subtitle && <div className="saved-row-sub">{g.subtitle}</div>}
                        </div>
                        <div className="saved-row-actions">
                          <GameLink
                            game={g}
                            className="saved-row-open"
                            label={audience === 'teachers' ? 'Open' : 'Play'}
                            where={{ audience, surface: 'saved_list', position: i + 1 }}
                          />
                          {mode === 'mine' && (
                            <button type="button" className="saved-remove" aria-label={`Remove ${g.name}`} onClick={() => remove(g._id)}>
                              <span aria-hidden="true">×</span>
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="saved-empty">Nothing saved yet. Use “+ Save” on any game.</p>
                )}
              </div>

              {mode === 'shared' ? (
                <div className="saved-foot">
                  <button type="button" className="saved-primary" disabled={allSaved} onClick={saveAll}>
                    {allSaved ? 'All saved ✓' : 'Save all to my list'}
                  </button>
                  <p className="saved-note">Someone sent you these games. Saving keeps them in this browser.</p>
                </div>
              ) : (
                rows.length > 0 && (
                  <div className="saved-foot">
                    <button type="button" className="saved-primary" onClick={() => copy('link')}>
                      <span aria-live="polite">{done === 'link' ? 'Link copied ✓' : 'Copy link to this list'}</span>
                    </button>
                    <button type="button" className="saved-secondary" onClick={() => copy('text')}>
                      <span aria-live="polite">{done === 'text' ? 'Copied ✓' : 'Copy as text'}</span>
                    </button>
                    {blocked && (
                      <label className="saved-field">
                        <span className="saved-note">
                          This browser did not allow copying. Select the {blocked.kind === 'link' ? 'link' : 'text'} below and copy it.
                        </span>
                        <textarea ref={fieldRef} readOnly rows={blocked.kind === 'link' ? 3 : 6} value={blocked.value} onFocus={(e) => e.currentTarget.select()} />
                      </label>
                    )}
                    {rows.length > MAX_LINK && <p className="saved-note">The link holds the first {MAX_LINK} games.</p>}
                    <p className="saved-note saved-foot-line">
                      <span>Saved in this browser only.</span>
                      <button type="button" className="link-btn" onClick={clear}>
                        Clear list
                      </button>
                    </p>
                  </div>
                )
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
