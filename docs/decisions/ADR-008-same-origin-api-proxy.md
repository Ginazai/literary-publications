# ADR-008: Reach WriteFreely through a same-origin, read-only proxy

## Status
Accepted

## Date
2026-11-26

## Context
The reader (a static site) needs the site name from WriteFreely's `/api/nodeinfo`. That endpoint sends no CORS header (the posts API did), so on Render, where the reader and WriteFreely are separate sites, the browser blocked it. Options: ask WriteFreely for permissive CORS (cannot change core, and `*` widens trust), call it cross-origin, or proxy.

## Decision
The browser only talks to the reader's own origin. On Render, rewrite rules forward exactly `/wf/nodeinfo` and `/wf/collections/*` to WriteFreely's `/api/...` (read-only; every other `/wf/...` path falls through to the SPA). The site sets a CSP with `connect-src 'self'` (script hash for the inline theme script), `nosniff`, `no-referrer` and `X-Frame-Options: DENY`.

## Consequences
- No CORS dependency; WriteFreely's login and write API are unreachable through the reader. `check-blueprint.py` fails CI if a rule is wider, not https, or the CSP hash no longer matches `frontend/index.html`; `assert-reader.sh` checks the live proxy, that `/wf/auth/login` is not proxied, and the headers.
- The WriteFreely URL is written in `render.yaml` and must be edited per deployment (Render cannot inject it into a route).
- Unverified: Render passing the query string through external rewrites (checked after each deploy), and the CSP in real browsers (`style-src 'unsafe-inline'` is needed for React inline styles; `img-src https:` for images inside posts).
- Rewrites carry only `GET`/`HEAD` on a static site, so writes cannot be proxied even by mistake.
