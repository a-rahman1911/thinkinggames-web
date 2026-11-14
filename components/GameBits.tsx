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
 * The small capital line above a game's name that says where the game lives: "On PBS KIDS".
 * Put it AFTER the name in the markup: CSS (`order:-1`) moves it above, so the name is still the first
 * thing a screen reader meets in the card. With no site name known it renders nothing.
 */
export function GameSite({ game }: { game: { url?: string | null; site?: string | null } }) {
  const site = siteName(game)
  return site ? <p className="game-site">On {site}</p> : null
}

/**
 * The button that opens a game, in a new tab. The label is the same for every game ("Play ↗", "Open game ↗").
 * The accessible name is the visible label, then the game and the site it lives on:
 * "Play ↗ Down the Tubes on PBS KIDS (opens in new tab)". With no site name known, "on …" is left out.
 */
export function GameLink({ game, className, label }: { game: { name: string; url?: string | null; site?: string | null }; className: string; label: string }) {
  if (!game.url) return null
  const site = siteName(game)
  return (
    <a className={className} href={game.url} target="_blank" rel="noopener">
      {label} ↗
      <span className="sr-only">
        {' '}
        {game.name}
        {site ? ` on ${site}` : ''} (opens in new tab)
      </span>
    </a>
  )
}
