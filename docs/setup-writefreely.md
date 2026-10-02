# WriteFreely setup

Commands assume a recent release (0.15.x). If a command is rejected, run `./writefreely --help`; the CLI changed between versions.

## A. Local trial (10 minutes, SQLite, no MySQL)
1. Download `writefreely_<version>_<os>_<arch>.tar.gz` from https://github.com/writefreely/writefreely/releases and extract it.
2. `cd writefreely && ./writefreely config start` (interactive) or copy `ops/config.example.ini` to `config.ini`. For SQLite set `type = sqlite3`, `filename = writefreely.db`, `host = http://localhost:8080`, `single_user = false`, `open_registration = false`.
3. `./writefreely keys generate`
4. `./writefreely db init`
5. `./writefreely user create --admin you:a-long-password`
6. `./writefreely`, then open http://localhost:8080, log in, and create a blog with the alias `test`. Publish a post.
7. Check http://localhost:8080/api/collections/test/posts returns JSON.
8. In `frontend`: `npm install && npm run dev` (Vite proxies `/wf` to port 8080).

## B. Database on Aiven (MySQL)
1. Create a MySQL service (free plan is fine to start; it can power off when idle).
2. From the service page copy host, port, user (`avnadmin`) and password.
3. Connect and create the database WriteFreely expects:
   `mysql --host HOST --port PORT --user avnadmin --password --ssl-mode=REQUIRED`
   `CREATE DATABASE writefreely CHARACTER SET latin1 COLLATE latin1_swedish_ci;`
4. In `config.ini` use `type = mysql`, the credentials, `database = writefreely`, and `tls = true`.
5. Run `db init` once, `db migrate` after every WriteFreely upgrade. Back up before upgrading.

## C. Deploy on Render
**Know the free-plan limits:** a free web service sleeps after 15 minutes idle (first request takes roughly 30-60 s), has no persistent disk (local files are lost on restart), and gives no shell access. The setup here works around the disk problem by rebuilding `config.ini` from environment variables on each start and keeping all content in Aiven. Consequences: you log in again after each restart, and the first reader to arrive after idle waits. For a real launch use a paid web service.

1. Push this repo to GitHub.
2. Render dashboard -> New -> Blueprint -> pick the repo. It reads `render.yaml` and creates two services: `writefreely` (Docker) and `reader` (static site).
3. Fill the prompted variables for `writefreely`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` (from Aiven), `ADMIN_USER`, `ADMIN_PASSWORD`, and a placeholder `PUBLIC_URL`.
4. After the first deploy, copy the service URL (https://writefreely-xxxx.onrender.com), set `PUBLIC_URL` to it, and redeploy.
5. Open that URL, log in with the admin credentials, create a blog with the alias `test`.
6. For `reader`, set `VITE_WF_BASE` to `https://writefreely-xxxx.onrender.com/api` and redeploy. (The browser calls WriteFreely directly; WriteFreely's public API allows cross-origin requests. Verify in the browser console if the archive stays empty.)
7. Open the reader URL. Check the archive lists your post.

Manual route (no blueprint): New -> Web Service -> Docker, root directory `ops/render`, same env vars; New -> Static Site, root `frontend`, build `npm ci && npm run build`, publish `dist`, add a rewrite `/*` -> `/index.html`.

**Keep Aiven and Render in the same region** to limit latency. Use a custom domain later via Render's settings.

## D. Production hardening (when you leave the free plans)
- Paid Render web service with a disk mounted for `keys/` and `config.ini` (removes restarts-logout and sleep).
- Aiven paid tier (no idle power-off) and confirm backups.
- Pin `WF_VERSION` in the Dockerfile; upgrade deliberately (backup, rebuild, `db migrate`).
- Long random admin password; keep `open_registration = false`.
