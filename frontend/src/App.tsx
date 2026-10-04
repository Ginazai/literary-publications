import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import MiniSearch from 'minisearch'
import { SITE } from './config'
import { Publication, getPublications, renderBody } from './lib/writefreely'
import BookReader from './components/BookReader'

const minutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 220))

function usePubs() {
  const [pubs, setPubs] = useState<Publication[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublications().then(setPubs).catch(e => setError(e.message)) }, [])
  return { pubs, error }
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="notice" role="alert"><h2>{title}</h2><p>{children}</p></div>
}

function Archive() {
  const { pubs, error } = usePubs()
  const [q, setQ] = useState('')
  const index = useMemo(() => {
    const m = new MiniSearch({ fields: ['title', 'body', 'tags'], idField: 'id', searchOptions: { prefix: true, fuzzy: 0.2 } })
    m.addAll((pubs ?? []).flatMap(p => p.essays.map(e => ({ id: `${e.alias}/${e.slug}`, title: e.title, body: e.body, tags: e.tags.join(' ') }))))
    return m
  }, [pubs])
  const hits = q.trim() ? new Set(index.search(q).map(r => r.id as string)) : null
  const sections = (pubs ?? []).map(p => ({ ...p, essays: hits ? p.essays.filter(e => hits.has(`${e.alias}/${e.slug}`)) : p.essays })).filter(p => p.essays.length || !hits)
  return (
    <div className="home">
      <div className="intro">
        <h1 className="site-title">{SITE.name}</h1>
        <p className="author">Essays by {SITE.author}</p>
        <input type="search" placeholder="Search the essays" value={q} onChange={e => setQ(e.target.value)} aria-label="Search essays" />
      </div>
      <div className="toc">
        {error && <Notice title="The essays could not be loaded">{error}</Notice>}
        {!error && !pubs && <ul className="archive skeleton" aria-label="Loading essays">{[70, 55, 80, 62].map((w, i) => <li key={i}><span style={{ width: `${w}%` }} /></li>)}</ul>}
        {hits && pubs && sections.length === 0 && <p className="muted">No essay matches “{q}”.</p>}
        {sections.map(p => (
          <section key={p.alias}>
            {(pubs?.length ?? 0) > 1 && <h2 className="pub-title">{p.title}</h2>}
            {p.essays.length === 0 && <p className="muted">Nothing is published here yet. Publish a post in WriteFreely and it will appear.</p>}
            <ul className="archive">{p.essays.map((e, i) => (
              <li key={e.slug} style={{ ['--i' as string]: i }}>
                <Link to={`/${e.alias}/${e.slug}`}>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t">{e.title}</span>
                  <span className="meta">{minutes(e.body)} min <time dateTime={e.created}>{new Date(e.created).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</time></span>
                </Link>
              </li>))}</ul>
          </section>))}
      </div>
    </div>
  )
}

function Essay() {
  const { alias, slug } = useParams()
  const { pubs, error } = usePubs()
  const [plain, setPlain] = useState(false)
  const back = <Link to="/" className="back"><ArrowLeft aria-hidden="true" /> All essays</Link>
  if (error) return <>{back}<Notice title="The essay could not be loaded">{error}</Notice></>
  if (!pubs) return <>{back}<div className="book-skeleton" aria-label="Loading essay" /></>
  const essay = pubs.find(p => p.alias === alias)?.essays.find(e => e.slug === slug)
  if (!essay) return <>{back}<Notice title="Essay not found">This link may be old. Go back to the full list.</Notice></>
  const html = renderBody(essay.body)
  return (
    <article>
      {back}
      <div className="essay-head">
        <div><h1 className="essay-title">{essay.title}</h1><p className="byline">{SITE.author}, {minutes(essay.body)} min read</p></div>
        <button className="ghost" onClick={() => setPlain(p => !p)}>{plain ? 'Show book view' : 'Show plain text'}</button>
      </div>
      {plain ? <div className="plain" dangerouslySetInnerHTML={{ __html: html }} /> : <BookReader html={html} />}
    </article>
  )
}

export default function App() {
  return (<BrowserRouter>
    <main className="shell"><Routes><Route path="/" element={<Archive />} /><Route path="/:alias/:slug" element={<Essay />} /></Routes></main>
    <footer className="shell">© {new Date().getFullYear()} {SITE.author}</footer>
  </BrowserRouter>)
}
