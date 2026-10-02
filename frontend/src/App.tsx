import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import MiniSearch from 'minisearch'
import { SITE } from './config'
import { Publication, getPublications, renderBody } from './lib/writefreely'
import BookReader from './components/BookReader'

function usePubs() {
  const [pubs, setPubs] = useState<Publication[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublications().then(setPubs).catch(e => setError(e.message)) }, [])
  return { pubs, error }
}

function Archive() {
  const { pubs, error } = usePubs()
  const [q, setQ] = useState('')
  const index = useMemo(() => {
    const m = new MiniSearch({ fields: ['title', 'body', 'tags'], idField: 'id', searchOptions: { prefix: true, fuzzy: 0.2 } })
    m.addAll((pubs ?? []).flatMap(p => p.essays.map(e => ({ id: `${e.alias}/${e.slug}`, title: e.title, body: e.body, tags: e.tags.join(' ') }))))
    return m
  }, [pubs])
  if (error) return <p role="alert">Could not load essays: {error}. Check that WriteFreely is running and VITE_WF_ALIASES matches your collections.</p>
  if (!pubs) return <p>Loading essays…</p>
  const hits = q.trim() ? new Set(index.search(q).map(r => r.id as string)) : null
  const sections = pubs.map(p => ({ ...p, essays: hits ? p.essays.filter(e => hits.has(`${e.alias}/${e.slug}`)) : p.essays })).filter(p => p.essays.length || !hits)
  return (<>
    <h1 className="contents-title">Contents</h1>
    <input type="search" placeholder="Search essays" value={q} onChange={e => setQ(e.target.value)} aria-label="Search essays" />
    {hits && sections.length === 0 && <p>No essays match “{q}”.</p>}
    {sections.map(p => (<section key={p.alias}>
      {pubs.length > 1 && <h2 className="pub-title">{p.title}</h2>}
      {p.essays.length === 0 && <p className="muted">No essays published yet.</p>}
      <ul className="archive">{p.essays.map(e => (
        <li key={e.slug}><Link to={`/${e.alias}/${e.slug}`}>{e.title}</Link><span className="leader" aria-hidden="true" />
          <time dateTime={e.created}>{new Date(e.created).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</time></li>))}</ul>
    </section>))}
  </>)
}

function Essay() {
  const { alias, slug } = useParams()
  const { pubs, error } = usePubs()
  const [plain, setPlain] = useState(false)
  if (error) return <p role="alert">{error}</p>
  if (!pubs) return <p>Loading…</p>
  const essay = pubs.find(p => p.alias === alias)?.essays.find(e => e.slug === slug)
  if (!essay) return <p>Essay not found. <Link to="/">Back to all essays</Link></p>
  const html = renderBody(essay.body)
  return (<article className="desk">
    <h1 className="essay-title">{essay.title}</h1>
    <p className="byline">{SITE.author}</p>
    <button className="quiet" onClick={() => setPlain(p => !p)}>{plain ? 'Show book view' : 'Show plain text'}</button>
    {plain ? <div className="plain" dangerouslySetInnerHTML={{ __html: html }} /> : <BookReader html={html} />}
  </article>)
}

export default function App() {
  return (<BrowserRouter>
    <header><Link to="/" className="mark">{SITE.name}</Link></header>
    <main><Routes><Route path="/" element={<Archive />} /><Route path="/:alias/:slug" element={<Essay />} /></Routes></main>
    <footer>© {new Date().getFullYear()} {SITE.author}</footer>
  </BrowserRouter>)
}
