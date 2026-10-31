# CI/CD

GitHub Actions tests every change, then deploys to Render through a staging environment and a
reviewed production promotion. Decisions and trade-offs: `docs/decisions/ADR-006-github-actions-cicd.md`.

```
PR ──► CI ──► merge to default branch ──► CI ──► CD: deploy STAGING ──► verify ──► open/update
                                                                                   promotion PR
                                       you review + approve + merge the PR ──► deploy PRODUCTION
                                       (the approval is verified in code) ──► verify ──► 5 min soak
```

## What CI checks (`.github/workflows/ci.yml`)

| Job | Proves |
|---|---|
| Reader | `tsc`, the unit tests, a production build, then the built site is served and checked (SPA shell, deep-link fallback, bundle points at the configured WriteFreely) |
| Dependency vulnerabilities | `npm audit --omit=dev --audit-level=high` |
| Pipeline | actionlint, shellcheck, and `render.yaml` invariants (auto-deploy off, no committed secrets, staging DB differs from production) |
| WriteFreely image | Builds `ops/render/Dockerfile`, boots it against a throwaway MySQL that mimics Aiven (private-CA TLS, `REQUIRE SSL` user, latin1 DB), seeds a blog, checks the API contract the reader depends on and CORS, then **restarts the container** and checks again |
| CI gate | The single check to require in branch protection |

CI also runs weekly, so an advisory or a vanished upstream asset shows up as a red run, not a surprise.

## How deploys work

Render deploy hooks return 200 when a deploy is *queued*, and Render keeps the old version running
if the new one fails. So `scripts/ci/render-deploy.sh` never trusts the hook. Each app publishes
which commit it runs (`/js/build-info.js` on WriteFreely, `/version.json` on the reader) and the
job waits until that equals the commit it wants, then runs read-only contract checks.

A service is redeployed only if its own files changed (`ops/render` / `frontend`). A frontend-only
change does not restart WriteFreely, which would log you out of the CMS and wake a sleeping instance.

## One-time setup

1. **GitHub → Settings → Actions → General → Workflow permissions:** enable *Allow GitHub Actions to create and approve pull requests*.
2. **Render services.** `render.yaml` now defines four: `writefreely`, `reader` (production) and `writefreely-staging`, `reader-staging`. Sync the Blueprint (new services prompt for their `sync: false` values). Each service must have **auto-deploy off**; the Blueprint sets it.
   - If `writefreely`/`reader` already exist from this Blueprint, syncing adds the staging pair and turns their auto-deploy off.
   - **Staging needs its own database.** In Aiven, create database `writefreely_staging` (latin1, as in `docs/setup-writefreely.md` B) and grant the same user access. Never point staging at the production database.
   - Set `PUBLIC_URL` (WriteFreely) and `VITE_WF_BASE` (`<writefreely url>/api`, reader) per environment after the first deploy.
   - In each WriteFreely, log in and create a blog whose alias matches `VITE_WF_ALIASES` (`test`). The post-deploy check requires it.
3. **Deploy hooks.** For each of the four services: Render → Settings → *Deploy Hook*, copy the URL.
4. **GitHub Environments** (Settings → Environments) `staging` and `production`:
   - Secrets `RENDER_WRITEFREELY_DEPLOY_HOOK`, `RENDER_READER_DEPLOY_HOOK` (that environment's hook URLs).
   - Variables `WF_URL`, `READER_URL` (public URLs, no trailing slash), `WF_ALIASES` (`test`).
   - Optional on `production`: restrict *Deployment branches* to the default branch.
5. **Branch protection** on the default branch (if your plan allows it): require a pull request with 1 approval, and require the status check **CI gate**.
6. Optional keep-alive: see the header of `.github/workflows/keep-alive.yml`.

First run: the first CD finds nothing live, so it deploys both services in both environments.

## Day to day

- **Ship:** merge to the default branch. CI, then staging deploys automatically, then a PR titled *Promote production to abc1234* appears (it states which services will redeploy). Approve and merge it to deploy production. You cannot approve a PR you authored; the bot authors it, so a solo maintainer can approve.
- **Roll back:** Actions → CD → *Run workflow* → `commit` = an older commit. This opens a rollback PR; approve and merge. (WriteFreely rebuilds from that commit's Dockerfile.)
- **Retry a failed deploy:** re-run the failed workflow run.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Staging/production job fails at "configured" | A secret or variable is missing on that GitHub Environment |
| "did not start serving … within 15 min" | The Render deploy failed (the old version is still up). Read its log in Render |
| Hook returns 404 | Render does not know the commit: the service tracks another branch, or the hook URL belongs to another service |
| `[test] collection returned '404'` | Create a blog with that alias in that environment's WriteFreely |
| "bundle does not contain …/api" | `VITE_WF_BASE` was empty or wrong when the reader was built. Set it, then redeploy |
| `/version.json` never matches | The reader's `buildCommand` lost its `version.json` step (CI's blueprint check catches this) |
| Promotion PR never appears | Setup step 1, or the staging job failed |
| "blocked: merged without an approving review" | The PR was merged without a human approval on its final commit. Open a new promotion |

## Limits

- The build markers publish the deployed commit SHA to anyone who asks. Fine for a public repo; weigh it for a private one.
- Rollback rebuilds the WriteFreely image, so it depends on GitHub and the Debian mirrors being reachable. Render's dashboard *Rollback* is the instant alternative.
- Upgrading WriteFreely: bump `WF_VERSION` in the Dockerfile; CI smoke-tests the new version before it can reach staging.
