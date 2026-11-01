export interface Essay { alias: string; slug: string; title: string; created: string; tags: string[]; body: string }

/**
 * WriteFreely sends `title: ""` for untitled posts and leaves `slug` out entirely,
 * so an untitled post takes its blog's name and is addressed by its id.
 */
export function toEssay(p: any, alias: string, blogTitle: string): Essay {
  return { alias, slug: p.slug || String(p.id), title: p.title?.trim() || blogTitle, created: p.created, tags: p.tags ?? [], body: p.body }
}

/** "novel:Novel, diary:Notebook, notes" -> [{alias, kind}]; a missing kind is "Blog". */
export function parseAliases(raw: string): { alias: string; kind: string }[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [alias, kind] = s.split(':').map(x => x.trim())
    return { alias, kind: kind || 'Blog' }
  })
}
