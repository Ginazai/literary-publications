#!/bin/sh
# Builds config.ini from environment variables on every start, because Render's
# free plan has no persistent disk (local files are lost on spin-down and deploy).
set -e
cd /writefreely

# Aiven signs its MySQL servers with a private CA that is not in the system trust store.
# Without this, WriteFreely fails with "x509: certificate signed by unknown authority".
if [ -n "${AIVEN_CA_CERT}" ]; then
  printf '%b\n' "${AIVEN_CA_CERT}" > /usr/local/share/ca-certificates/aiven-ca.crt
  update-ca-certificates
else
  echo "WARNING: AIVEN_CA_CERT is not set; TLS to the database will fail with an x509 error."
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
port     = ${DB_PORT:-3306}
tls      = true

[app]
site_name         = ${SITE_NAME:-test}
site_description  = Essays by ${AUTHOR_NAME:-Rafael Caballero}
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
