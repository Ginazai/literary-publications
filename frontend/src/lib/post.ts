export interface Essay { alias: string; slug: string; title: string; created: string; tags: string[]; body: string }

/** WriteFreely sends `title: ""` and no `slug` for untitled posts, so those are addressed by their id. */
export function toEssay(p: any, alias: string): Essay {
  return { alias, slug: p.slug || String(p.id), title: p.title?.trim() || 'Untitled', created: p.created, tags: p.tags ?? [], body: p.body }
}

/** A blog's display format as WriteFreely shows it: blog (the default, sent as nothing), novel or notebook. */
export const kindOf = (format?: string) => { const f = format || 'blog'; return f[0].toUpperCase() + f.slice(1) }
