export const SITE = { name: 'test', author: 'Rafael Caballero' }
/** Comma-separated WriteFreely collection aliases, one per publication. WriteFreely has no public API to list a user's blogs. */
export const ALIASES = ((import.meta.env.VITE_WF_ALIASES as string) || 'test').split(',').map(s => s.trim()).filter(Boolean)
