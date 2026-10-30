import { SITE } from '../config'
import Reveal from './Reveal'

export default function Footer() {
  return (
    <footer className="site-footer">
      <Reveal className="shell footer-inner">
        <div className="part">
          <p className="footer-name">{SITE.name}</p>
          <p className="footer-note">© {new Date().getFullYear()} {SITE.author}</p>
        </div>
        <a className="textlink part" href="#top">Back to top</a>
      </Reveal>
    </footer>
  )
}
