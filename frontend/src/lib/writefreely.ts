import { BLOGS } from '../config'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

import { Essay, toEssay } from './post'
export type { Essay }
export interface Publication { alias: string; title: string; kind: string; essays: Essay[] }
const BASE = (import.meta.env.VITE_WF_BASE as string) || '/wf'
let cache: Promise<Publication[]> | null = null

async function getJson(path: string) {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`WriteFreely returned ${res.status} for ${path}`)
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('Got a web page instead of JSON. Check that VITE_WF_BASE points to your WriteFreely /api URL, then rebuild.')
  return res.json()
}

async function loadPublication({ alias, kind }: { alias: string; kind: string }): Promise<Publication> {
  const meta = await getJson(`collections/${alias}`).catch(() => null)
  const title = meta?.data?.title || alias
  const essays: Essay[] = []
  for (let n = 1; n < 50; n++) {
    const json = await getJson(`collections/${alias}/posts?page=${n}`)
    const posts = json.data?.posts ?? []
    if (!posts.length) break
    essays.push(...posts.map((p: any) => toEssay(p, alias, title)))
  }
  return { alias, title, kind, essays }
}

export function getPublications(): Promise<Publication[]> {
  cache ??= Promise.all(BLOGS.map(loadPublication))
  return cache
}

/** Markdown -> sanitized HTML. `<!-- pagebreak -->` becomes a forced page break. */
export function renderBody(md: string): string {
  const html = marked.parse(md.replace(/<!--\s*pagebreak\s*-->/g, '\n\n<hr class="pagebreak">\n\n'), { async: false }) as string // taste-skill-ignore: structural page-break marker, removed by paginate.ts, never drawn
  return DOMPurify.sanitize(html, { ADD_ATTR: ['class'] })
}
