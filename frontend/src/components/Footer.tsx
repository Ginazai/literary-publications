import { useSite } from '../lib/site'
import Reveal from './Reveal'

export default function Footer() {
  const site = useSite()
  return (
    <footer className="site-footer">
      <Reveal className="shell footer-inner">
        <div className="part">
          <p className="footer-name">{site.name}</p>
          <p className="footer-note">© {new Date().getFullYear()}{site.description && ` · ${site.description}`}</p>
        </div>
        <a className="textlink part" href="#top">Back to top</a>
      </Reveal>
    </footer>
  )
}
