#!/usr/bin/env python3
"""Offline invariants for render.yaml that the deploy pipeline depends on.

`render blueprints validate` needs a Render workspace/API key, so it cannot run in open CI.
This checks only what would silently break or endanger the pipeline:

  1. Every service has autoDeployTrigger: "off" (string, quoted: bare `off` is a YAML 1.1
     boolean). Otherwise a push deploys straight from git and skips staging and review.
  2. Secret-looking variables are never committed as `value:` (use `sync: false`).
  3. Static (reader) services stamp dist/version.json from RENDER_GIT_COMMIT, which is how the
     pipeline proves a deploy is live, and keep the SPA rewrite for deep links.
  4. Services have unique names, and no two WriteFreely services share a DB_NAME
     (staging must never write to the production database).

Run from the repository root:  python3 scripts/ci/check-blueprint.py [render.yaml]
"""
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
        cmd = s.get("buildCommand", "")
        if "dist/version.json" not in cmd or "RENDER_GIT_COMMIT" not in cmd:
            err(f"{name}: buildCommand must write dist/version.json from $RENDER_GIT_COMMIT")
        if not any(r.get("type") == "rewrite" and r.get("source") == "/*" for r in s.get("routes") or []):
            err(f"{name}: missing the /* -> /index.html rewrite (deep links would 404)")

if errors:
    sys.exit(1)
print(f"render.yaml OK ({len(services)} services)")
