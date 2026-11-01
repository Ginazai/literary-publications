# ADR-006: GitHub Actions deploys to Render by commit, verified by build markers

Status: accepted

## Context
Two Render services: a static site (the reader) and a Docker service wrapping a pinned WriteFreely
binary. Render deploys from git on push by default. That skips tests, and Render keeps serving the
old version when a deploy fails, so a "successful" trigger proves nothing. Aiven's free tier allows
one MySQL service, so there is a single environment and no staging.

## Decision
- CI gates every change. A smoke test boots the real image against an Aiven-like TLS MySQL and checks
  the API the reader uses, including a container restart (the normal state on Render's free plan).
- Render auto-deploy is off. After CI passes on the default branch, CD calls each service's deploy
  hook with `&ref=<commit>`. The review is the pull request that was merged.
- Deploys are verified by what is live: WriteFreely serves `/js/build-info.js` (written from
  `RENDER_GIT_COMMIT`), the reader serves `/version.json` (written by the build command). The job
  fails unless the new commit is serving, then runs read-only contract checks and a 5-minute soak.
  A service is redeployed only when its own files changed.
- Rollback is a manual workflow run naming an older commit already on the default branch.

## Why not container images (GHCR)
The reader is a static site and cannot be an image. The WriteFreely image is a thin wrapper over a
pinned upstream tarball, so building it on Render from the commit CI tested is equivalent in
practice. Images would add registry visibility or credentials, a bootstrap ordering problem, and
re-creating the existing service (a Render service cannot change runtime). Revisit if the image
gains real build steps.

## Why no staging or promotion PR
A second environment needs a second database, which the free Aiven tier does not allow. A promotion
PR without staging would only repeat the review already done on the merged PR. Safety instead comes
from CI, Render keeping the old version on a failed deploy, post-deploy verification and rollback.
An optional GitHub Environment reviewer can add a manual approval step.

## Consequences
- Production is the first place a change meets the real Aiven database and Render networking.
- Rollback rebuilds from an old commit instead of re-pulling an image.
- The build marker must be a `.js` file: WriteFreely answers unknown `*.txt` paths with HTTP 200.
