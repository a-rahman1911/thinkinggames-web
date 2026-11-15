'use client'

import { useEffect, useRef, useState } from 'react'

/** Copies the article's address. The label becomes "Link copied ✓" for 1.6 seconds. */
export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const url = window.location.origin + path
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // The browser blocked copying: show the address, selected, so it can be copied by hand.
      window.prompt('Copy this link', url)
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button type="button" className="idea-copy" onClick={copy}>
      {copied ? 'Link copied ✓' : 'Copy link'}
      {/* The visible label changes under a focused button, which screen readers do not announce. */}
      <span className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </span>
    </button>
  )
}
