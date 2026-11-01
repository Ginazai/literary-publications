# ADR-006: GitHub Actions deploys to Render by commit, verified by build markers

Status: accepted

## Context
Two Render services: a static site (the reader) and a Docker service wrapping a pinned WriteFreely
binary. Render deploys from git on push by default. That skips tests, staging and review, and
Render keeps serving the old version when a deploy fails, so a "successful" trigger proves nothing.

## Decision
- CI gates every change. A smoke test boots the real image against a Aiven-like TLS MySQL and checks
  the API the reader uses, including a container restart (the normal state on Render's free plan).
- Render auto-deploy is off. CD calls deploy hooks with `&ref=<commit>` for both services, first on
  staging, then on production only after a reviewed promotion PR edits `deploy/production.yml`.
  The approval is verified in code, so it holds on any GitHub plan.
- Deploys are verified by what is live: WriteFreely serves `/js/build-info.js` (written from
  `RENDER_GIT_COMMIT`), the reader serves `/version.json` (written by the build command). A service
  is redeployed only when its own files changed.

## Why not container images (GHCR)
The reader is a static site and cannot be an image. The WriteFreely image is a thin wrapper over a
pinned upstream tarball, so building it on Render from the commit CI tested is equivalent in
practice. Images would add registry visibility or credentials, a bootstrap ordering problem, and
re-creating the existing service (a Render service cannot change runtime). Revisit if the image
gains real build steps.

## Consequences
- Rollback rebuilds from an old commit instead of re-pulling an image.
- The build marker must be a `.js` file: WriteFreely answers unknown `*.txt` paths with HTTP 200.
- Staging costs two more free Render services and one more database in the same Aiven service.
