#!/usr/bin/env bash
# Reconcile the Render environment to a wanted commit.
#
# Render deploy hooks answer 200 as soon as a deploy is *queued*, and Render keeps serving the old
# version if the new one fails to build or boot. So "the hook returned 200" proves nothing. This
# script instead compares what is LIVE (build markers served by the apps themselves) with the
# commit we want, and only reports success once the new commit is really serving:
#
#   WriteFreely  GET /js/build-info.js   written by ops/render/entrypoint.sh from RENDER_GIT_COMMIT
#   reader       GET /version.json       written by the render.yaml buildCommand
#
# A service is only redeployed when its own files changed between the live commit and the wanted
# one (ops/render for WriteFreely, frontend for the reader). A frontend-only change therefore
# does not restart WriteFreely, which would log the author out of the CMS (keys are regenerated
# on every start) and wake a sleeping free instance.
#
# Required env: ENVIRONMENT COMMIT(40-hex) WF_URL READER_URL WF_HOOK READER_HOOK
# Optional env: WF_ALIASES SOAK_MINUTES DEPLOY_TIMEOUT_MIN POLL_SECONDS
# Run from the repository root with full history (actions/checkout fetch-depth: 0).
set -euo pipefail

: "${ENVIRONMENT:?}" "${COMMIT:?}" "${WF_URL:?}" "${READER_URL:?}" "${WF_HOOK:?}" "${READER_HOOK:?}"
WF_URL=${WF_URL%/}
READER_URL=${READER_URL%/}
WF_ALIASES=${WF_ALIASES:-}
SOAK_MINUTES=${SOAK_MINUTES:-0}
DEPLOY_TIMEOUT_MIN=${DEPLOY_TIMEOUT_MIN:-15}
POLL_SECONDS=${POLL_SECONDS:-10}
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo "::error::COMMIT must be a full 40-character SHA (got '$COMMIT')"; exit 1; }
summary() { echo "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }

live_wf() {
  curl -fsS --max-time 60 "$WF_URL/js/build-info.js?t=$(date +%s)" 2>/dev/null \
    | sed -n 's/.*build: \([0-9a-f]\{7,40\}\).*/\1/p' | head -1 || true
}
live_reader() {
  curl -fsS --max-time 30 "$READER_URL/version.json?t=$(date +%s)" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["commit"])' 2>/dev/null || true
}

# needs_deploy <live commit> <path>: succeed when that path differs between live and wanted.
needs_deploy() {
  local live=$1 path=$2
  [[ -n "$live" ]] || return 0                                  # nothing live / unreadable: deploy
  git cat-file -e "${live}^{commit}" 2>/dev/null || return 0    # unknown to this repo: deploy
  ! git diff --quiet "$live" "$COMMIT" -- "$path"
}

trigger() {  # trigger <label> <hook url>
  local body status
  body=$(mktemp)
  # The hook URL is a secret and already contains ?key=..., hence &ref=. Never print it.
  status=$(curl -sS --max-time 60 -o "$body" -w '%{http_code}' -X POST "$2&ref=$COMMIT") \
    || { echo "::error::$1: could not reach Render"; rm -f "$body"; return 1; }
  if [[ "$status" =~ ^2 ]]; then
    echo "✓ $1 deploy triggered for ${COMMIT:0:7} [HTTP $status]"
    rm -f "$body"
  else
    echo "::error::$1 deploy hook returned HTTP $status (404 means Render does not know commit ${COMMIT:0:7}; is it on the service's linked branch?)"
    head -c 500 "$body"; echo; rm -f "$body"
    return 1
  fi
}

