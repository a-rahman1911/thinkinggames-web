import { urlFor } from '@/sanity/client'
import type { Game } from '@/sanity/types'

export function GameImage({ game, w, h }: { game: Game; w: number; h: number }) {
  return (
    <div className="thumb">
      {game.image && (
        <img
          src={urlFor(game.image).width(w * 2).height(h * 2).fit('crop').url()}
          alt={game.image.alt || ''}
          width={w}
          height={h}
          loading="lazy"
        />
      )}
    </div>
  )
}

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
