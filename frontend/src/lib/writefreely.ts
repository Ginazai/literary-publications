import { ALIASES } from '../config'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export interface Essay { alias: string; slug: string; title: string; created: string; tags: string[]; body: string }
export interface Publication { alias: string; title: string; essays: Essay[] }
const BASE = (import.meta.env.VITE_WF_BASE as string) || '/wf'
let cache: Promise<Publication[]> | null = null

async function getJson(path: string) {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`WriteFreely returned ${res.status} for ${path}`)
  return res.json()
}

async function loadPublication(alias: string): Promise<Publication> {
  const meta = await getJson(`collections/${alias}`).catch(() => null)
  const essays: Essay[] = []
  for (let n = 1; n < 50; n++) {
    const json = await getJson(`collections/${alias}/posts?page=${n}`)
    const posts = json.data?.posts ?? []
    if (!posts.length) break
    essays.push(...posts.map((p: any) => ({ alias, slug: p.slug, title: p.title || 'Untitled', created: p.created, tags: p.tags ?? [], body: p.body })))
  }
  return { alias, title: meta?.data?.title || alias, essays }
}

export function getPublications(): Promise<Publication[]> {
  cache ??= Promise.all(ALIASES.map(loadPublication))
  return cache
}

/** Markdown -> sanitized HTML. `<!-- pagebreak -->` becomes a forced page break. */
export function renderBody(md: string): string {
  const html = marked.parse(md.replace(/<!--\s*pagebreak\s*-->/g, '\n\n<hr class="pagebreak">\n\n'), { async: false }) as string
  return DOMPurify.sanitize(html, { ADD_ATTR: ['class'] })
}
