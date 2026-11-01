#!/usr/bin/env bash
# Read-only black-box checks of a running WriteFreely, from the reader's point of view.
# Used by smoke-test.sh (CI, throwaway stack) and render-deploy.sh (staging/production).
# It never writes and needs no credentials, so it is safe to point at production.
#
# It checks what frontend/src/lib/writefreely.ts depends on, verified against v0.17.2:
#   GET /api/collections/{alias}/posts?page=n  -> JSON {data:{posts:[{slug,title,created,tags,body}]}}
#   an empty `posts` array past the last page (the client's loop stops on it)
#   Access-Control-Allow-Origin on API responses (the Render reader calls WriteFreely cross-origin)
#
#   WF_URL         required  e.g. https://writefreely.onrender.com   (no trailing slash needed)
#   WF_ALIASES     optional  comma-separated collection aliases to check (VITE_WF_ALIASES)
#   ORIGIN         optional  reader origin; when set, the CORS header is checked
#   EXPECT_COMMIT  optional  the build marker (/js/build-info.js) must match this commit
set -euo pipefail

: "${WF_URL:?WF_URL is required}"
WF_URL=${WF_URL%/}
WF_ALIASES=${WF_ALIASES:-}
ORIGIN=${ORIGIN:-}
EXPECT_COMMIT=${EXPECT_COMMIT:-}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail() { echo "✗ $*" >&2; exit 1; }
pass() { echo "✓ $*"; }

# fetch <name> <path> [curl args...] -> sets STATUS; body in $TMP/<name>.body, headers in $TMP/<name>.head
fetch() {
  local name=$1 path=$2; shift 2
  STATUS=$(curl -sS --max-time 60 -o "$TMP/$name.body" -D "$TMP/$name.head" -w '%{http_code}' "$@" "$WF_URL$path") || STATUS=000
}

# json_check <file> <python-expression over `d`>: exit 0 when the expression is truthy
json_check() {
  python3 - "$1" "$2" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    sys.exit(0 if eval(sys.argv[2]) else 1)
except Exception:
    sys.exit(1)
PY
}

fetch root /
[[ "$STATUS" == 200 ]] || fail "GET / returned '$STATUS' (expected 200)"
pass "WriteFreely answers on /"

# WriteFreely answers unknown *.txt paths with HTTP 200, but a missing .js file is a real 404,
# which is why the build marker is a .js file.
fetch marker "/js/build-info.js?t=$(date +%s)"
[[ "$STATUS" == 200 ]] || fail "/js/build-info.js returned '$STATUS' (marker missing: entrypoint.sh writes it at start)"
live=$(sed -n 's/.*build: \([0-9a-f]\{7,40\}\).*/\1/p' "$TMP/marker.body" | head -1)
if [[ -n "$EXPECT_COMMIT" ]]; then
  [[ -n "$live" && "$EXPECT_COMMIT" == "$live"* ]] || fail "build marker is '${live:-none}', expected ${EXPECT_COMMIT:0:7}"
  pass "build marker is ${EXPECT_COMMIT:0:7}"
else
  [[ -n "$live" ]] || fail "build marker has an unexpected format"
  pass "build marker present (${live:0:7})"
fi

if [[ -z "$WF_ALIASES" ]]; then
  echo "::notice title=WriteFreely API::WF_ALIASES is empty, so the collection checks were skipped."
  echo "All WriteFreely checks passed."
  exit 0
fi

IFS=',' read -r -a aliases <<<"$WF_ALIASES"
for alias in "${aliases[@]}"; do
  alias=${alias//[[:space:]]/}
  [[ -n "$alias" ]] || continue

  # Without `Accept: application/json` WriteFreely answers this URL with a 302 to the HTML page.
  fetch meta "/api/collections/$alias" -H 'Accept: application/json'
  [[ "$STATUS" == 200 ]] || fail "[$alias] collection returned '$STATUS' (create a blog with this alias in WriteFreely)"
  json_check "$TMP/meta.body" "d['data']['alias'] == '$alias'" || fail "[$alias] collection JSON has an unexpected shape"
  pass "[$alias] collection exists"

  fetch posts "/api/collections/$alias/posts?page=1" ${ORIGIN:+-H "Origin: $ORIGIN"}
  [[ "$STATUS" == 200 ]] || fail "[$alias] posts page 1 returned '$STATUS'"
  grep -qi '^content-type:.*json' "$TMP/posts.head" || fail "[$alias] posts response is not JSON (the reader rejects non-JSON)"
  json_check "$TMP/posts.body" "isinstance(d['data']['posts'], list)" || fail "[$alias] data.posts is not a list"
  json_check "$TMP/posts.body" "all(isinstance(p.get('slug'), str) and p['slug'] and isinstance(p.get('created'), str) and isinstance(p.get('body'), str) and isinstance(p.get('tags', []), list) for p in d['data']['posts'])" \
    || fail "[$alias] a post is missing slug, created or body (fields the reader uses)"
  count=$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))['data']['posts']))" "$TMP/posts.body")
  pass "[$alias] posts API has the shape the reader expects ($count on page 1)"

  fetch past "/api/collections/$alias/posts?page=999"
  if [[ "$STATUS" != 200 ]] || ! json_check "$TMP/past.body" "d['data']['posts'] == []"; then
    fail "[$alias] a page past the end must return an empty posts array (got '$STATUS')"
  fi
  pass "[$alias] pagination ends with an empty page"

  if [[ -n "$ORIGIN" ]]; then
    acao=$(grep -i '^access-control-allow-origin:' "$TMP/posts.head" | head -1 | cut -d: -f2- | tr -d ' \r')
    [[ "$acao" == "*" || "$acao" == "$ORIGIN" ]] || fail "[$alias] CORS: Access-Control-Allow-Origin is '${acao:-missing}' for origin $ORIGIN"
    pass "[$alias] CORS allows $ORIGIN"
  fi
done

echo "All WriteFreely checks passed."
