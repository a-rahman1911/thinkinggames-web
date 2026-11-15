import { badges, builds } from '@/lib/derive'
import { siteName } from '@/lib/site'
import { urlFor } from '@/sanity/client'
import type { AudienceGame, SanityImage } from '@/sanity/types'

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

/**
 * A game as the Parents library shows it. The library and the Game block of an Ideas article both render
 * this one component, so the two cannot drift apart. `save` is the library's Save button, when it has one.
 */
export function ParentGameCard({ game: g, save }: { game: AudienceGame; save?: React.ReactNode }) {
  const play = <GameLink game={g} className="btn-play" label="Play" />
  return (
    <article className="card">
      <div className="card-top">
        <GameImage image={g.image} icon={g.icon} w={120} />
        <div className="card-text">
          <h3>{g.name}</h3>
          <GameSite game={g} />
          {g.subtitle && <p className="card-tagline">{g.subtitle}</p>}
          {g.skills?.length ? <span className="meta">Builds {builds(g)}</span> : null}
        </div>
      </div>
      <div className="card-foot">
        <div className="tags">
          <Badges badges={badges(g)} />
        </div>
        {save ? (
          <div className="card-actions">
            {save}
            {play}
          </div>
        ) : (
          play
        )}
      </div>
    </article>
  )
}

/** The "Builds …" line a Teachers row shows inside a moment. */
export const buildsMeta = (g: AudienceGame) => (g.skills?.length ? `Builds ${builds(g)}` : undefined)

/**
 * A game as the Teachers page shows it, in a moment and in search results. Also the Game block of an
 * Ideas article for teachers. `save` is the page's Save button, when it has one.
 */
export function TeacherGameRow({ game, meta, save }: { game: AudienceGame; meta?: string; save?: React.ReactNode }) {
  const open = <GameLink game={game} className="btn-open" label="Open game" />
  return (
    <article className="row">
      <div className="row-top">
        <GameImage image={game.image} icon={game.icon} w={112} />
        <div className="row-text">
          <div className="row-name">{game.name}</div>
          <GameSite game={game} />
          {game.subtitle && <div className="row-tagline">{game.subtitle}</div>}
          {meta && <span className="meta">{meta}</span>}
        </div>
      </div>
      <div className="row-foot">
        <div className="row-badges">
          <Badges badges={badges(game)} />
        </div>
        {save ? (
          <div className="card-actions">
            {save}
            {open}
          </div>
        ) : (
          open
        )}
      </div>
    </article>
  )
}
