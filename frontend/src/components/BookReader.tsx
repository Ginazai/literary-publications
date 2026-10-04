import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { paginate } from '../lib/paginate'

const FONTS = ['18px "EB Garamond Variable"', 'italic 18px "EB Garamond Variable"']
type Dir = 'next' | 'prev'
interface Turn { dir: Dir; from: number; to: number }

export default function BookReader({ html }: { html: string }) {
  const [vw, setVw] = useState(window.innerWidth)
  const [book, setBook] = useState<{ w: number; h: number; pages: string[] } | null>(null)
  const [index, setIndex] = useState(0)
  const [turn, setTurn] = useState<Turn | null>(null)
  const turnRef = useRef<Turn | null>(null)
  const latest = useRef({ index: 0, total: 1 })
  latest.current = { index, total: book?.pages.length ?? 1 }

  // Repaginate only when the width really changes (rotation), not when a phone's URL bar resizes the height.
  useEffect(() => {
    let t: number
    const on = () => { clearTimeout(t); t = window.setTimeout(() => setVw(v => Math.abs(window.innerWidth - v) > 40 ? window.innerWidth : v), 200) }
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('resize', on); clearTimeout(t) }
  }, [])

  // Pagination measures text, so wait for the fonts first or page breaks will be wrong.
  useEffect(() => {
    let off = false
    Promise.all(FONTS.map(f => document.fonts.load(f))).catch(() => undefined).then(() => {
      if (off) return
      const w = Math.min(vw - 32, 440), h = Math.round(w * 1.42)
      const pages = paginate(html, w, h)
      const { index: i, total } = latest.current
      setBook({ w, h, pages }); turnRef.current = null; setTurn(null)
      setIndex(total > 1 ? Math.round((i / (total - 1)) * (pages.length - 1)) : 0)
    })
    return () => { off = true }
  }, [html, vw])

  const total = book?.pages.length ?? 1
  const finish = () => { const t = turnRef.current; if (!t) return; turnRef.current = null; setIndex(t.to); setTurn(null) }
  const go = (dir: Dir) => {
    if (!book || turnRef.current) return
    const to = index + (dir === 'next' ? 1 : -1)
    if (to < 0 || to >= total) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setIndex(to); return }
    const t = { dir, from: index, to }; turnRef.current = t; setTurn(t)
  }
  const goRef = useRef(go); goRef.current = go
  useEffect(() => { if (!turn) return; const t = setTimeout(finish, 1000); return () => clearTimeout(t) }, [turn])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') goRef.current('next'); if (e.key === 'ArrowLeft') goRef.current('prev') }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [])

  const start = useRef<{ x: number; y: number } | null>(null)
  const shown = turn ? turn.to : index
  const under = turn ? (turn.dir === 'next' ? turn.to : turn.from) : index
  const leaf = turn ? (turn.dir === 'next' ? turn.from : turn.to) : null
  const page = (n: number, cls: string, extra?: object) => book && (
    <div className={`page ${cls}`} data-folio={n + 1} style={{ width: book.w, height: book.h }} {...extra} dangerouslySetInnerHTML={{ __html: book.pages[n] }} />)

  return (
    <div className="reader">
      {book ? (
        <div className="stage" role="group" aria-label={`Page ${shown + 1} of ${total}`} style={{ width: book.w, height: book.h }}
          onPointerDown={e => { start.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={e => { const s = start.current; start.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y
            if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(dx < 0 ? 'next' : 'prev') }}>
          {page(under, 'under')}
          {turn && leaf !== null && <>
            <div className={`shade ${turn.dir}`} />
            {page(leaf, `leaf ${turn.dir}`, { onAnimationEnd: finish, 'aria-hidden': true })}
          </>}
        </div>
      ) : <div className="book-skeleton" aria-label="Preparing pages" />}
      <div className="ribbon" role="progressbar" aria-label="Reading progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={shown + 1}><i style={{ width: `${((shown + 1) / total) * 100}%` }} /></div>
      <div className="controls">
        <button onClick={() => go('prev')} disabled={!book || shown === 0} aria-label="Previous page"><ArrowLeft aria-hidden="true" /> Previous</button>
        <span className="count" aria-live="polite">{shown + 1} / {total}</span>
        <button onClick={() => go('next')} disabled={!book || shown >= total - 1} aria-label="Next page">Next <ArrowRight aria-hidden="true" /></button>
      </div>
    </div>
  )
}
