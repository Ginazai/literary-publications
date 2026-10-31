# ADR-001: Use WriteFreely as the CMS and read it through its public API

## Status
Accepted

## Date
2026-10-30 (recorded retroactively; the decision predates this record and is taken from the original `docs/technology-decision.md`)

## Context
The site publishes personal literary essays. Requirements:
- A writing and publishing workflow for one author (draft, edit, publish) without building an admin UI.
- A distinctive, book-like public reader that a conventional blog theme cannot provide.
- Free/open-source software, self-hostable, no proprietary CMS subscription.
- RSS/Atom for subscription from day one.

## Decision
Run **WriteFreely** (Go) as the CMS and administration interface. Build the public site as a separate **React + Vite + TypeScript** single-page app that reads published posts from WriteFreely's public API (`/api/collections/{alias}` and `/api/collections/{alias}/posts`). One WriteFreely post is one essay. Post bodies arrive as raw Markdown, so the app parses and sanitizes them itself (`marked` + `DOMPurify`).

There is no second admin panel and no application backend of our own.

## Alternatives Considered

### Build a CMS from scratch
- Pros: total control.
- Cons: needs auth, editor, drafts, publishing, API and admin UI, all of which are solved problems.
- Rejected: effort belongs in the reading experience, not in duplicating a publishing system.

### WordPress
- Pros: free, mature, extensible.
- Cons: far larger than needed (page builders, plugin ecosystem, e-commerce).
- Rejected: WriteFreely is focused on writing and fits the headless approach better.

### Static site generator (Astro, Hugo, Jekyll) with Markdown in Git
- Pros: very cheap and fast.
- Cons: the workflow becomes write Markdown, commit, build, deploy, which is developer-oriented.
- Rejected: the wanted workflow is open the CMS, write, publish.

### Supabase or a custom Node/FastAPI backend
- Rejected: WriteFreely already provides backend, auth, content management and storage. Revisit only if the project needs backend features WriteFreely cannot provide.

## Consequences
- The public site depends on the shape of WriteFreely's API. That shape has not yet been confirmed against a live instance (task T1c in `tasks/todo.md`).
- The public API is paginated (10 posts per page). `frontend/src/lib/writefreely.ts` fetches up to 49 pages per publication, so a publication is capped at roughly 490 essays until that loop changes.
- WriteFreely expects to own its site root, so it runs on its own host or subdomain and the reader is served separately (see `docs/architecture.md`).
- WriteFreely's own pages (login, admin, its public blog theme) remain reachable on the WriteFreely host. Customising them is possible through a theme but is not planned.
- Avoid modifying WriteFreely core so upgrades stay simple.
