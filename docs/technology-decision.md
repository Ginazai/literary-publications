# Technology decision

Why this stack was chosen and what was deliberately left out. How the system works today is in `docs/architecture.md`; individual decisions and their trade-offs are in `docs/decisions/`.

## Project context

A personal literary publication for essays and longer-form writing, not academic publishing.

- Clean, responsive public site, phone-first.
- A book-like reading experience with a page-turn animation.
- Browsing and searching essays.
- An administration interface for writing and editing, without building one.
- A free subscription route (RSS/Atom).
- Free/open-source software; self-hosting or free infrastructure where practical.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| CMS and backend | WriteFreely (Go) | ADR-001. v0.17.2 is pinned in `ops/render/Dockerfile` |
| Database | MySQL 8 on Aiven | ADR-004 |
| Frontend | React 18 + Vite + TypeScript | Static build; no server-side rendering |
| Styling | Plain CSS in `styles.css` | Tokens in `docs/design-system.md` |
| Page turn | Custom CSS | ADR-003. StPageFlip was tried and removed |
| Search | MiniSearch in the browser | WriteFreely has no post search |
| Subscription | RSS/Atom from WriteFreely | Email: see below |
| Reverse proxy | Caddy (self-hosted) | `ops/Caddyfile` |
| Trial hosting | Render + Aiven | `render.yaml` |
| Source control | Git + GitHub | |

## Why React with Vite, not Next.js

The CMS already exists, so the frontend only has to render the public UI, fetch published content, hold reader state (current page, theme, search, plain-text switch) and handle responsive layout. Vite does that with no extra server framework. Avoid Next.js, its API routes, a separate application backend, and server-side rendering until a concrete requirement appears. One known cost of a client-rendered app: essay text is not in the initial HTML, so crawlers and link previews see an empty shell. If search-engine visibility becomes a goal, revisit this.

## Why plain CSS

The literary identity should not be dictated by a framework, and the design is small enough that one stylesheet with tokens is easier to keep consistent. Tailwind remains an option only if it would clearly speed up development.

## Search

Fetch the public posts once, index title, body and tags in the browser, search locally. Adequate for a personal archive. Introduce a dedicated search engine only if the archive becomes large; note also that the API client currently stops at about 490 essays per publication (`docs/architecture.md`).

## Subscription

RSS/Atom is the first mechanism: free, no email infrastructure, and WriteFreely produces the feeds (a collection's `/feed/`; the About/Subscribe page, T2, will link to it).

Email is a separate matter. Since v0.15, WriteFreely itself can offer email subscriptions to readers through an `[email]` section in its configuration, backed by an external mail provider. That is worth evaluating before building anything separate. The original plan assumed a standalone newsletter component; that assumption is out of date. Check the current WriteFreely documentation for which providers it supports before committing, and remember that email also brings unsubscribe handling, bounce handling and sender reputation.

## Hosting and cost

Software is free/open-source: WriteFreely, Go, React, Vite, TypeScript, MySQL, Caddy, Git. Infrastructure is the real cost. "$0 software" is achievable; "$0 hosting indefinitely" depends on providers' free-tier terms, which change. The design stays portable between hosts. Facts about the two free tiers in use (checked 2026-10-30 against Aiven's and Render's documentation):

- **Aiven free MySQL**: single node, 1 CPU / 1 GB RAM / 1 GB disk; may be powered off after inactivity (with notice) and Aiven may change region or configuration. The Developer tier is not auto-powered-off.
- **Render free web service**: spins down after 15 minutes without traffic and takes about a minute to start again; the filesystem is ephemeral and there are no persistent disks or shell access. Free static sites are fine for the reader.

Free app hosts that sleep or lack a disk are a poor fit for WriteFreely in production. For a real launch use a paid host (or a small VPS with Caddy) and a non-powering-off database tier.

## Backups

Back up the database separately from Git: a regular logical dump, an occasional full backup, and a copy stored off the server. Check what the chosen Aiven plan already includes. Git holds code only, never production dumps. Also back up WriteFreely's `config.ini` and `keys/`.

## Development practice

- Do not modify WriteFreely core. Customise through the React reader, optionally a WriteFreely theme, and configuration.
- Local setup: Node.js 22.6+ for the frontend and a WriteFreely binary with SQLite for a quick trial (`docs/setup-writefreely.md`, section A). There is no Docker Compose setup.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Custom CMS, WordPress, static site generator, Supabase | ADR-001 |
| SQLite in production, PostgreSQL | ADR-004 |
| StPageFlip | ADR-003 |
| Next.js or any server-side rendering | See above |

## Deferred

Do not add these without a concrete requirement: Next.js, a separate Node/FastAPI backend, Supabase, PostgreSQL, a dedicated search engine, microservices, a self-hosted mail server, complex analytics, a separate React admin, Kubernetes, Redis, GraphQL.

## What changed from the original plan

The first version of this document (2026) set direction before the reader was built. Differences now recorded elsewhere:

| Original plan | Now |
|---|---|
| StPageFlip for page turning | Custom CSS (ADR-003) |
| Desktop two-page spread plus mobile single page | Single page at all widths, max 440 px wide |
| Author-defined page boundaries | Automatic pagination with optional `<!-- pagebreak -->` (ADR-002) |
| One collection, routes such as `/essays/:slug` | Several collections; routes `/` and `/:alias/:slug` (ADR-005) |
| Component and page tree (`Header`, `Essays`, `Archive`, `Search`, `AccessibleReader`, ...) | Fewer, larger pieces; see `docs/architecture.md` |
| Email newsletter as a separate future component | Evaluate WriteFreely's built-in email subscriptions first |
| Eight-phase development order | Replaced by `tasks/plan.md` and `tasks/todo.md` |
| `writefreely-theme/` folder and Docker Compose for local development | Neither exists |
