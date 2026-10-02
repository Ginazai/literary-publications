export const SITE = { name: 'test', author: 'Rafael Caballero' }
/** Comma-separated WriteFreely collection aliases, one per publication. */
export const ALIASES = ((import.meta.env.VITE_WF_ALIASES as string) || 'test').split(',').map(s => s.trim()).filter(Boolean)
