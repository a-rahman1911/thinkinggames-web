import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/types'

export function GameImage({ image, w, h }: { image?: SanityImage | null; w: number; h: number }) {
  return (
    <div className="thumb">
      {image && (
        <img
          src={urlFor(image).width(w * 2).height(h * 2).fit('crop').url()}
          alt={image.alt || ''}
          width={w}
          height={h}
          loading="lazy"
        />
      )}
    </div>
  )
}

/** Small tags on a card. The first one is highlighted. */
export function Badges({ badges }: { badges?: string[] }) {
  if (!badges?.length) return null
  return (
    <>
      {badges.map((b, i) => (
        <span key={b} className={`tag${i === 0 ? ' first' : ''}`}>
          {b}
        </span>
      ))}
    </>
  )
}
