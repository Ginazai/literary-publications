import { useEffect, useRef, useState } from 'react'
import { PageFlip } from 'page-flip'
import { paginate } from '../lib/paginate'

export default function BookReader({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ page: 0, total: 1 })
  const flip = useRef<PageFlip | null>(null)

  useEffect(() => {
    const el = host.current; if (!el) return
    const mobile = window.innerWidth < 800
    const w = mobile ? Math.min(window.innerWidth - 32, 420) : 420
    const h = Math.round(w * 1.4)
    const chunks = paginate(html, w, h)
    el.innerHTML = ''
    const pages = chunks.map(c => { const d = document.createElement('div'); d.className = 'page'; d.innerHTML = c; return d })
    pages.forEach(p => el.appendChild(p))
    const pf = new PageFlip(el, { width: w, height: h, size: 'fixed', usePortrait: true, showCover: false,
      mobileScrollSupport: false, maxShadowOpacity: 0.4, flippingTime: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 700 })
    pf.loadFromHTML(pages)
    pf.on('flip', e => setState({ page: e.data as number, total: chunks.length }))
    setState({ page: 0, total: chunks.length })
    flip.current = pf
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') pf.flipNext(); if (e.key === 'ArrowLeft') pf.flipPrev() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); pf.destroy() }
  }, [html])

  return (
    <div className="reader">
      <div ref={host} className="book" />
      <div className="ribbon" role="progressbar" aria-valuemin={1} aria-valuemax={state.total} aria-valuenow={Math.min(state.page + 1, state.total)}><i style={{ width: `${((Math.min(state.page + 1, state.total)) / state.total) * 100}%` }} /></div>
      <div className="controls">
        <button onClick={() => flip.current?.flipPrev()} aria-label="Previous page">Previous</button>
        <span aria-live="polite">{Math.min(state.page + 1, state.total)} of {state.total}</span>
        <button onClick={() => flip.current?.flipNext()} aria-label="Next page">Next</button>
      </div>
    </div>
  )
}
