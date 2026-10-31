# Implementation plan: Literary publication

## Overview
WriteFreely (CMS, Aiven MySQL) + a React/Vite reader. Design read: personal literary essays, phone-first readers, quiet editorial language. The book is the one memorable element; everything else stays quiet.

How it works: `docs/architecture.md`. Why: `docs/decisions/`. Visual system: `docs/design-system.md`.

## Architecture decisions (summary)
- Pagination is pure and testable: `pack.ts` (no DOM) decides page boundaries; `paginate.ts` supplies a DOM measuring callback. Author breaks: `<!-- pagebreak -->`; automatic pagination fills the rest (ADR-002).
- The page turn is custom CSS. StPageFlip was removed because it caused layout collapse, scroll jumps and an abrupt page vanish (ADR-003).
- Multiple publications = multiple WriteFreely collections listed in `VITE_WF_ALIASES`; URLs are `/:alias/:slug`. Needs WriteFreely multi-user mode (`single_user = false`) (ADR-005).
- The reader reaches WriteFreely through a same-origin `/wf` proxy (Caddy in production, Vite in dev), or directly through `VITE_WF_BASE` (Render trial).

## Risks
| Risk | Impact | Status / mitigation |
|---|---|---|
| WriteFreely field names and API shape unverified against a live instance | Med | Open. Task T1c |
| Cross-origin calls from the Render reader to WriteFreely unverified | Med | Open. Check with T1c; the Caddy setup avoids the question |
| Aiven free plan may power off when idle | High | Use the Developer tier or above for production; monitor (ADR-004) |
| Render free web service sleeps (about a minute to wake) and has no disk | High | Acceptable for a trial only; paid service or VPS for launch |
| API client stops after 49 pages (about 490 essays per publication) | Low | Raise the limit or stop on a short page if the archive grows |
| One failing collection makes the whole archive error | Low | Load publications independently if it becomes a problem |
| Page text and pagination untested with images in essays | Low | Test once an essay uses an image |
| ~~StPageFlip is barely maintained~~ | n/a | Resolved: removed |
| ~~A paragraph taller than a page is clipped~~ | n/a | Resolved: paragraphs split by word (T3) |

## Open questions
- Site name is the placeholder `test` and author is Rafael Caballero. The name is set in `frontend/src/config.ts`, `frontend/index.html` and `render.yaml`. Real publication names are still to decide.
- Subscription by email: evaluate WriteFreely's built-in email subscriptions (v0.15+) before building anything separate.
