'use client'

import { cardClicked, track, type CardWhere } from '@/lib/analytics'
import { siteName } from '@/lib/site'

/**
 * The button that opens a game, in a new tab. The label is the same for every game ("Play ↗", "Open game ↗").
 * The accessible name is the visible label, then the game and the site it lives on:
 * "Play ↗ Down the Tubes on PBS KIDS (opens in new tab)". With no site name known, "on …" is left out.
 * A click is the `card_clicked` event (round 14); `where` says which list the card is in.
 */
export function GameLink({
  game,
  className,
  label,
  where,
}: {
  game: { _id: string; name: string; url?: string | null; site?: string | null }
  className: string
  label: string
  where: CardWhere
}) {
  if (!game.url) return null
  const site = siteName(game)
  return (
    <a className={className} href={game.url} target="_blank" rel="noopener" onClick={() => track('card_clicked', cardClicked(game, where))}>
      {label} ↗
      <span className="sr-only">
        {' '}
        {game.name}
        {site ? ` on ${site}` : ''} (opens in new tab)
      </span>
    </a>
  )
}
