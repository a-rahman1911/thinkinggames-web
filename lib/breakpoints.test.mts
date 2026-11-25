import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ABOVE_PHONE, FILTERS_PANEL_MAX, PHONE_MAX, SIDEBAR } from './breakpoints.ts'

// The stylesheet repeats the breakpoints in its media queries (CSS cannot read a variable there). These tests fail if
// app/globals.css and lib/breakpoints.ts drift apart.

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Every @media block: its condition (spaces removed) and its rules. */
const blocks = (() => {
  const out: { query: string; body: string }[] = []
  for (const m of css.matchAll(/@media([^{]+)\{/g)) {
    let depth = 1
    let i = m.index! + m[0].length
    const start = i
    while (depth && i < css.length) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    out.push({ query: m[1].replace(/\s+/g, ''), body: css.slice(start, i - 1).replace(/\s+/g, '') })
  }
  return out
})()

const block = (query: string) => {
  const found = blocks.filter((b) => b.query === query.replace(/\s+/g, ''))
  assert.ok(found.length, `app/globals.css has no @media ${query}`)
  return found.map((b) => b.body).join('')
}

test('the script uses the named widths', () => {
  assert.equal(ABOVE_PHONE, `(min-width: ${PHONE_MAX + 1}px)`)
  assert.equal(SIDEBAR, `(min-width: ${FILTERS_PANEL_MAX + 1}px)`)
  assert.equal(FILTERS_PANEL_MAX, 860)
  assert.equal(PHONE_MAX, 640)
})

test('the filters panel and the "Filters" bar apply up to FILTERS_PANEL_MAX', () => {
  const body = block(`(max-width:${FILTERS_PANEL_MAX}px)`)
  for (const rule of ['.filters{display:none}', '.filters.open{display:flex;', '.filters-bar{display:block;', '.results-bar{display:contents}', '.filters.fmore{display:none}'])
    assert.ok(body.includes(rule), `${rule} is in the ≤${FILTERS_PANEL_MAX}px block`)
})

test('the sidebar applies from FILTERS_PANEL_MAX + 1', () => {
  const body = block(`(min-width:${FILTERS_PANEL_MAX + 1}px)`)
  for (const rule of ['max-height:calc(100vh-48px)', 'overflow-y:auto', '.fgroup.collapsed.fopt-more{display:none}', '.filters[data-more]::after{opacity:1}'])
    assert.ok(body.includes(rule), `${rule} is in the ≥${FILTERS_PANEL_MAX + 1}px block`)
})

test('the tablet panel (one centred column) applies from PHONE_MAX + 1 to FILTERS_PANEL_MAX', () => {
  assert.ok(block(`(min-width:${PHONE_MAX + 1}px)and(max-width:${FILTERS_PANEL_MAX}px)`).includes('max-width:480px'))
})

test('no media query uses a width just off the named ones', () => {
  const near = (n: number, to: number) => n !== to && n !== to + 1 && Math.abs(n - to) <= 20
  for (const b of blocks)
    for (const [, n] of b.query.matchAll(/width:(\d+)px/g))
      for (const to of [PHONE_MAX, FILTERS_PANEL_MAX]) assert.ok(!near(Number(n), to), `@media ${b.query} is next to ${to} but not ${to} or ${to + 1}`)
})
