# Literary publication

A personal publication for essays. [WriteFreely](https://writefreely.org/) is the CMS (database: MySQL on Aiven); a React + Vite site reads the published posts and presents each essay as a paged book, with archive, search, light and dark themes.

## Documentation
| | |
|---|---|
| `docs/architecture.md` | How the system works today: content model, pagination, routes, source layout, configuration, deployment |
| `docs/decisions/` | Architecture decision records (ADR-001 to ADR-005) |
| `docs/technology-decision.md` | Why this stack, what was left out, and what changed from the original plan |
| `docs/setup-writefreely.md` | Running WriteFreely: local trial, Aiven MySQL, Render, self-hosting |
| `docs/design-system.md` | Tokens, type, components |
| `tasks/` | Plan, risks and task list |

## Quick start (local)
Needs Node.js 22.6 or newer, and a running WriteFreely with at least one public blog (the simplest route is the SQLite trial in `docs/setup-writefreely.md`, section A).

```sh
cd frontend
cp .env.example .env      # set VITE_WF_ALIASES to your blog aliases, comma-separated
npm install
npm run dev
```

Vite proxies `/wf` to WriteFreely (`VITE_WF_DEV_TARGET`, default `http://localhost:8080`).

| Command (in `frontend/`) | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (`pack.ts`, `excerpt.ts`) |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |

## Writing essays
Write and publish in WriteFreely. One post is one essay; one public blog (collection) is one publication, so list each blog's alias in `VITE_WF_ALIASES`. Write in Markdown. Put `<!-- pagebreak -->` on its own line to force a new page; otherwise pages are filled automatically.

## Deployment
Self-hosted with Caddy (`ops/Caddyfile`) is the intended production setup. `render.yaml` deploys a trial to Render (free plans sleep and keep no files; see `docs/setup-writefreely.md`, section C). Status of open work, including the unverified live-API check, is in `tasks/todo.md`.
