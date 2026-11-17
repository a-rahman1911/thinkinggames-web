'use client'

import { readSaved, useSaved, writeSaved } from './store'
import { gameSaved, track, type CardWhere } from '@/lib/analytics'
import { toggleId } from '@/lib/saved'

/**
 * Saved list (test, round 8): the toggle in a game card's footer, right before the game button.
 * "+ Save", and "✓ Saved" once the game is in the visitor's list. Its width is fixed in CSS, so
 * switching labels moves nothing. Renders nothing when the browser has no localStorage.
 */
export function SaveButton({ game, where }: { game: { _id: string; name: string; url?: string | null; site?: string | null }; where: CardWhere }) {
  const { ids, available } = useSaved()
  if (!available) return null
  const saved = ids.includes(game._id)
  return (
    <button
      type="button"
      className="btn-save"
      aria-pressed={saved}
      aria-label={`Save ${game.name}`}
      onClick={() => {
        // `game_saved` (round 14): only when saving, not when taking a game off the list.
        if (!saved) track('game_saved', gameSaved(game, where))
        writeSaved(toggleId(readSaved(), game._id))
      }}
    >
      {saved ? '✓ Saved' : '+ Save'}
    </button>
  )
}
