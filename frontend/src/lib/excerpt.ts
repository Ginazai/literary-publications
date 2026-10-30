/** The first readable paragraph of a Markdown essay as plain text, cut at a word boundary. */
export function excerpt(md: string, max = 190): string {
  const blocks = md.replace(/<!--[\s\S]*?-->/g, '').split(/\n\s*\n/)
  for (const raw of blocks) {
    const block = raw.trim()
    // Skip headings, quotes, lists, code, rules and raw HTML: they are not an opening paragraph.
    if (!block || /^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~|(\*\s*){3,}$|-{3,}$|_{3,}$|<)/.test(block)) continue
    const text = block
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/(\*{1,3})(\S(?:[^]*?\S)?)\1/g, '$2')
      .replace(/(^|[^\w])(_{1,3})(\S(?:[^]*?\S)?)\2(?=[^\w]|$)/g, '$1$3')
      .replace(/`/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue
    if (text.length <= max) return text
    const cut = text.slice(0, max + 1)
    const at = cut.lastIndexOf(' ')
    return cut.slice(0, at > max * 0.6 ? at : max).replace(/[\s,;:.\-–—]+$/, '') + '…'
  }
  return ''
}
