# ADR-005: One publication is one WriteFreely collection

## Status
Accepted

## Date
2026-10-30 (recorded retroactively)

## Context
The original plan assumed a single collection. The site needed several named publications (series of essays), each listed on the home page and addressable by URL.

## Decision
Each publication is a **public WriteFreely collection**. The collection aliases are listed in `VITE_WF_ALIASES` (comma-separated, default `test`) and read in `frontend/src/config.ts`. The reader loads every listed collection, and essay URLs are `/:alias/:slug`. When more than one publication exists, the home page groups earlier essays under each publication's title.

This requires WriteFreely **multi-user mode** (`single_user = false`) and a `max_blogs` high enough for the number of publications. `open_registration` stays `false`.

## Alternatives Considered

### Single collection with tags per series
- Pros: works in single-user mode.
- Cons: no separate title, description or feed per publication.
- Rejected.

## Consequences
- Adding a publication means creating the collection in WriteFreely and adding its alias to `VITE_WF_ALIASES`, then rebuilding the reader (Vite bakes the variable in at build time).
- Aliases must be unique across publications, since they form the first URL segment. An alias that matches a reserved route would conflict; there are currently no other top-level routes.
- A failing collection makes `Promise.all` reject, so the whole archive shows an error, not just that publication.
