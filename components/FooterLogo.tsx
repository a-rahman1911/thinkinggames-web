'use client'

import type { MouseEvent } from 'react'

/**
 * The footer logo (round 16): a link to the top of the page the visitor is on, never to another page. (The header
 * logo goes to `/`, where middleware sends a returning visitor to their remembered page; this one must not.)
 *
 * It is a plain `href="#top"`, so it works before the scripts load and without them: the browser jumps to the
 * `#top` marker at the start of the page (app/(site)/layout.tsx and app/not-found.tsx) and focuses it. With scripts
 * the click is taken over: focus moves to that marker without scrolling, then the page glides to the top (it jumps
 * when the visitor prefers reduced motion), and the address is left alone: no `#top`, the query string as it was.
 * Either way the next press of Tab starts from the top of the page (the cookie banner if it is showing, otherwise
 * the header logo). Only this click glides: `scroll-behavior` is not set on the page.
 */
export function FooterLogo() {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // A modified click (new tab or window) is left to the browser.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const top = document.getElementById('top')
    // No marker on this page: the plain jump.
    if (!top) return
    e.preventDefault()
    top.focus({ preventScroll: true })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
  }
  return (
    <a href="#top" className="ftr-logo" aria-label="Thinking Games Initiative: back to top" onClick={onClick}>
      <img src="/brand/logo-footer.svg" alt="" />
    </a>
  )
}
