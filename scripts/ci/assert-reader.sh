#!/usr/bin/env bash
# Read-only checks of a served reader (the built SPA). Used by the CI frontend job (against
# `vite preview`) and by render-deploy.sh (against the Render static site).
#
#   READER_URL     required  e.g. https://reader.onrender.com
#   CHECK_PROXY    optional  "yes" on the deployed site: checks the same-origin /wf proxy (read-only
#                            allowlist) and the security headers. WF_ALIASES picks a blog to read.
#   EXPECT_COMMIT  optional  /version.json must report this commit
set -euo pipefail

: "${READER_URL:?READER_URL is required}"
READER_URL=${READER_URL%/}
EXPECT_COMMIT=${EXPECT_COMMIT:-}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail() { echo "✗ $*" >&2; exit 1; }
pass() { echo "✓ $*"; }

get() {  # get <name> <path> -> STATUS, body in $TMP/<name>
  STATUS=$(curl -sS --max-time 60 -o "$TMP/$1" -w '%{http_code}' "$READER_URL$2") || STATUS=000
}

get index /
[[ "$STATUS" == 200 ]] || fail "GET / returned '$STATUS'"
grep -q 'id="root"' "$TMP/index" || fail "GET / did not serve the SPA shell (no id=\"root\")"
pass "serves the SPA shell"

# Deep links (/:alias/:slug) must fall back to index.html: the rewrite rule in render.yaml.
get deep /__ci-check__/not-a-page
if [[ "$STATUS" != 200 ]] || ! grep -q 'id="root"' "$TMP/deep"; then
  fail "deep link returned '$STATUS' without the SPA shell (missing /* -> /index.html rewrite?)"
fi
pass "deep links fall back to the SPA shell"

if [[ "${CHECK_PROXY:-}" == yes ]]; then   # deployed site only; `vite preview` has no proxy or headers
  is_json() { python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$TMP/$1" 2>/dev/null; }
  get nodeinfo /wf/nodeinfo
  if [[ "$STATUS" != 200 ]] || ! python3 -c "import json,sys; assert json.load(open(sys.argv[1]))['metadata']['nodeName']" "$TMP/nodeinfo" 2>/dev/null; then
    fail "/wf/nodeinfo (same-origin proxy) did not return the site info: check the WriteFreely host in render.yaml routes"
  fi
  pass "same-origin proxy serves the site info"
  alias1=${WF_ALIASES%%,*}; alias1=${alias1//[[:space:]]/}
  if [[ -n "$alias1" ]]; then
    get posts "/wf/collections/$alias1/posts?page=1"
    if [[ "$STATUS" != 200 ]] || ! python3 -c "import json,sys; assert isinstance(json.load(open(sys.argv[1]))['data']['posts'], list)" "$TMP/posts" 2>/dev/null; then
      fail "/wf/collections/$alias1/posts?page=1 did not return posts through the proxy (is the query string passed on?)"
    fi
    pass "same-origin proxy serves posts, with the query string"
  fi
  # Least privilege: anything outside the allowlist must NOT reach WriteFreely (it falls through to the SPA).
  get login /wf/auth/login
  ! is_json login || fail "/wf/auth/login returned JSON: the proxy exposes more of WriteFreely than the read-only allowlist"
  pass "write/login endpoints are not proxied"
  hdrs=$(curl -sS --max-time 60 -D - -o /dev/null "$READER_URL/")
  for h in content-security-policy x-content-type-options x-frame-options referrer-policy; do
    grep -qi "^$h:" <<<"$hdrs" || fail "response header $h is missing"
  done
  grep -i '^content-security-policy:' <<<"$hdrs" | grep -q "connect-src 'self'" || fail "CSP lacks connect-src 'self'"
  pass "security headers present"
fi

get version "/version.json?t=$(date +%s)"
live=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['commit'])" "$TMP/version" 2>/dev/null || true)
if [[ -n "$EXPECT_COMMIT" ]]; then
  [[ -n "$live" && "$EXPECT_COMMIT" == "$live"* ]] || fail "/version.json reports '${live:-none}', expected ${EXPECT_COMMIT:0:7}"
  pass "version.json is ${EXPECT_COMMIT:0:7}"
fi
echo "All reader checks passed."
