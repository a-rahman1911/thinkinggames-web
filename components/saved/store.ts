'use client'

// Saved list (test, round 8): the visitor's list, read from and written to localStorage.
// Every Save button, the tray and the drawer read it through useSaved(), so they stay in step,
// in this tab and in other tabs of the same browser.

import { useSyncExternalStore } from 'react'
import { SAVED_KEY, cleanIds, parseStored } from '@/lib/saved'

/** `available` is false when the browser gives no localStorage: the feature is then hidden for that visitor. */
export type SavedState = { ids: string[]; available: boolean }

// What the server renders, and the first client render: an empty list, feature shown.
const SERVER: SavedState = { ids: [], available: true }
const UNAVAILABLE: SavedState = { ids: [], available: false }

const listeners = new Set<() => void>()
let usable: boolean | null = null
let lastRaw: string | null | undefined
let last: SavedState = SERVER

function storageWorks(): boolean {
  if (usable !== null) return usable
  try {
    const probe = `${SAVED_KEY}_probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    usable = true
  } catch {
    usable = false
  }
  return usable
}

function getSnapshot(): SavedState {
  if (!storageWorks()) return UNAVAILABLE
  let raw: string | null
  try {
    raw = window.localStorage.getItem(SAVED_KEY)
  } catch {
    return UNAVAILABLE
  }
  // The same stored text gives the same object, so React does not re-render for nothing.
  if (raw !== lastRaw) {
    lastRaw = raw
    last = { ids: parseStored(raw), available: true }
  }
  return last
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // Fired when another tab changes the list.
  const onStorage = (e: StorageEvent) => (e.key === null || e.key === SAVED_KEY) && onChange()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** The visitor's list. On the server and during hydration it is empty. */
export const useSaved = (): SavedState => useSyncExternalStore(subscribe, getSnapshot, () => SERVER)

/** The list as it is in the browser right now (for click handlers). */
export const readSaved = (): string[] => getSnapshot().ids

/** Replace the list. An empty list removes the key, so nothing is left in the browser. */
export function writeSaved(ids: string[]) {
  if (!storageWorks()) return
  const next = cleanIds(ids)
  try {
    if (next.length) window.localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    else window.localStorage.removeItem(SAVED_KEY)
  } catch {
    // Storage is full or was just blocked: the list stays as it was.
  }
  listeners.forEach((fn) => fn())
}
