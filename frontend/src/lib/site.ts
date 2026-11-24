import { useEffect, useState } from 'react'
import { getSite, Site } from './writefreely'

const EMPTY: Site = { name: '', description: '' }
/** The site name and description from WriteFreely; empty strings until loaded (or if it cannot be reached). */
export function useSite(): Site {
  const [site, setSite] = useState(EMPTY)
  useEffect(() => { getSite().then(setSite) }, [])
  return site
}
