#!/usr/bin/env bash
# Boots the WriteFreely image next to a throwaway MySQL that mimics Aiven, then checks the API
# contract the reader depends on. Catches what unit tests cannot: a broken Dockerfile or
# entrypoint, a CA/TLS regression (ADR-004's "x509: unknown authority"), a WriteFreely upgrade that
# changes the API, and a second start that fails (Render's free plan restarts the container often).
#
# MySQL is configured like Aiven: TLS signed by a PRIVATE CA, a user that REQUIRES SSL, the
# database created latin1 as docs/setup-writefreely.md says. The CA is passed to the image as
# AIVEN_CA_CERT exactly as on Render, and WriteFreely verifies the server name against it.
#
#   WF_IMAGE           default literary-writefreely:ci
#   MYSQL_IMAGE        default mysql:8.4
#   RENDER_GIT_COMMIT  commit the build marker must report (default: git HEAD)
set -euo pipefail

WF_IMAGE="${WF_IMAGE:-literary-writefreely:ci}"
MYSQL_IMAGE="${MYSQL_IMAGE:-mysql:8.4}"
COMMIT="${RENDER_GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo 0123456789abcdef0123456789abcdef01234567)}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SUFFIX="$$"
NET="wf-smoke-$SUFFIX"
DB="wf-smoke-mysql-$SUFFIX"   # also the DNS name in the server certificate
APP="wf-smoke-app-$SUFFIX"
PORT=18090
BASE="http://127.0.0.1:$PORT"
CERTS="$(mktemp -d)"

rand() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "${1:-24}"; }
ROOT_PW="$(rand)"; DB_PW="$(rand)"; ADMIN_PW="$(rand 28)"   # throwaway, per run, never reused

cleanup() {
  status=$?
  if [[ "$status" -ne 0 ]]; then
    echo "::group::container logs (smoke test failed)"
    for c in "$APP" "$DB"; do echo "--- $c ---"; docker logs --tail 80 "$c" 2>&1 || true; done
    echo "::endgroup::"
  fi
  docker rm -f "$APP" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$CERTS"
  exit "$status"
}
trap cleanup EXIT

# wait_until <description> <tries> <container to watch> <command...>   (2s between tries)
# Gives up at once if the watched container has exited, instead of waiting out the full timeout.
wait_until() {
  local what=$1 tries=$2 watch=$3; shift 3
  for i in $(seq 1 "$tries"); do
    if [[ "$(docker inspect -f '{{.State.Running}}' "$watch" 2>/dev/null)" != "true" ]]; then
      echo "✗ $what: container $watch is not running (see its logs below)" >&2
      return 1
    fi
    if "$@" >/dev/null 2>&1; then echo "✓ $what ready (try $i)"; return 0; fi
    sleep 2
  done
  echo "✗ timed out waiting for $what" >&2
  return 1
}

app_ready() { curl -fsS --max-time 3 "$BASE/"; }

# ── Private CA + server certificate whose SAN is the MySQL container's hostname ──────────────
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=smoke-ca" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -keyout "$CERTS/ca-key.pem" -out "$CERTS/ca.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=$DB" -keyout "$CERTS/server-key.pem" -out "$CERTS/server.csr" 2>/dev/null
printf 'subjectAltName=DNS:%s\nbasicConstraints=CA:FALSE\n' "$DB" > "$CERTS/ext.cnf"
openssl x509 -req -in "$CERTS/server.csr" -CA "$CERTS/ca.pem" -CAkey "$CERTS/ca-key.pem" -CAcreateserial \
  -days 1 -extfile "$CERTS/ext.cnf" -out "$CERTS/server-cert.pem" 2>/dev/null
# The mysql user inside the container (uid 999, not the runner user) must be able to read the files
# AND traverse the directory. mktemp -d creates it mode 700, which silently stops MySQL loading its
# certificates: that is what failed the first CI run.
chmod 755 "$CERTS"
chmod 644 "$CERTS"/*.pem

docker network create "$NET" >/dev/null

# ── Database ─────────────────────────────────────────────────────────────────────────────────
docker run -d --name "$DB" --network "$NET" -v "$CERTS:/certs:ro" -e MYSQL_ROOT_PASSWORD="$ROOT_PW" \
  "$MYSQL_IMAGE" --ssl-ca=/certs/ca.pem --ssl-cert=/certs/server-cert.pem --ssl-key=/certs/server-key.pem >/dev/null
# TCP on 127.0.0.1 only answers from the final server, not the image's temporary init server.
mysql_root() { docker exec -i -e MYSQL_PWD="$ROOT_PW" "$DB" mysql -h127.0.0.1 -uroot "$@"; }
wait_until "mysql" 60 "$DB" mysql_root -e 'SELECT 1'
mysql_root --batch >/dev/null <<SQL
CREATE DATABASE writefreely CHARACTER SET latin1 COLLATE latin1_swedish_ci;
CREATE USER 'wf'@'%' IDENTIFIED BY '$DB_PW' REQUIRE SSL;
GRANT ALL ON writefreely.* TO 'wf'@'%';
SQL

# ── WriteFreely, configured exactly as render.yaml configures it ─────────────────────────────
docker run -d --name "$APP" --network "$NET" -p "127.0.0.1:$PORT:10000" \
  -e DB_HOST="$DB" -e DB_PORT=3306 -e DB_USER=wf -e DB_PASSWORD="$DB_PW" -e DB_NAME=writefreely \
  -e AIVEN_CA_CERT="$(cat "$CERTS/ca.pem")" -e PUBLIC_URL="$BASE" \
  -e ADMIN_USER=ciadmin -e ADMIN_PASSWORD="$ADMIN_PW" \
  -e RENDER_GIT_COMMIT="$COMMIT" \
  "$WF_IMAGE" >/dev/null
wait_until "writefreely" 60 "$APP" app_ready

# ── Seed content through the API, like the author would ──────────────────────────────────────
json() { python3 -c 'import json,sys; print(json.load(sys.stdin)'"$1"')'; }
login_body=$(python3 -c 'import json,sys; print(json.dumps({"alias":"ciadmin","pass":sys.argv[1]}))' "$ADMIN_PW")
token=$(curl -fsS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "$login_body" | json "['data']['access_token']")
auth=(-H "Authorization: Token $token" -H 'Content-Type: application/json')
curl -fsS -o /dev/null "${auth[@]}" -X POST "$BASE/api/collections" -d '{"alias":"ci","title":"CI Publication"}'
curl -fsS -o /dev/null "${auth[@]}" -X POST "$BASE/api/collections/ci/posts" \
  -d '{"title":"Hello","body":"First page.\n\n<!-- pagebreak -->\n\nSecond page."}'
echo "✓ seeded a collection and an essay"

check() {
  WF_URL="$BASE" WF_ALIASES=ci ORIGIN=https://reader.example.test EXPECT_COMMIT="$COMMIT" \
    bash "$HERE/assert-writefreely.sh"
}
echo "--- first start"; check

# ── Second start: tables, admin and keys already exist (Render's normal steady state) ────────
docker restart "$APP" >/dev/null
sleep 2
wait_until "writefreely after restart" 60 "$APP" app_ready
echo "--- second start (content must have survived in the database)"; check

echo "Smoke test passed."
