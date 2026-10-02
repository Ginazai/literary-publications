import { BREAK, Item, packPages } from './pack'

/** Split HTML into page-sized chunks by measuring against a hidden page of the given size. */
export function paginate(html: string, w: number, h: number): string[] {
  const src = document.createElement('div'); src.innerHTML = html
  const probe = document.createElement('div')
  probe.className = 'page'
  probe.style.cssText = `position:absolute;visibility:hidden;left:-9999px;width:${w}px;height:${h}px`
  document.body.appendChild(probe)
  const items: Item<Element>[] = Array.from(src.children).map(n => n.matches('hr.pagebreak') ? BREAK : n)
  const fits = (page: Element[]) => {
    probe.replaceChildren(...page.map(n => n.cloneNode(true)))
    return probe.scrollHeight <= probe.clientHeight
  }
  const pages = packPages(items, fits).map(p => { probe.replaceChildren(...p.map(n => n.cloneNode(true))); return probe.innerHTML })
  probe.remove()
  return pages
}
