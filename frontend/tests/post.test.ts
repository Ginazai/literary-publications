import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kindOf, toEssay } from '../src/lib/post.ts'

const base = { created: '2026-01-01T00:00:00Z', body: 'text' }

test('a titled post keeps its own title and slug', () => {
  const e = toEssay({ ...base, id: 'abc', title: 'Chapter one', slug: 'chapter-one' }, 'novel')
  assert.equal(e.title, 'Chapter one'); assert.equal(e.slug, 'chapter-one')
})
test('an untitled post is called Untitled', () => assert.equal(toEssay({ ...base, id: 'abc', title: '' }, 'novel').title, 'Untitled'))
test('whitespace-only title counts as untitled', () => {
  assert.equal(toEssay({ ...base, id: 'abc', title: '  \n' }, 'novel').title, 'Untitled')
})
test('WriteFreely omits the slug of untitled posts: fall back to the id so the route and keys stay unique', () => {
  const e = toEssay({ ...base, id: 'abc123', title: '' }, 'novel')
  assert.equal(e.slug, 'abc123')
})

test('category comes from the WriteFreely format; no format means Blog', () => {
  assert.equal(kindOf('novel'), 'Novel'); assert.equal(kindOf('notebook'), 'Notebook'); assert.equal(kindOf(undefined), 'Blog'); assert.equal(kindOf(''), 'Blog')
})
