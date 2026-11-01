# CI/CD

GitHub Actions tests every change, then deploys to Render and confirms the new version is really
serving. There is one environment (production). Decisions and trade-offs:
`docs/decisions/ADR-006-github-actions-cicd.md`.

```
PR ──► CI ──► you review + merge ──► CI ──► CD: deploy ──► verify new commit is live ──► 5 min soak
```

## What CI checks (`.github/workflows/ci.yml`)

| Job | Proves |
|---|---|
| Reader | `tsc`, the unit tests, a production build, then the built site is served and checked (SPA shell, deep-link fallback, bundle points at the configured WriteFreely) |
| Dependency vulnerabilities | `npm audit --omit=dev --audit-level=high` |
| Pipeline | actionlint, shellcheck, and `render.yaml` invariants (auto-deploy off, no committed secrets) |
| WriteFreely image | Builds `ops/render/Dockerfile`, boots it against a throwaway MySQL that mimics Aiven (private-CA TLS, `REQUIRE SSL` user, latin1 DB), seeds a blog, checks the API contract the reader depends on and CORS, then **restarts the container** and checks again. Also checks the entrypoint refuses to start without `DB_HOST` |
| CI gate | The single check to require in branch protection |

CI also runs weekly, so an advisory or a vanished upstream asset shows up as a red run, not a surprise.

## How deploys work

Render deploy hooks return 200 when a deploy is *queued*, and Render keeps the old version running
if the new one fails. So `scripts/ci/render-deploy.sh` never trusts the hook. Each app publishes
which commit it runs (`/js/build-info.js` on WriteFreely, `/version.json` on the reader) and the
job waits until that equals the commit it wants, then runs read-only contract checks and a
5-minute soak. A failed build or boot leaves the site on its previous version and turns the run red.

A service is redeployed only if its own files changed (`ops/render` / `frontend`). A frontend-only
change does not restart WriteFreely, which would log you out of the CMS and wake a sleeping instance.

Without staging, your safety nets are: CI (including the smoke test), Render keeping the old
version on a failed deploy, the post-deploy checks, and one-click rollback.

## One-time setup

1. **Render services.** `render.yaml` defines `writefreely` and `reader`, both with **auto-deploy off** (the pipeline deploys them). Sync the Blueprint and fill in **every** `sync: false` value: `DB_HOST`, `DB_PORT` (Aiven's is not 3306), `DB_USER`, `DB_PASSWORD`, `AIVEN_CA_CERT`, `ADMIN_USER`, `ADMIN_PASSWORD`, then `PUBLIC_URL` and `VITE_WF_BASE` (`<writefreely url>/api`) after the first deploy. WriteFreely now refuses to start, with a clear message, if the database settings are missing.
   - Log in to WriteFreely and create a blog whose alias matches `VITE_WF_ALIASES` (`test`). The post-deploy check requires it.
2. **Deploy hooks.** For each service: Render → Settings → *Deploy Hook*, copy the URL.
3. **GitHub Environment** `production` (Settings → Environments):
   - Secrets `RENDER_WRITEFREELY_DEPLOY_HOOK`, `RENDER_READER_DEPLOY_HOOK`.
   - Variables `WF_URL`, `READER_URL` (public URLs, no trailing slash), `WF_ALIASES` (`test`).
   - Optional: *Required reviewers* adds a manual approval before every deploy.
4. **Branch protection** on the default branch (if your plan allows it): require a pull request, and require the status check **CI gate**.
5. Optional keep-alive: see the header of `.github/workflows/keep-alive.yml`.

First run: nothing is live yet, so the first CD deploys both services.

## Day to day

- **Ship:** merge a PR to the default branch. CI runs, then CD deploys and verifies.
- **Roll back:** Actions → CD → *Run workflow* → `commit` = an older commit on the default branch. (WriteFreely rebuilds from that commit's Dockerfile.)
- **Retry a failed deploy:** re-run the failed workflow run.

## Troubleshooting

| Symptom | Cause |
|---|---|
| CD fails at "configured" | A secret or variable is missing on the `production` Environment |
| WriteFreely log: `ERROR: required environment variable(s) not set` | Fill those variables in Render → service → Environment |
| WriteFreely log: `dial tcp :3306: connection refused` (older entrypoint) | `DB_HOST` was empty |
| "did not start serving … within 15 min" | The Render deploy failed (the old version is still up). Read its log in Render |
| Hook returns 404 | Render does not know the commit: the service tracks another branch, or the hook URL belongs to another service |
| `[test] collection returned '404'` | Create a blog with that alias in WriteFreely |
| "bundle does not contain …/api" | `VITE_WF_BASE` was empty or wrong when the reader was built. Set it, then redeploy |
| `/version.json` never matches | The reader's `buildCommand` lost its `version.json` step (CI's blueprint check catches this) |

## Limits

- The build markers publish the deployed commit SHA to anyone who asks. Fine for a public repo; weigh it for a private one.
- Rollback rebuilds the WriteFreely image, so it depends on GitHub and the Debian mirrors being reachable. Render's dashboard *Rollback* is the instant alternative.
- Upgrading WriteFreely: bump `WF_VERSION` in the Dockerfile; CI smoke-tests the new version before it can reach production.
- Want a staging environment later? It needs its own database (Aiven's free tier allows one MySQL service); the pipeline was designed so it can be added back.
