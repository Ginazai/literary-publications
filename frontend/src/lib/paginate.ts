import { BREAK, Item, packPages } from './pack'

const TOKEN = /^\s*\S+\s*|\S+\s*/g
function textNodes(el: Element): Text[] {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out: Text[] = []
  for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n as Text)
  return out
}
const countWords = (el: Element) => textNodes(el).reduce((s, t) => s + (t.data.match(TOKEN)?.length ?? 0), 0)

/** Clone of `p` containing only words [from, to), keeping inline markup such as <em>. */
function slice(p: Element, from: number, to: number): Element {
  const c = p.cloneNode(true) as Element
  let i = 0
  for (const t of textNodes(c)) {
    const kept = (t.data.match(TOKEN) ?? []).filter(() => { const k = i++; return k >= from && k < to })
    if (kept.length) t.data = kept.join(''); else if (t.data.trim()) t.remove()
  }
  c.querySelectorAll('*').forEach(e => { if (!e.textContent?.trim() && !e.querySelector('img,br')) e.remove() })
  return c
}

function splitParagraph(p: Element, room: (h: Element) => boolean): [Element, Element] | null {
  if (p.tagName !== 'P') return null
  const n = countWords(p)
  if (n < 8) return null
  let lo = 0, hi = n - 1
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (room(slice(p, 0, mid))) lo = mid; else hi = mid - 1 }
  if (lo < 4) return null            // avoid a page that ends with a stub; move the paragraph instead
  const tail = slice(p, lo, n); tail.classList.add('cont')
  return [slice(p, 0, lo), tail]
}

/** Split HTML into page-sized chunks by measuring against a hidden page of the given size. Call after fonts load. */
export function paginate(html: string, w: number, h: number): string[] {
  const src = document.createElement('div'); src.innerHTML = html
  const probe = document.createElement('div')
  probe.className = 'page'
  probe.style.cssText = `position:absolute;visibility:hidden;left:-9999px;width:${w}px;height:${h}px`
  document.body.appendChild(probe)
  const items: Item<Element>[] = Array.from(src.children).map((n): Item<Element> => n.matches('hr.pagebreak') ? BREAK : n)
  // Measure the content height itself (not scrollHeight, which browsers disagree on when padding is involved).
  const cs = getComputedStyle(probe)
  const avail = h - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 1
  const box = document.createElement('div'); box.style.display = 'flow-root'; probe.appendChild(box)
  const fits = (page: Element[]) => { box.replaceChildren(...page.map(n => n.cloneNode(true))); return box.getBoundingClientRect().height <= avail }
  const pages = packPages(items, fits, splitParagraph).map(p => { box.replaceChildren(...p.map(n => n.cloneNode(true))); return box.innerHTML })
  probe.remove()
  return pages
}
