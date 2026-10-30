import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft, Moon, Sun } from '@phosphor-icons/react'
import { SITE } from '../config'
import { useTheme } from '../lib/theme'

function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const light = theme === 'light'
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}>
      {light ? <Moon aria-hidden="true" weight="light" /> : <Sun aria-hidden="true" weight="light" />}
    </button>
  )
}

/** Full masthead on the home page; a slim bar on essays so the book stays near the top of the screen. */
export default function Masthead({ compact }: { compact: boolean }) {
  if (compact) return (
    <header className="masthead masthead--compact" id="top">
      <nav className="shell bar" aria-label="Primary">
        <Link to="/" className="back"><ArrowLeft aria-hidden="true" weight="light" /><span>Essays</span></Link>
        <p className="brand"><Link to="/">{SITE.name}</Link></p>
        <div className="bar-end"><ThemeToggle /></div>
      </nav>
      <div className="shell"><div className="rule" aria-hidden="true" /></div>
    </header>
  )
  return (
    <header className="masthead" id="top">
      <div className="shell masthead-inner">
        <h1 className="brand brand--xl">{SITE.name}</h1>
        <p className="tagline">Essays by {SITE.author}</p>
        <div className="rule" aria-hidden="true" />
        <nav className="primary-nav" aria-label="Primary">
          <NavLink to="/" end>Essays</NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
