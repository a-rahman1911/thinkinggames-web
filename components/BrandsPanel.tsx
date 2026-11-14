'use client'

import { useEffect, useRef, useState } from 'react'
import { urlFor } from '@/sanity/client'
import type { Brand } from '@/sanity/types'

/** The box a logo is fitted into, in CSS pixels. The chip's CSS caps the height at BOX.h and the width at the chip. */
const BOX = { w: 180, h: 44 }

const hasAsset = (logo: Brand['logo']): logo is NonNullable<Brand['logo']> => !!(logo as { asset?: unknown } | null | undefined)?.asset

/**
 * The logo's size fitted into BOX, from the pixel size in its Sanity asset id (image-<hash>-<w>x<h>-<ext>),
 * so its space is reserved before it loads.
 */
function logoSize(logo: NonNullable<Brand['logo']>) {
  const ref = (logo as { asset?: { _ref?: string } }).asset?._ref
  const m = ref?.match(/-(\d+)x(\d+)-/)
  if (!m) return {}
  const [w, h] = [Number(m[1]), Number(m[2])]
  const scale = Math.min(BOX.w / w, BOX.h / h, 1)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

/**
 * The logo at 2x of BOX, never upscaled. ignoreImageParams() matters: with a width and a height the URL builder
 * otherwise adds a crop rect of the box's shape, which cuts the sides off a logo of any other shape.
 */
const logoUrl = (logo: NonNullable<Brand['logo']>) =>
  urlFor(logo)
    .ignoreImageParams()
    .width(BOX.w * 2)
    .height(BOX.h * 2)
    .fit('max')
    .url()

/**
 * "Brands we support", under the Challenge banner: a carousel of logo chips, five visible at a time (about two
 * and a half on phones). It moves only when the visitor moves it: the two arrows (one screenful each), a swipe,
 * or tabbing to a chip. A brand without a logo shows its name as text. Hidden when the page has no brands.
 */
export function BrandsPanel({ brands }: { brands?: Brand[] | null }) {
  const trackRef = useRef<HTMLDivElement>(null)
  // More than five brands never fit, at any width, so the arrows are in the server-rendered HTML then.
  // With five or fewer they appear after measuring, only if the track really scrolls (it does on phones).
  const [scrolls, setScrolls] = useState((brands?.length || 0) > 5)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const max = track.scrollWidth - track.clientWidth
      setScrolls(max > 1)
      setAtStart(track.scrollLeft <= 1)
      setAtEnd(track.scrollLeft >= max - 1)
    }
    measure()
    track.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => {
      track.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [brands?.length])

  if (!brands?.length) return null

  /** One screenful: as many whole chips as are fully visible (five, or two on phones). */
  const move = (dir: 1 | -1) => {
    const track = trackRef.current
    const chip = track?.firstElementChild as HTMLElement | null
    if (!track || !chip) return
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const step = chip.offsetWidth + gap
    const count = Math.max(1, Math.floor((track.clientWidth + gap + 1) / step))
    track.scrollBy({ left: dir * count * step, behavior: 'smooth' })
  }

  return (
    <section className="brands" aria-labelledby="brands-label">
      <div className="brands-head">
        <h2 id="brands-label" className="brands-label">
          Brands we support
        </h2>
        {scrolls && (
          <div className="brands-arrows">
            <button type="button" className="brands-arrow" aria-label="Previous brands" disabled={atStart} onClick={() => move(-1)}>
              ←
            </button>
            <button type="button" className="brands-arrow" aria-label="Next brands" disabled={atEnd} onClick={() => move(1)}>
              →
            </button>
          </div>
        )}
      </div>
      <div ref={trackRef} className="brands-grid">
        {brands.map((b) => (
          <a key={b._id} className="brand" href={b.url} target="_blank" rel="noopener" aria-label={`${b.name} (opens in new tab)`}>
            {hasAsset(b.logo) ? (
              <img src={logoUrl(b.logo)} alt={b.name} {...logoSize(b.logo)} loading="lazy" />
            ) : (
              <span className="brand-name">{b.name}</span>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}
