# Architecture

How the system works today. For why it was built this way, see `docs/decisions/` and `docs/technology-decision.md`.

## Components

```text
Browser ── React reader (static files) ──┐
                                         │ GET /api/collections/...  (JSON, Markdown bodies)
Author ─── WriteFreely admin (Go) ◄──────┘
                  │
                  ▼  MySQL over TLS
             Aiven MySQL 8
```

| Part | Where | Role |
|---|---|---|
| WriteFreely | `ops/` (config, Docker, Caddy) | CMS: writing, drafts, publishing, accounts, RSS feeds |
| Aiven MySQL 8 | external | All content and accounts |
| Reader | `frontend/` | Public site: archive, search, essay reader. Static files only; no server of its own |
| Caddy (self-hosted) or Render | `ops/Caddyfile`, `render.yaml` | Serves the reader and exposes WriteFreely |

## Content model

One WriteFreely post is one essay. One public WriteFreely collection is one publication (ADR-005). The reader never writes to WriteFreely.

`frontend/src/lib/writefreely.ts` calls:
- `GET {BASE}/collections/{alias}` for the publication title (falls back to the alias if this fails).
- `GET {BASE}/collections/{alias}/posts?page=n` until a page comes back empty (at most 49 pages).

It keeps `slug`, `title` (or "Untitled"), `created`, `tags` and the Markdown `body`. The result is cached in memory for the life of the page; new posts appear after a reload.

`BASE` is `VITE_WF_BASE` if set, otherwise `/wf`, a same-origin path that Vite (dev) or Caddy (production) forwards to WriteFreely's `/api`. These field names and the pagination shape have **not yet been confirmed against a live instance** (task T1c).

## Rendering and pagination

1. `renderBody` converts Markdown to HTML with `marked`, turning `<!-- pagebreak -->` into a marker element, then sanitizes with `DOMPurify`.
2. `BookReader` waits for the fonts, then calls `paginate(html, w, h)` for the current page size (ADR-002).
3. Pages are shown one at a time, with a CSS page turn (ADR-003).

Page size: width is the viewport minus margins, capped at 440 px; height is 1.42 × width. Controls: round previous/next buttons, left/right arrow keys, swipe. Progress is a ribbon plus "Page n of N" in an `aria-live` region. `Show plain text` swaps the book for a continuous, unpaginated view of the same sanitized HTML.

## Search

The archive builds a MiniSearch index in the browser over every essay's title, body and tags (prefix matching, fuzzy 0.2). WriteFreely has no post search of its own. This is fine for a personal archive; a dedicated search service is only worth it if the archive grows large.

## Routes

| Path | Page |
|---|---|
| `/` | Latest essay as a lead, then earlier essays (grouped by publication when there is more than one), with search |
| `/:alias/:slug` | One essay in the book reader |
| anything else | "Page not found" notice |

There are no About or Subscribe pages yet (T2). Production hosting must rewrite unknown paths to `index.html` (the Caddyfile and `render.yaml` both do).

## Source layout

```text
frontend/
  index.html            sets the theme before first paint
  public/favicon.svg
  src/
    main.tsx            fonts, styles, mount
    App.tsx             routes, archive (Lead, Row, search), essay page, notices
    config.ts           SITE name/author, ALIASES from VITE_WF_ALIASES
    components/         Masthead (with ThemeToggle), BookReader, Footer, Reveal
    lib/
      writefreely.ts    API client, Markdown -> sanitized HTML
      pack.ts           pure page-packing (unit tested)
      paginate.ts       DOM measuring and paragraph splitting
      excerpt.ts        plain-text excerpt from Markdown (unit tested)
      format.ts         reading time, long date
      theme.ts          theme hook (system setting, stored choice)
    styles.css          all design tokens and styles
  tests/                pack.test.ts, excerpt.test.ts
ops/
  config.example.ini    WriteFreely config template
  Caddyfile             self-hosted routing example
  render/               Dockerfile + entrypoint.sh for the Render service
render.yaml             Render blueprint (WriteFreely service + static reader)
tasks/                  plan and task list
docs/                   this documentation
```

## Configuration

| Setting | Where | Notes |
|---|---|---|
| `VITE_WF_ALIASES` | `frontend/.env`, Render `reader` service | Comma-separated collection aliases. Build-time |
| `VITE_WF_BASE` | same | Full WriteFreely API URL. Leave unset to use the `/wf` proxy. Build-time |
| `VITE_WF_DEV_TARGET` | `frontend/.env` | Where Vite's dev proxy sends `/wf` (default `http://localhost:8080`) |
| Site name and author | `frontend/src/config.ts` | Placeholder name `test`. Also appears in `frontend/index.html` (`<title>`) and, for the WriteFreely side, `SITE_NAME` / `AUTHOR_NAME` in `render.yaml` |
| WriteFreely settings | `ops/config.example.ini`, or env vars on Render | See `docs/setup-writefreely.md` |

Renaming the site means changing all of the places in the "Site name and author" row.

## Deployment shapes

**Self-hosted (target for production).** Caddy serves `frontend/dist` on the main domain and proxies `/wf/*` to WriteFreely's `/api/*` on a separate subdomain (WriteFreely expects to own its site root). The reader is same-origin, so no CORS is involved. Persist WriteFreely's `config.ini` and `keys/` directory; losing `keys/` logs everyone out.

**Render (trial).** Two services from `render.yaml`: a Docker web service for WriteFreely (rebuilds `config.ini` from env vars on each start) and a static site for the reader, which calls WriteFreely directly through `VITE_WF_BASE`. This depends on WriteFreely allowing cross-origin requests on its public API, which is not yet verified. The free web plan sleeps and has no disk (see `docs/setup-writefreely.md`, section C).

## Tests and checks

`cd frontend && npm test` runs the unit tests for `pack.ts` and `excerpt.ts` with Node's built-in runner (Node 22.6 or newer, for `--experimental-strip-types`). `npm run build` type-checks with `tsc` and then builds with Vite. The DOM pagination, the reader component and the API client have no automated tests.
