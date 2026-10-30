# Implementation Plan: Literary publication

## Overview
WriteFreely (CMS, Aiven MySQL) + React/Vite reader with StPageFlip. Design read: personal literary essays, phone-first readers, quiet editorial language. The book is the one memorable element; everything else stays quiet.

## Design tokens
Superseded by the Lamplighter-based system: see `docs/design-system.md`. Warm dark and stone-and-bronze light themes, Cormorant Garamond + EB Garamond (both self-hosted), round controls and square surfaces, one gold rule.

## Architecture decisions
- Pagination is pure and testable: `pack.ts` (no DOM) decides page boundaries; `paginate.ts` supplies a DOM measuring callback.
- Page turn is custom CSS (page-flip removed: it caused layout collapse, scroll jumps and an abrupt page vanish).
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
