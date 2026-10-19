import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/types'

/** Every game image is 16:10, so card pictures and row thumbnails share one crop. */
const RATIO = 16 / 10

/** A game image `w` CSS pixels wide, cropped to 16:10 (around the hotspot) and requested at 2x. */
export function GameImage({ image, w }: { image?: SanityImage | null; w: number }) {
  return (
    <div className="thumb">
      {image && (
        <img
          src={urlFor(image).width(w * 2).height(Math.round((w * 2) / RATIO)).fit('crop').url()}
          alt={image.alt || ''}
          width={w}
          height={Math.round(w / RATIO)}
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
