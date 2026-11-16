// Round 13: the privacy policy and the footer links as Sanity documents, built from policy.md.
// Used by write.mts (the one write to the dataset), by the seed, and by the in-memory check of /privacy.
//
// policy.md: lines starting with "## " are headings, "### " small headings, "- " list items,
// and [words](address) are links. "[CONTACT EMAIL]" is replaced by the address given.

import { readFileSync } from 'node:fs'

export const PLACEHOLDER = '[CONTACT EMAIL]'

type Span = { _type: 'span'; _key: string; text: string; marks: string[] }
type MarkDef = { _type: 'link'; _key: string; href: string }
type Block = { _type: 'block'; _key: string; style: string; markDefs: MarkDef[]; children: Span[]; listItem?: 'bullet'; level?: number }

/** The policy text as block content. Keys are stable, so writing the same text twice changes nothing. */
export function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const key = `b${blocks.length + 1}`
    const [style, rest, list] = line.startsWith('### ')
      ? ['h3', line.slice(4), false]
      : line.startsWith('## ')
        ? ['h2', line.slice(3), false]
        : line.startsWith('- ')
          ? ['normal', line.slice(2), true]
          : ['normal', line, false]
    const markDefs: MarkDef[] = []
    const children: Span[] = []
    const span = (t: string, marks: string[] = []) => t && children.push({ _type: 'span', _key: `${key}s${children.length + 1}`, text: t, marks })
    let last = 0
    for (const m of (rest as string).matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
      span((rest as string).slice(last, m.index))
      const def: MarkDef = { _type: 'link', _key: `${key}l${markDefs.length + 1}`, href: m[2] }
      markDefs.push(def)
      span(m[1], [def._key])
      last = m.index! + m[0].length
    }
    span((rest as string).slice(last))
    blocks.push({ _type: 'block', _key: key, style: style as string, markDefs, children, ...(list ? { listItem: 'bullet' as const, level: 1 } : {}) })
  }
  return blocks
}

/** The two things round 13 writes. `email` empty: the Contact link is left out and the placeholder stays in the text (seed only). */
export function content(email: string, updated: string) {
  const text = readFileSync(new URL('./policy.md', import.meta.url), 'utf8')
  const footerLinks = [
    { _key: 'l0', _type: 'link', label: 'Privacy', url: '/privacy' },
    ...(email ? [{ _key: 'l1', _type: 'link', label: 'Contact', url: `mailto:${email}` }] : []),
  ]
  const privacyPage = {
    _id: 'privacyPage',
    _type: 'privacyPage',
    title: 'Privacy policy',
    updated,
    body: toBlocks(email ? text.replaceAll(PLACEHOLDER, email) : text),
  }
  return { footerLinks, privacyPage }
}
