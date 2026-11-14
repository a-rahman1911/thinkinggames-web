import { siteName } from '@/lib/site'
import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/types'

const hasAsset = (img?: SanityImage | null): img is SanityImage => !!(img as { asset?: unknown } | null | undefined)?.asset

/**
 * A game's card picture: a square `w` CSS pixels wide, requested at 2x. It is the icon if the game has one,
 * otherwise the 16:10 image cropped to a square around its hotspot.
 */
export function GameImage({ image, icon, w }: { image?: SanityImage | null; icon?: SanityImage | null; w: number }) {
  const picture = hasAsset(icon) ? icon : image
  return (
    <div className="thumb">
      {picture && (
        <img src={urlFor(picture).width(w * 2).height(w * 2).fit('crop').url()} alt={picture.alt || ''} width={w} height={w} loading="lazy" />
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

/**
 * The button that opens a game, in a new tab. It names the site the game lives on: "Play on PBS KIDS ↗",
 * "Open on PBS KIDS ↗". With no site name known it keeps the plain label ("Play ↗", "Open game ↗").
 * The visible label comes first in the accessible name, then the game's name.
 */
export function GameLink({
  game,
  className,
  verb,
  plain,
}: {
  game: { name: string; url?: string | null; site?: string | null }
  className: string
  verb: string
  plain: string
}) {
  if (!game.url) return null
  const site = siteName(game)
  return (
    <a className={className} href={game.url} target="_blank" rel="noopener">
      {site ? `${verb} on ${site}` : plain} ↗
      <span className="sr-only">
        {site ? ': ' : ' '}
        {game.name} (opens in new tab)
      </span>
    </a>
  )
}
