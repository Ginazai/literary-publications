# WriteFreely setup

Commands assume WriteFreely v0.17.2, the version pinned in `ops/render/Dockerfile` (the newest release on the WriteFreely blog when checked on 2026-10-30). If a command is rejected, run `./writefreely --help`; the CLI can change between versions.

For how the pieces fit together see `docs/architecture.md`.

## A. Local trial (10 minutes, SQLite, no MySQL)
1. Download `writefreely_<version>_<os>_<arch>.tar.gz` from https://github.com/writefreely/writefreely/releases and extract it.
2. `cd writefreely && ./writefreely config start` (interactive) or copy `ops/config.example.ini` to `config.ini`. For SQLite set `type = sqlite3`, `filename = writefreely.db`, `host = http://localhost:8080`, `single_user = false`, `open_registration = false`.
3. `./writefreely keys generate`
4. `./writefreely db init`
5. `./writefreely user create --admin you:a-long-password`
6. `./writefreely`, then open http://localhost:8080, log in, and create a blog with the alias `test`. Publish a post.
7. Check http://localhost:8080/api/collections/test/posts returns JSON.
8. In `frontend`: `npm install && npm run dev` (Vite proxies `/wf` to port 8080).

## B. Database on TiDB Cloud (MySQL-compatible)
1. Create a **TiDB Cloud Starter** instance (https://tidbcloud.com). The free tier gives 5 GiB of row storage and 50 million Request Units a month per instance; at the quota, new connections are refused until the month resets. Check the current terms before relying on it.
2. Click **Connect** on the instance, choose a general/Go connection, and copy host (`gateway01.<region>.prod.aws.tidbcloud.com`), port (`4000`), user and password. The user carries a prefix, like `3Fm4b2.root`; use the full name. Allow connections from anywhere (or from Render's outbound IPs) in the networking settings.
3. Create the database WriteFreely expects, in the console's SQL editor or with `mysql --host HOST --port 4000 --user 'PREFIX.root' --password --ssl-mode=VERIFY_IDENTITY`:
   `CREATE DATABASE writefreely CHARACTER SET utf8 COLLATE utf8_general_ci;`
   (Use `utf8`, not `utf8mb4`. WriteFreely's migration V11 runs `MODIFY COLUMN access_token ... utf8_bin`, and TiDB refuses to narrow a utf8mb4 column to utf8 (`Error 8200`), which fails `db migrate`. WriteFreely sets utf8mb4 explicitly on its content columns, so post text is unaffected. Found by CI's smoke test against TiDB v8.5.1.)
4. In `config.ini` use `type = mysql` (TiDB speaks the MySQL protocol), the credentials, `database = writefreely`, and `tls = true`.
5. **No CA certificate is needed.** TiDB Cloud certificates come from Let's Encrypt, which the system trust store already has, and Go uses it. (`DB_CA_CERT` exists only for a database signed by a private CA.) TLS 1.2 or newer is required.
6. Run `db init` once, `db migrate` after every WriteFreely upgrade. Back up before upgrading.

**Not yet verified live (task T1c):** that WriteFreely v0.17.2's `db init` / `db migrate` run cleanly on TiDB. CI's smoke test runs them against a standalone TiDB, which is the evidence to trust first; confirm once against your real instance. Also note TiDB Cloud drops idle public connections after about 340 seconds; if the site errors on the first request after a quiet spell, that is the first thing to check.

## C. Deploy on Render
**Know the free-plan limits:** a free web service sleeps after 15 minutes without traffic (waking takes about a minute), has no persistent disk (local files are lost on restart), and gives no shell access. The setup here works around the disk problem by rebuilding `config.ini` from environment variables on each start and keeping all content in TiDB Cloud. Consequences: you log in again after each restart, and the first reader to arrive after idle waits. For a real launch use a paid web service.

1. Push this repo to GitHub.
2. Render dashboard -> New -> Blueprint -> pick the repo. It reads `render.yaml` and creates two services: `writefreely` (Docker) and `reader` (static site). `render.yaml` sets `plan: free` for WriteFreely; change it for production.
3. Fill the prompted variables for `writefreely`: `DB_HOST`, `DB_PORT` (`4000`), `DB_USER` (with the TiDB prefix), `DB_PASSWORD`, `ADMIN_USER`, `ADMIN_PASSWORD`, and a placeholder `PUBLIC_URL`. Already set in `render.yaml`, change them there if needed: `DB_NAME` (`writefreely`), `SITE_NAME` and `AUTHOR_NAME` (currently the placeholders `test` and `Rafael Caballero`; `entrypoint.sh` writes them into WriteFreely's `config.ini` as the site name and description, and the reader shows both, read from WriteFreely's `/api/nodeinfo`, so change them here only).
4. After the first deploy, copy the service URL (https://writefreely-xxxx.onrender.com), set `PUBLIC_URL` to it, and redeploy.
5. Open that URL, log in with the admin credentials, create one blog per publication. Each blog's alias must match an entry in the reader's `VITE_WF_ALIASES` (default `test`).
6. For `reader`, set `VITE_WF_BASE` to `https://writefreely-xxxx.onrender.com/api` and redeploy. The browser then calls WriteFreely directly, which only works if WriteFreely's public API allows cross-origin requests. **This has not been verified** (task T1c); if the archive stays empty or shows an error, check the browser console for a CORS message. Also set `VITE_WF_ALIASES` if you use aliases other than `test`. Both variables are read at build time, so redeploy the reader after changing them.
7. Open the reader URL. Check the archive lists your post. If WriteFreely is asleep the first load is slow; wait about a minute.

Manual route (no blueprint): New -> Web Service -> Docker, root directory `ops/render`, same env vars; New -> Static Site, root `frontend`, build `npm ci && npm run build`, publish `dist`, add a rewrite `/*` -> `/index.html`.

**Keep TiDB Cloud and Render in the same region** to limit latency. Use a custom domain later via Render's settings.

## D. Production hardening (when you leave the free plans)
- Paid Render web service with a disk mounted for `keys/` and `config.ini` (removes restarts-logout and sleep). The current `entrypoint.sh` regenerates `config.ini` and keys on every start, so it needs changing to keep them on the disk.
- TiDB Cloud: set a spending limit above the free quota (or move to Essential) so a busy month does not refuse connections, and confirm backups.
- `WF_VERSION` is already pinned in the Dockerfile (`ARG WF_VERSION=0.17.2`); upgrade deliberately: back up, change the version, rebuild, `db migrate` (the entrypoint runs it on start).
- Long random admin password; keep `open_registration = false`.

## E. Self-hosting with Caddy
`ops/Caddyfile` is a template. Replace `example.com` and `write.example.com`, build the reader (`cd frontend && npm ci && npm run build`) and point Caddy's `root` at `frontend/dist`. Leave `VITE_WF_BASE` unset: the reader then uses the same-origin `/wf` path, which Caddy forwards to WriteFreely's `/api`. Persist and back up WriteFreely's `config.ini` and `keys/`.
