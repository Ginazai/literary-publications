import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { paginate } from '../lib/paginate'

// Pagination measures text, so every face used inside a page is loaded first.
const FONTS = ['18px "EB Garamond Variable"', 'italic 18px "EB Garamond Variable"', '600 28px "Cormorant Garamond Variable"']
const MAX_PAGE_W = 440
/** Cover-board padding and page size for a viewport width (shell margins are 20px a side). */
const sizeFor = (vw: number) => { const pad = vw < 480 ? 6 : 12; const w = Math.min(vw - 40 - pad * 2, MAX_PAGE_W); return { pad, w, h: Math.round(w * 1.42) } }
type Dir = 'next' | 'prev'
interface Turn { dir: Dir; from: number; to: number }

export default function BookReader({ html, title }: { html: string; title: string }) {
  const [vw, setVw] = useState(window.innerWidth)
  const [book, setBook] = useState<{ w: number; h: number; pad: number; pages: string[] } | null>(null)
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
      const { w, h, pad } = sizeFor(vw)
      const pages = paginate(html, w, h)
      const { index: i, total } = latest.current
      setBook({ w, h, pad, pages }); turnRef.current = null; setTurn(null)
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
    <div className={`page ${cls}`} data-folio={n + 1} data-head={n > 0 ? title : undefined} style={{ width: book.w, height: book.h }} {...extra} dangerouslySetInnerHTML={{ __html: book.pages[n] }} />)

  return (
    <div className="reader">
      <button type="button" className="icon-btn turn-prev" onClick={() => go('prev')} disabled={!book || shown === 0} aria-label="Previous page"><ArrowLeft aria-hidden="true" weight="light" /></button>
      <div className="cover" style={{ ['--pad' as string]: `${book?.pad ?? 12}px` }}>
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
        ) : <div className="book-skeleton" role="status" aria-label="Preparing pages" />}
      </div>
      <button type="button" className="icon-btn turn-next" onClick={() => go('next')} disabled={!book || shown >= total - 1} aria-label="Next page"><ArrowRight aria-hidden="true" weight="light" /></button>
      <div className="progress">
        <div className="ribbon" role="progressbar" aria-label="Reading progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={shown + 1}><i style={{ width: `${((shown + 1) / total) * 100}%` }} /></div>
        <p className="count" aria-live="polite">Page {shown + 1} of {total}</p>
      </div>
    </div>
  )
}
