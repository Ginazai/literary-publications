import { ReactNode, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import MiniSearch from 'minisearch'
import { SITE } from './config'
import { Essay as EssayData, Publication, getPublications, renderBody } from './lib/writefreely'
import { excerpt } from './lib/excerpt'
import { longDate, minutes } from './lib/format'
import BookReader from './components/BookReader'
import Masthead from './components/Masthead'
import Footer from './components/Footer'
import Reveal from './components/Reveal'

function usePubs() {
  const [pubs, setPubs] = useState<Publication[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublications().then(setPubs).catch(e => setError(e.message)) }, [])
  return { pubs, error }
}
const useTitle = (title: string) => useEffect(() => { document.title = title }, [title])
const keyOf = (e: EssayData) => `${e.alias}/${e.slug}`
const pathOf = (e: EssayData) => `/${e.alias}/${e.slug}`

function Notice({ title, children, back }: { title: string; children: ReactNode; back?: boolean }) {
  return <div className="notice" role="alert"><h2>{title}</h2><p>{children}</p>{back && <Link className="textlink" to="/">All essays</Link>}</div>
}

function Meta({ essay, className = '' }: { essay: EssayData; className?: string }) {
  return <p className={`side ${className}`}><time dateTime={essay.created}>{longDate(essay.created)}</time><span>{minutes(essay.body)} min read</span></p>
}

function Lead({ essay }: { essay: EssayData }) {
  return (
    <article className="lead ledger" aria-labelledby="lead-title">
      <h2 id="lead-title" className="lead-title">{essay.title}</h2>
      <Meta essay={essay} />
      <p className="lead-excerpt">{excerpt(essay.body, 260)}</p>
      <Link className="btn stretch" to={pathOf(essay)}>Read the essay<span className="sr">: {essay.title}</span><ArrowRight aria-hidden="true" weight="light" /></Link>
    </article>
  )
}

function Row({ essay, level }: { essay: EssayData; level: 'h3' | 'h4' }) {
  const T = level
  return (
    <article className="row ledger">
      <T className="row-title part"><Link className="stretch" to={pathOf(essay)}>{essay.title}</Link></T>
      <Meta essay={essay} className="part" />
      <p className="row-excerpt part">{excerpt(essay.body)}</p>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Loading essays">
      <div className="lead ledger"><span className="bar bar--title" /><span className="bar bar--meta" /><span className="bar bar--text" /></div>
      {[0, 1, 2].map(i => <div className="row ledger" key={i}><span className="bar bar--row" /><span className="bar bar--meta" /><span className="bar bar--text" /></div>)}
    </div>
  )
}

function Archive() {
  const { pubs, error } = usePubs()
  const [q, setQ] = useState('')
  useTitle(SITE.name)
  const all = useMemo(() => (pubs ?? []).flatMap(p => p.essays), [pubs])
  const latest = useMemo(() => [...all].sort((a, b) => +new Date(b.created) - +new Date(a.created))[0], [all])
  const index = useMemo(() => {
    const m = new MiniSearch({ fields: ['title', 'body', 'tags'], idField: 'id', searchOptions: { prefix: true, fuzzy: 0.2 } })
    m.addAll(all.map(e => ({ id: keyOf(e), title: e.title, body: e.body, tags: e.tags.join(' ') })))
    return m
  }, [all])

  if (error) return <Notice title="The essays could not be loaded">{error}</Notice>
  if (!pubs) return <Skeleton />
  if (all.length === 0) return <Notice title="Nothing is published yet">Publish a post in WriteFreely and it will appear here.</Notice>

  const searching = q.trim().length > 0
  const hits = searching ? new Set(index.search(q).map(r => r.id as string)) : null
  const groups = pubs
    .map(p => ({ ...p, essays: p.essays.filter(e => (hits ? hits.has(keyOf(e)) : keyOf(e) !== keyOf(latest))) }))
    .filter(g => g.essays.length)
  const multi = pubs.length > 1

  return (
    <>
      {!searching && <Lead essay={latest} />}
      {(searching || groups.length > 0) && (
        <section className="contents" aria-labelledby="contents-title">
          <Reveal className="ledger contents-head">
            <h2 id="contents-title" className="contents-title part">{searching ? 'Results' : 'Earlier essays'}</h2>
            <div className="search part">
              <label htmlFor="q" className="sr">Search the essays</label>
              <input id="q" type="search" autoComplete="off" placeholder="Search the essays" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </Reveal>
          {searching && groups.length === 0 && <p className="empty">No essay matches “{q}”.</p>}
          {groups.map(g => (
            <div key={g.alias}>
              {multi && <h3 className="group-title">{g.title}</h3>}
              <ol className="rows">
                {g.essays.map((e, i) => <Reveal as="li" key={e.slug} delay={i % 4}><Row essay={e} level={multi ? 'h4' : 'h3'} /></Reveal>)}
              </ol>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

function EssayPage() {
  const { alias, slug } = useParams()
  const { pubs, error } = usePubs()
  const [plain, setPlain] = useState(false)
  const essay = pubs?.find(p => p.alias === alias)?.essays.find(e => e.slug === slug)
  useTitle(essay ? `${essay.title} · ${SITE.name}` : SITE.name)
  if (error) return <Notice title="The essay could not be loaded" back>{error}</Notice>
  if (!pubs) return <div className="cover"><div className="book-skeleton" role="status" aria-label="Loading essay" /></div>
  if (!essay) return <Notice title="Essay not found" back>This link may be old. Go back to the full list.</Notice>
  const html = renderBody(essay.body)
  return (
    <article className="essay">
      <h1 className="essay-title">{essay.title}</h1>
      <div className="ledger essay-body">
        <div className="essay-side">
          <Meta essay={essay} />
          <button type="button" className="linkbtn" onClick={() => setPlain(p => !p)}>{plain ? 'Show book view' : 'Show plain text'}</button>
        </div>
        <div className="essay-main">
          {plain ? <div className="plain" dangerouslySetInnerHTML={{ __html: html }} /> : <BookReader key={keyOf(essay)} html={html} title={essay.title} />}
        </div>
      </div>
    </article>
  )
}

function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Masthead compact={pathname !== '/'} />
      <main id="main" className="shell" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Archive />} />
          <Route path="/:alias/:slug" element={<EssayPage />} />
          <Route path="*" element={<Notice title="Page not found" back>There is nothing at this address.</Notice>} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return <BrowserRouter><Layout /></BrowserRouter>
}
