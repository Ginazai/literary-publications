import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'theme'
const BAR: Record<Theme, string> = { dark: '#1A1714', light: '#E7E3D7' }

const system = (): Theme => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
const stored = (): Theme | null => { try { const s = localStorage.getItem(KEY); return s === 'light' || s === 'dark' ? s : null } catch { return null } }

function apply(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[t])
}

/** The reader's choice wins; otherwise the system setting. index.html sets the first value before paint. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || stored() || system())
  useEffect(() => { apply(theme) }, [theme])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const on = () => { if (!stored()) setTheme(system()) }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const toggle = () => { const next: Theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(KEY, next) } catch { /* private mode */ } setTheme(next) }
  return [theme, toggle]
}
