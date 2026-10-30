export const minutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220))
export const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
