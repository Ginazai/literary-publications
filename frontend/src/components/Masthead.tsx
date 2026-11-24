import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft, Moon, Sun } from '@phosphor-icons/react'
import { useSite } from '../lib/site'
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

/** Full masthead on the home page; a slim bar on posts so the book stays near the top of the screen. */
export default function Masthead({ compact }: { compact: boolean }) {
  const site = useSite()
  if (compact) return (
    <header className="masthead masthead--compact" id="top">
      <nav className="shell bar" aria-label="Primary">
        <Link to="/" className="back"><ArrowLeft aria-hidden="true" weight="light" /><span>Home</span></Link>
        <p className="brand"><Link to="/">{site.name}</Link></p>
        <div className="bar-end"><ThemeToggle /></div>
      </nav>
      <div className="shell"><div className="rule" aria-hidden="true" /></div>
    </header>
  )
  return (
    <header className="masthead" id="top">
      <div className="shell masthead-inner">
        <h1 className="brand brand--xl">{site.name}</h1>
        {site.description && <p className="tagline">{site.description}</p>}
        <div className="rule" aria-hidden="true" />
        <nav className="primary-nav" aria-label="Primary">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/catalog">Catalog</NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
