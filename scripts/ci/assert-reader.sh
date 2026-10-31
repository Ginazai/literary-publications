#!/usr/bin/env bash
# Read-only checks of a served reader (the built SPA). Used by the CI frontend job (against
# `vite preview`) and by render-deploy.sh (against the Render static site).
#
#   READER_URL     required  e.g. https://reader.onrender.com
#   WF_URL         optional  when set, the JS bundle must embed "<WF_URL>/api" (VITE_WF_BASE).
#                            Catches a reader built without VITE_WF_BASE, which silently calls
#                            the non-existent /wf proxy on Render.
#   EXPECT_COMMIT  optional  /version.json must report this commit
set -euo pipefail

: "${READER_URL:?READER_URL is required}"
READER_URL=${READER_URL%/}
WF_URL=${WF_URL:-}
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

if [[ -n "$WF_URL" ]]; then
  bundle=$(grep -o 'src="/assets/[^"]*\.js"' "$TMP/index" | head -1 | sed 's/^src="//; s/"$//')
  [[ -n "$bundle" ]] || fail "could not find the JS bundle in index.html"
  get js "$bundle"
  [[ "$STATUS" == 200 ]] || fail "bundle $bundle returned '$STATUS'"
  grep -qF "${WF_URL%/}/api" "$TMP/js" || fail "the bundle does not contain ${WF_URL%/}/api: VITE_WF_BASE was missing or wrong at build time"
  pass "bundle is built against ${WF_URL%/}/api"
fi

get version "/version.json?t=$(date +%s)"
live=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['commit'])" "$TMP/version" 2>/dev/null || true)
if [[ -n "$EXPECT_COMMIT" ]]; then
  [[ -n "$live" && "$EXPECT_COMMIT" == "$live"* ]] || fail "/version.json reports '${live:-none}', expected ${EXPECT_COMMIT:0:7}"
  pass "version.json is ${EXPECT_COMMIT:0:7}"
fi
echo "All reader checks passed."
