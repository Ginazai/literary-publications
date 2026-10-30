import { test } from 'node:test'
import assert from 'node:assert/strict'
import { excerpt } from '../src/lib/excerpt.ts'

test('keeps the words of links and drops emphasis marks', () => assert.equal(excerpt('I read *this* [book](http://x.y) **twice**.'), 'I read this book twice.'))
test('skips comments, headings and quotes to reach the first paragraph', () => assert.equal(excerpt('<!-- pagebreak -->\n\n## Title\n\n> quoted\n\nReal text here.'), 'Real text here.'))
test('cuts at a word boundary and adds an ellipsis', () => assert.equal(excerpt('alpha beta gamma delta epsilon', 16), 'alpha beta gamma…'))
test('short text is returned whole', () => assert.equal(excerpt('A short line.'), 'A short line.'))
test('no paragraph gives an empty string', () => assert.equal(excerpt('# Only a heading\n\n---'), ''))
test('accented text survives', () => assert.equal(excerpt('«¿Ves? —decía—. Presta y se acuerda».'), '«¿Ves? —decía—. Presta y se acuerda».'))
test('underscores inside words are not emphasis', () => assert.equal(excerpt('keep snake_case_name intact'), 'keep snake_case_name intact'))
