# Literary publication
WriteFreely (CMS, MySQL on Aiven) + React/Vite reader with StPageFlip.
Corrected design: docs/technology-decision.md

## Phase 1 – CMS
1. Aiven: create MySQL service, then `CREATE DATABASE writefreely CHARACTER SET latin1 COLLATE latin1_swedish_ci;` and a user.
2. Download WriteFreely release, copy ops/config.example.ini to config.ini, fill in, run `./writefreely db init`, then `./writefreely user create --admin you:password` (run `./writefreely --help` if your version differs), `./writefreely keys generate`, `./writefreely`.
3. Create one public collection per publication (e.g. `test`), publish essays. List their aliases in `VITE_WF_ALIASES` (comma-separated). Use `<!-- pagebreak -->` for forced page breaks.
## Phase 2-4 – Frontend
cd frontend && cp .env.example .env && npm install && npm run dev

Full instructions (local, Aiven, Render): docs/setup-writefreely.md
