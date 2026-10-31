# ADR-004: Use MySQL 8 on Aiven as the production database

## Status
Accepted

## Date
2026-10-30 (recorded retroactively)

## Context
WriteFreely supports SQLite and MySQL. The project wants a production database that is separate from the application host (some target hosts, such as Render's free tier, lose local files on restart), and the author already knows MySQL.

## Decision
Use a managed **MySQL 8 service on Aiven** for production, connected to WriteFreely with TLS. SQLite is acceptable for a quick local trial only (`docs/setup-writefreely.md`, section A).

Known setup requirements, all covered in `docs/setup-writefreely.md`:
- Create the database as `latin1 / latin1_swedish_ci` (WriteFreely's documented MySQL setup; its schema sets utf8mb4 per column).
- Install Aiven's CA certificate, because Aiven uses a private CA.
- Set `sql_require_primary_key` to false on the Aiven service, or `db init` fails with error 3750.

## Alternatives Considered

### SQLite
- Pros: zero setup, one file.
- Cons: needs a persistent disk on the app host, which free hosts do not give.
- Rejected for production.

### PostgreSQL
- Rejected: WriteFreely supports MySQL and SQLite, not PostgreSQL, and a second database technology would add nothing.

### MySQL on the same host as WriteFreely
- Cons: the project would have to install, patch and back it up.
- Rejected in favour of a managed service.

## Consequences
- Aiven's free plan (1 CPU, 1 GB RAM, 1 GB disk, single node) may be powered off after inactivity, with a notification beforehand, and Aiven may change its terms. The Developer tier is not auto-powered-off. When the database is off, WriteFreely and therefore the whole reader are unavailable. Use a paid tier for a real launch.
- Keep the application host in the same region as the database.
- Run `db migrate` after every WriteFreely upgrade, and take a backup first. Database backups are independent of Git; Git holds code only.
- Re-check Aiven's current free-tier terms at deployment time.
