import { GameImage } from '@/components/GameBits'
import { urlFor } from '@/sanity/client'
import type { IdeaCard } from './load'

// Requested sizes, in CSS pixels (the image is fetched at twice that). [box width, box height, game tile width]
const SIZES = { card: [400, 250, 150], lead: [640, 400, 230], article: [720, 405, 160] } as const

/**
 * An article's cover. An uploaded picture fills the box, cropped around its hotspot. With none, the box is the
 * audience's light colour with the pictures of the first three games in the body; with no games, the plain colour.
 * `alt` is only for the article page: on a card the cover is decoration inside a link that already has the title.
 */
export function IdeaCover({ card, size, alt }: { card: Pick<IdeaCard, 'cover' | 'tiles'>; size: keyof typeof SIZES; alt?: string }) {
  const [w, h, tile] = SIZES[size]
  const cls = `idea-cover${size === 'article' ? ' lg' : ''}`
  if (card.cover)
    return (
      <div className={cls}>
        <img
          src={urlFor(card.cover)
            .width(w * 2)
            .height(h * 2)
            .fit('crop')
            .url()}
          alt={alt || ''}
          width={w}
          height={h}
          loading={size === 'article' ? undefined : 'lazy'}
        />
      </div>
    )
  return (
    <div className={`${cls} n${card.tiles.length}`} aria-hidden="true">
      {card.tiles.map((t) => (
        <div key={t._id} className="t">
          <GameImage image={t.image} icon={t.icon} w={tile} />
        </div>
      ))}
    </div>
  )
}
