import { parseAliases } from './lib/post'
export const SITE = { name: 'test', author: 'Rafael Caballero' }
/** Comma-separated WriteFreely collection aliases, one per publication, each optionally `alias:Category`. */
export const BLOGS = parseAliases((import.meta.env.VITE_WF_ALIASES as string) || 'test')
