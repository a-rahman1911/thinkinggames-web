'use client'

import { useEffect, useRef, useState } from 'react'
import type { Challenge } from '@/sanity/types'

export function ChallengeBanner({ data }: { data?: Challenge }) {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])

  if (!data || data.show === false) return null

  const copy = async () => {
    const url = data.shareUrl || data.buttons?.[0]?.url || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      clearTimeout(t.current)
      t.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <section className="challenge" aria-labelledby="challenge-title">
      <div className="challenge-copy">
        {data.eyebrow && <div className="eyebrow">{data.eyebrow}</div>}
        <h2 id="challenge-title" className="challenge-title">
          {data.title}
        </h2>
        {data.text && <p>{data.text}</p>}
      </div>
      <div className="challenge-actions">
        {data.buttons?.map((b) => (
          <a key={b.label} className="challenge-age" href={b.url} target="_blank" rel="noopener">
            {b.label}
          </a>
        ))}
        <span className="challenge-sep" aria-hidden="true" />
        <button type="button" className="btn-ghost-light" onClick={copy} aria-live="polite">
          {copied ? 'Link copied ✓' : 'Copy link'}
        </button>
      </div>
    </section>
  )
}