wait_for() {  # wait_for <label> <getter function>
  local label=$1 getter=$2 deadline got
  deadline=$(( $(date +%s) + DEPLOY_TIMEOUT_MIN * 60 ))
  while (( $(date +%s) < deadline )); do
    got=$("$getter")
    if [[ -n "$got" && "$COMMIT" == "$got"* ]]; then
      echo "✓ $label is serving ${COMMIT:0:7}"
      return 0
    fi
    echo "… $label is serving '${got:0:7}', waiting for ${COMMIT:0:7}"
    sleep "$POLL_SECONDS"
  done
  echo "::error title=Deploy not live::$label did not start serving ${COMMIT:0:7} within ${DEPLOY_TIMEOUT_MIN} min. Open its deploy log in the Render dashboard; Render keeps the previous version running when a deploy fails."
  return 1
}

echo "Reconciling $ENVIRONMENT to ${COMMIT:0:7}"
wf_before=$(live_wf)
reader_before=$(live_reader)
echo "Live now: WriteFreely='${wf_before:0:7}' reader='${reader_before:0:7}'"

deploy_wf=no; deploy_reader=no
needs_deploy "$wf_before" ops/render && deploy_wf=yes
needs_deploy "$reader_before" frontend && deploy_reader=yes

if [[ $deploy_wf == yes ]]; then trigger WriteFreely "$WF_HOOK"; else echo "= WriteFreely: ops/render unchanged since ${wf_before:0:7}, not redeploying"; fi
if [[ $deploy_reader == yes ]]; then trigger reader "$READER_HOOK"; else echo "= reader: frontend unchanged since ${reader_before:0:7}, not redeploying"; fi

# Both builds run in parallel on Render; wait for each to actually serve the new commit.
[[ $deploy_wf == yes ]] && wait_for WriteFreely live_wf
[[ $deploy_reader == yes ]] && wait_for reader live_reader

echo "--- Post-deploy checks"
WF_URL=$WF_URL WF_ALIASES=$WF_ALIASES ORIGIN=$READER_URL \
  EXPECT_COMMIT=$([[ $deploy_wf == yes ]] && echo "$COMMIT" || true) bash "$HERE/assert-writefreely.sh"
READER_URL=$READER_URL WF_URL=$WF_URL \
  EXPECT_COMMIT=$([[ $deploy_reader == yes ]] && echo "$COMMIT" || true) bash "$HERE/assert-reader.sh"

soak_result="skipped"
if (( SOAK_MINUTES > 0 )); then
  # Mirrors "monitor, roll back on regression". Not a rollback itself: failing the job notifies you.
  alias1=${WF_ALIASES%%,*}; alias1=${alias1//[[:space:]]/}
  probe_wf="$WF_URL/"; [[ -n "$alias1" ]] && probe_wf="$WF_URL/api/collections/$alias1/posts?page=999"   # empty page, still hits the database
  end=$(( $(date +%s) + SOAK_MINUTES * 60 )); probes=0; failures=0; consecutive=0
  while (( $(date +%s) < end )); do
    probes=$((probes + 1)); ok=yes
    for u in "$probe_wf" "$READER_URL/"; do
      code=$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$u" 2>/dev/null || true)
      [[ "$code" =~ ^2 ]] || { ok=no; echo "::warning title=Soak::${u%%\?*} -> ${code:-000}"; }
    done
    if [[ $ok == yes ]]; then consecutive=0; else failures=$((failures + 1)); consecutive=$((consecutive + 1)); fi
    if (( consecutive >= 3 )); then
      echo "::error title=Soak failed::3 consecutive failed probes after the deploy. Roll back: Actions -> CD -> Run workflow -> an older commit."
      summary "#### Soak: ❌ failed after $probes probes ($failures failures)"
      exit 1
    fi
    sleep 15
  done
  soak_result="✅ ${SOAK_MINUTES} min, $probes probes, $failures failures"
fi

summary "| WriteFreely | $([[ $deploy_wf == yes ]] && echo "deployed" || echo "unchanged, left running") |"
summary "| Reader | $([[ $deploy_reader == yes ]] && echo "deployed" || echo "unchanged, left running") |"
summary "| Soak | $soak_result |"
echo "Done: $ENVIRONMENT is serving ${COMMIT:0:7}."
