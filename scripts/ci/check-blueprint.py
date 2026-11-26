#!/usr/bin/env python3
"""Offline invariants for render.yaml that the deploy pipeline depends on.

`render blueprints validate` needs a Render workspace/API key, so it cannot run in open CI.
This checks only what would silently break or endanger the pipeline:

  1. Every service has autoDeployTrigger: "off" (string, quoted: bare `off` is a YAML 1.1
     boolean). Otherwise a push deploys straight from git and skips CI.
  2. Secret-looking variables are never committed as `value:` (use `sync: false`).
  3. Static (reader) services stamp dist/version.json from RENDER_GIT_COMMIT, which is how the
     pipeline proves a deploy is live, and keep the SPA rewrite for deep links.
  5. The reader proxies ONLY the two read-only WriteFreely paths it needs, over https, and
     ships a CSP (connect-src 'self', script hash matching frontend/index.html). It must not set
     VITE_WF_BASE (that would make the browser go cross-origin, which the CSP blocks).
  4. Services have unique names, and no two WriteFreely services share a DB_NAME
     (a second environment must never write to another one's database).

Run from the repository root:  python3 scripts/ci/check-blueprint.py [render.yaml]
"""
import base64
import hashlib
import re
import sys

import yaml

SECRET = re.compile(r"PASSWORD|SECRET|TOKEN|PRIVATE|CERT|(^|_)KEY($|_)", re.I)
errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)
    print(f"::error file=render.yaml::{msg}")


path = sys.argv[1] if len(sys.argv) > 1 else "render.yaml"
with open(path, encoding="utf-8") as fh:
    doc = yaml.safe_load(fh)

services = doc.get("services") or []
if not services:
    err("no services defined")

names = [s.get("name") for s in services]
for n in {n for n in names if names.count(n) > 1}:
    err(f"duplicate service name '{n}'")

db_names: dict[str, str] = {}
for s in services:
    name = s.get("name", "?")
    runtime = s.get("runtime")

    if runtime != "image" and s.get("autoDeployTrigger") != "off":
        err(f"{name}: autoDeployTrigger must be the quoted string \"off\" "
            f"(got {s.get('autoDeployTrigger')!r}); the pipeline deploys via hooks")

    for var in s.get("envVars") or []:
        key = var.get("key", "")
        if SECRET.search(key) and "value" in var:
            err(f"{name}: {key} looks like a secret but is committed as a value; use `sync: false`")
        if key == "DB_NAME" and "value" in var:
            if var["value"] in db_names:
                err(f"{name}: DB_NAME '{var['value']}' is also used by {db_names[var['value']]}; "
                    "each environment needs its own database")
            db_names[var["value"]] = name

    if runtime == "static":
        allowed = {"/wf/nodeinfo": "/api/nodeinfo", "/wf/collections/*": "/api/collections/*"}
        for r in s.get("routes") or []:
            dest = str(r.get("destination", ""))
            if dest.startswith(("http://", "https://")):
                m = re.match(r"https://[^/]+(/.*)$", dest)
                if not m:
                    err(f"{name}: external rewrite {dest!r} must be https with a path")
                elif allowed.get(r.get("source")) != m.group(1):
                    err(f"{name}: external rewrite {r.get('source')} -> {dest} is not on the allowlist "
                        f"{allowed}; proxying more of WriteFreely exposes its login/admin API")
        if any(v.get("key") == "VITE_WF_BASE" for v in s.get("envVars") or []):
            err(f"{name}: do not set VITE_WF_BASE on Render; the reader must use the same-origin /wf proxy")
        hdrs = {h.get("name"): h.get("value", "") for h in s.get("headers") or []}
        csp = hdrs.get("Content-Security-Policy", "")
        if "connect-src 'self'" not in csp or "object-src 'none'" not in csp:
            err(f"{name}: missing Content-Security-Policy with connect-src 'self' and object-src 'none'")
        for h in ("X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options"):
            if h not in hdrs:
                err(f"{name}: missing {h} header")
        inline = re.search(r"<script>(.*?)</script>", open("frontend/index.html", encoding="utf-8").read(), re.S)
        if inline:
            want = "'sha256-" + base64.b64encode(hashlib.sha256(inline.group(1).encode()).digest()).decode() + "'"
            if want not in csp:
                err(f"{name}: CSP lacks {want}: the inline theme script in frontend/index.html changed "
                    "(update the hash in render.yaml)")

        cmd = s.get("buildCommand", "")
        if "dist/version.json" not in cmd or "RENDER_GIT_COMMIT" not in cmd:
            err(f"{name}: buildCommand must write dist/version.json from $RENDER_GIT_COMMIT")
        if not any(r.get("type") == "rewrite" and r.get("source") == "/*" for r in s.get("routes") or []):
            err(f"{name}: missing the /* -> /index.html rewrite (deep links would 404)")

if errors:
    sys.exit(1)
print(f"render.yaml OK ({len(services)} services)")
