import { ElementType, ReactNode, useEffect, useRef, useState } from 'react'

/** Marks its element as "in view" once (children with class `part` then rise in turn), when it first scrolls into view. Without IntersectionObserver it simply shows. */
export default function Reveal({ as: Tag = 'div', delay = 0, className, children }: { as?: 'div' | 'li' | 'section'; delay?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const T = Tag as ElementType
  return <T ref={ref} className={className} data-in={seen ? '' : undefined} style={{ ['--d' as string]: delay }}>{children}</T>
}
