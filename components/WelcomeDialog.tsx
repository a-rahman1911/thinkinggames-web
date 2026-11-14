'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Highlight } from './Highlight'
import { rememberAudience } from '@/lib/audience'
import type { WelcomePopup } from '@/sanity/types'

const MASCOT = { teachers: 'mascot-teacher.svg', parents: 'mascot-parent.svg' } as const

/**
 * The welcome pop-up on `/`, over the Parents page (its children). It is open in the server-rendered HTML.
 * "I'm a teacher" goes to /teachers; "I'm a parent" closes it and stays, with the URL changed to /parents.
 * Both remember the choice. Closing it any other way remembers nothing, so it is back on the next visit to `/`.
 * While it is open the page behind is inert and does not scroll (the scroll lock is CSS: body:has(.welcome-backdrop)).
 */
export function WelcomeDialog({ popup, children }: { popup: NonNullable<WelcomePopup>; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const dialogRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    // The page is still inert until the next render, so wait for it before moving focus there.
    requestAnimationFrame(() => pageRef.current?.focus({ preventScroll: true }))
  }

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.focus({ preventScroll: true })
    // The footer sits outside this component (in the site layout), so it is made inert here.
    const footer = document.querySelector<HTMLElement>('.ftr')
    if (footer) footer.inert = true
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const list = [...dialog.querySelectorAll<HTMLElement>('a[href], button')]
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
      if (footer) footer.inert = false
    }
  }, [open])

  return (
    <>
      <div ref={pageRef} className="welcome-page" tabIndex={-1} inert={open}>
        {children}
      </div>
      {open && (
        <div className="welcome-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div ref={dialogRef} className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" tabIndex={-1}>
            <button type="button" className="welcome-close" aria-label="Close" onClick={close}>
              <span aria-hidden="true">×</span>
            </button>
            <img className="welcome-logo" src="/brand/logo-horizontal.svg" alt="Thinking Games Initiative" />
            <h2 id="welcome-title">
              <Highlight text={popup.headline} highlight={popup.highlight} />
            </h2>
            {popup.subline && <p className="welcome-intro">{popup.subline}</p>}
            {!!popup.panels?.length && (
              <div className="choices">
                {popup.panels.map((p) => (
                  <Link
                    key={p.persona}
                    href={`/${p.persona}`}
                    className={`choice ${p.persona}`}
                    onClick={(e) => {
                      rememberAudience(p.persona)
                      if (p.persona !== 'parents') return
                      // Already on the Parents page: stay, and only change the address.
                      e.preventDefault()
                      window.history.replaceState(null, '', '/parents')
                      close()
                    }}
                  >
                    {p.eyebrow && <span className="choice-label">{p.eyebrow}</span>}
                    {p.title && <span className="choice-title">{p.title}</span>}
                    {p.cta && <span className="choice-cta">{p.cta} →</span>}
                    <img src={`/brand/${MASCOT[p.persona]}`} alt="" className="choice-mascot" />
                  </Link>
                ))}
              </div>
            )}
            {popup.note && <p className="welcome-note">{popup.note}</p>}
          </div>
        </div>
      )}
    </>
  )
}
