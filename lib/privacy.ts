// Privacy policy (round 13): the small rules of /privacy. Nothing here touches Sanity or React, so it is unit-tested directly.

export const PRIVACY_TITLE = 'Privacy policy'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** A Studio date ("2026-11-16") as "16 November 2026". Anything else gives null, and the line is left out. */
export function formatUpdated(date?: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '')
  if (!m) return null
  const [year, month, day] = [+m[1], +m[2], +m[3]]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${day} ${MONTHS[month - 1]} ${year}`
}

type Block = { _type?: string; children?: object[] | null }

/** True when the body has something to read. An empty editor, or only blank lines, counts as no text. */
export const hasText = (body?: Block[] | null): boolean =>
  !!body?.some((b) => b?._type === 'block' && b.children?.some((c) => { const t = (c as { text?: unknown } | null)?.text; return typeof t === 'string' && !!t.trim() }))
