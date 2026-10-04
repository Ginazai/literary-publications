# Implementation Plan: Literary publication

## Overview
WriteFreely (CMS, Aiven MySQL) + React/Vite reader with StPageFlip. Design read: personal literary essays, phone-first readers, quiet editorial language. Dials: VARIANCE 6, MOTION 3, DENSITY 2. The book is the one memorable element; everything else stays quiet.

## Design tokens
- Desk #0d1113 (graphite), paper #e8ebe8 (cool), ink #101416, muted #8c979b, accent #4aa585 (progress, hover, focus). Square corners. One theme.
- Type: EB Garamond (essays, titles) and Geist (interface), both self-hosted via @fontsource-variable.
- Layout: home is a contents page (title, dotted leader, date), left aligned. Essay is a book on the desk, plain-text toggle beside it.

## Architecture decisions
- Pagination is pure and testable: `pack.ts` (no DOM) decides page boundaries; `paginate.ts` supplies a DOM measuring callback.
- Author breaks: `<!-- pagebreak -->`. Automatic pagination fills the rest.
- Multiple publications = multiple WriteFreely collections, listed in `VITE_WF_ALIASES`; URLs are `/:alias/:slug`. Requires WriteFreely multi-user mode (`single_user = false`).
- Same-origin `/wf` proxy to WriteFreely (Caddy in prod, Vite in dev).

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| StPageFlip (`page-flip`) is barely maintained | Med | Keep it behind BookReader; plain-text mode is the fallback |
| Single paragraph taller than a page is clipped | Med | Task 5: split long paragraphs by sentence |
| Aiven free plan powers off when idle | High | Use Developer tier for production; monitor |
| WriteFreely field names/API shape unverified | Med | Task 1 checkpoint against a live instance |

## Open questions
- Site name is "test", author Rafael Caballero (set in `frontend/src/config.ts`). Real publication names still to decide.
- Self-hosted font choice (needs network to fetch).
