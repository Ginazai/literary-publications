import { useEffect, useRef, useState } from 'react'
import { PageFlip } from 'page-flip'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { paginate } from '../lib/paginate'

const FONTS = ['18px "EB Garamond Variable"', 'italic 18px "EB Garamond Variable"']

export default function BookReader({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null)
  const flip = useRef<PageFlip | null>(null)
  const [state, setState] = useState({ page: 0, total: 1, ready: false })

  useEffect(() => {
    let cancelled = false
    let pf: PageFlip | null = null
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') pf?.flipNext(); if (e.key === 'ArrowLeft') pf?.flipPrev() }
    // Pagination measures text, so wait for the fonts or page breaks will be wrong.
    Promise.all(FONTS.map(f => document.fonts.load(f))).catch(() => undefined).then(() => {
      const root = host.current
      if (cancelled || !root) return
      const w = window.innerWidth < 800 ? Math.min(window.innerWidth - 32, 420) : 420
      const h = Math.round(w * 1.42)
      const chunks = paginate(html, w, h)
      const mount = document.createElement('div')
      root.replaceChildren(mount)
      const pages = chunks.map((c, i) => {
        const d = document.createElement('div'); d.className = 'page'; d.innerHTML = c; d.dataset.folio = String(i + 1); mount.appendChild(d); return d
      })
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      pf = new PageFlip(mount, { width: w, height: h, size: 'fixed', usePortrait: true, showCover: false,
        mobileScrollSupport: false, maxShadowOpacity: 0.35, flippingTime: calm ? 1 : 650 })
      pf.loadFromHTML(pages)
      pf.on('flip', e => setState(s => ({ ...s, page: e.data as number })))
      flip.current = pf
      setState({ page: 0, total: chunks.length, ready: true })
      window.addEventListener('keydown', key)
    })
    return () => { cancelled = true; window.removeEventListener('keydown', key); try { pf?.destroy() } catch { /* already removed */ } host.current?.replaceChildren(); flip.current = null }
  }, [html])

  const n = Math.min(state.page + 1, state.total)
  return (
    <div className="reader">
      <div ref={host} className="book" aria-label="Essay, paged view" />
      {!state.ready && <div className="book-skeleton" aria-hidden="true" />}
      <div className="ribbon" role="progressbar" aria-label="Reading progress" aria-valuemin={1} aria-valuemax={state.total} aria-valuenow={n}><i style={{ width: `${(n / state.total) * 100}%` }} /></div>
      <div className="controls">
        <button onClick={() => flip.current?.flipPrev()} aria-label="Previous page"><ArrowLeft aria-hidden="true" /> Previous</button>
        <span className="count" aria-live="polite">{n} / {state.total}</span>
        <button onClick={() => flip.current?.flipNext()} aria-label="Next page">Next <ArrowRight aria-hidden="true" /></button>
      </div>
    </div>
  )
}
