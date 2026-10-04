import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BREAK, packPages } from '../src/lib/pack.ts'

const fits3 = (p: string[]) => p.length <= 3
test('fills pages greedily', () => assert.deepEqual(packPages(['a','b','c','d','e'], fits3), [['a','b','c'],['d','e']]))
test('forced break starts a new page', () => assert.deepEqual(packPages(['a', BREAK, 'b'], fits3), [['a'],['b']]))
test('consecutive breaks make no empty page', () => assert.deepEqual(packPages(['a', BREAK, BREAK, 'b'], fits3), [['a'],['b']]))
test('empty input gives one empty page', () => assert.deepEqual(packPages([], fits3), [[]]))
test('oversized block still gets its own page', () => assert.deepEqual(packPages(['a','big','b'], p => !p.includes('big') || p.length === 1), [['a'],['big'],['b']]))

const splitStr = (s: string, room: (h: string) => boolean): [string, string] | null => {
  for (let k = s.length - 1; k >= 1; k--) if (room(s.slice(0, k))) return [s.slice(0, k), s.slice(k)]
  return null
}
const fitsChars = (p: string[]) => p.join('').length <= 3
test('splits a long block across pages', () => assert.deepEqual(packPages(['abcdefgh'], fitsChars, splitStr), [['abc'], ['def'], ['gh']]))
test('fills the rest of a page before splitting', () => assert.deepEqual(packPages(['a', 'bcdef'], fitsChars, splitStr), [['a', 'bc'], ['def']]))
