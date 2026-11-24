#!/bin/sh
# Builds config.ini from environment variables on every start, because Render's
# free plan has no persistent disk (local files are lost on spin-down and deploy).
set -e
cd /writefreely

# Fail fast with a clear message. Without this a missing DB_HOST silently becomes `host = `,
# WriteFreely retries "dial tcp :4000" and the deploy dies with an unhelpful log.
missing=""
for name in DB_HOST DB_USER DB_PASSWORD; do
  eval "value=\${$name:-}"
  [ -n "$value" ] || missing="$missing $name"
done
if [ -n "$missing" ]; then
  echo "ERROR: required environment variable(s) not set:$missing" >&2
  echo "Set them in the Render dashboard (service -> Environment). TiDB Cloud's port is 4000, so set DB_PORT too (the default below is 4000)." >&2
  exit 1
fi

# Deployment marker: the CD pipeline reads this to confirm which commit is really serving, because
# Render keeps the old version running when a new deploy fails. Render sets RENDER_GIT_COMMIT.
# It must be a .js file: WriteFreely answers unknown *.txt paths with HTTP 200 but 404s missing .js.
printf '/* build: %s */\n' "${RENDER_GIT_COMMIT:-dev}" > static/js/build-info.js

# TiDB Cloud uses a public CA (Let's Encrypt), already in the system trust store, so nothing is needed.
# DB_CA_CERT is only for a database signed by a private CA (the CI smoke test does this on purpose).
if [ -n "${DB_CA_CERT:-}" ]; then
  printf '%b\n' "${DB_CA_CERT}" > /usr/local/share/ca-certificates/db-ca.crt
  update-ca-certificates
fi

cat > config.ini <<CFG
[server]
hidden_host =
port        = ${PORT:-10000}
bind        = 0.0.0.0

[database]
type     = mysql
username = ${DB_USER}
password = ${DB_PASSWORD}
database = ${DB_NAME:-writefreely}
host     = ${DB_HOST}
port     = ${DB_PORT:-4000}
tls      = true

[app]
site_name         = ${SITE_NAME:-test}
site_description  = Writing by ${AUTHOR_NAME:-Rafael Caballero}
host              = ${PUBLIC_URL}
theme             = write
single_user       = false
open_registration = false
max_blogs         = 10
federation        = true
public_stats      = false
private           = false
CFG
# Session keys are regenerated on every start, so you will need to log in again after a restart.
./writefreely keys generate
./writefreely db init || echo "db init returned an error (expected if tables already exist; otherwise see the log above)"
./writefreely db migrate
./writefreely user create --admin "${ADMIN_USER}:${ADMIN_PASSWORD}" || echo "admin user already exists"
exec ./writefreely
