import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatUpdated, hasText } from './privacy.ts'

test('formatUpdated: day, month name, year', () => {
  assert.equal(formatUpdated('2026-11-16'), '16 November 2026')
  assert.equal(formatUpdated('2027-01-05'), '5 January 2027')
})

test('formatUpdated: empty or not a date gives null', () => {
  for (const v of [undefined, null, '', '16/11/2026', '2026-13-01', '2026-11-00']) assert.equal(formatUpdated(v), null)
})

test('hasText: no body, an empty body and blank lines are all "no text"', () => {
  assert.equal(hasText(undefined), false)
  assert.equal(hasText(null), false)
  assert.equal(hasText([]), false)
  assert.equal(hasText([{ _type: 'block', children: [{ text: '' }] }, { _type: 'block', children: [{ text: '  ' }] }]), false)
  assert.equal(hasText([{ _type: 'block', children: [{ text: '' }] }, { _type: 'block', children: [{ text: 'Who we are' }] }]), true)
})
