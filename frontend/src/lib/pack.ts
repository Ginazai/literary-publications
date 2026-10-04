export const BREAK = Symbol('break')
export type Item<T> = T | typeof BREAK
/** Given an item and a test for "does this head fit on the current page", return [head, tail] or null. */
export type Splitter<T> = (item: T, room: (head: T) => boolean) => [T, T] | null

/** Greedy page packing. `fits` says whether a list of blocks fits on one page; `split` may cut a block across pages. */
export function packPages<T>(items: Item<T>[], fits: (page: T[]) => boolean, split?: Splitter<T>): T[][] {
  const pages: T[][] = []
  let cur: T[] = []
  const flush = () => { if (cur.length) pages.push(cur); cur = [] }
  const queue = [...items]
  while (queue.length) {
    const it = queue.shift() as Item<T>
    if (it === BREAK) { flush(); continue }
    const x = it as T
    if (fits([...cur, x])) { cur = [...cur, x]; continue }
    const parts = split?.(x, head => fits([...cur, head]))
    if (parts) { cur = [...cur, parts[0]]; flush(); queue.unshift(parts[1]); continue }
    if (cur.length) { flush(); queue.unshift(x) } else cur = [x]
  }
  flush()
  return pages.length ? pages : [[]]
}
