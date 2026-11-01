import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAliases, toEssay } from '../src/lib/post.ts'

const base = { created: '2026-01-01T00:00:00Z', body: 'text' }

test('a titled post keeps its own title and slug', () => {
  const e = toEssay({ ...base, id: 'abc', title: 'Chapter one', slug: 'chapter-one' }, 'novel', 'My Novel')
  assert.equal(e.title, 'Chapter one'); assert.equal(e.slug, 'chapter-one')
})
test('an untitled post is named after its blog', () => {
  assert.equal(toEssay({ ...base, id: 'abc', title: '' }, 'novel', 'My Novel').title, 'My Novel')
})
test('whitespace-only title counts as untitled', () => {
  assert.equal(toEssay({ ...base, id: 'abc', title: '  \n' }, 'novel', 'My Novel').title, 'My Novel')
})
test('WriteFreely omits the slug of untitled posts: fall back to the id so the route and keys stay unique', () => {
  const e = toEssay({ ...base, id: 'abc123', title: '' }, 'novel', 'My Novel')
  assert.equal(e.slug, 'abc123')
})

test('aliases carry an optional category, default Blog', () => assert.deepEqual(parseAliases(' novel:Novel, notes ,,diary: Notebook'), [{ alias: 'novel', kind: 'Novel' }, { alias: 'notes', kind: 'Blog' }, { alias: 'diary', kind: 'Notebook' }]))
