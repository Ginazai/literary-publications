# ADR-007: Use TiDB Cloud instead of MySQL on Aiven

## Status
Accepted. Supersedes ADR-004.

## Date
2026-11-23

## Context
ADR-004 chose a managed MySQL on Aiven. Its free plan may be powered off after inactivity (taking the whole site down), and it needed a private CA certificate and a `sql_require_primary_key` workaround. TiDB Cloud Starter is MySQL-compatible, has a free tier, and uses a public CA.

## Decision
Use **TiDB Cloud Starter** as the production database. WriteFreely keeps `type = mysql` (the MySQL protocol and driver), with `tls = true`, port 4000, and a prefixed user name (`<prefix>.root`).

What this removes compared with ADR-004: the CA certificate variable (Let's Encrypt is already trusted), the primary-key setting, and the latin1 database. The database is created `utf8 / utf8_general_ci`, not utf8mb4: WriteFreely's migration V11 runs `MODIFY COLUMN ... utf8_bin`, which TiDB rejects on a utf8mb4 column (Error 8200, found by the smoke test). The upstream latin1 setup was not used because TiDB's rules for converting latin1 to utf8 were not verified.

## Alternatives Considered
- **Stay on Aiven**: works, but the idle power-off and the private-CA step remain. Rejected.
- **SQLite**: needs a persistent disk; Render's free tier has none. Rejected for production.

## Consequences
- **Unverified against a real instance:** WriteFreely officially supports MySQL and SQLite, not TiDB. CI's smoke test runs `db init`, `db migrate`, seeding and a restart on a standalone TiDB; treat a green run as the evidence, and still confirm once on the real service (todo T1c).
- Free tier (checked 2026-11-23): 5 GiB row storage, 50 million Request Units a month, up to 5 free instances per organization. At the quota, new connections are refused until the month resets. Its policy on pausing idle instances was not found in the docs checked; verify it.
- Idle public connections are dropped after about 340 seconds. database/sql normally retries a dead pooled connection, but a quiet site may show a slow first request.
- Keep Render and TiDB Cloud in the same region. Run `db migrate` after every WriteFreely upgrade, after a backup.
