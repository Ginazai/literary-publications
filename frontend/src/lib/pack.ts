export const BREAK = Symbol('break')
export type Item<T> = T | typeof BREAK

/** Greedy page packing. `fits` says whether a list of blocks fits on one page. */
export function packPages<T>(items: Item<T>[], fits: (page: T[]) => boolean): T[][] {
  const pages: T[][] = []
  let cur: T[] = []
  const flush = () => { if (cur.length) pages.push(cur); cur = [] }
  for (const it of items) {
    if (it === BREAK) { flush(); continue }
    const next = [...cur, it as T]
    if (cur.length && !fits(next)) { flush(); cur = [it as T] } else cur = next
  }
  flush()
  return pages.length ? pages : [[]]
}
