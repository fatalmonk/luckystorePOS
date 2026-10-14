#!/usr/bin/env python3
"""Fail closed on unsafe autonomous SEO diffs."""
import argparse
import subprocess
import sys

ALLOWED_PREFIXES = ("seo/", "apps/customer_storefront/")
BLOCKED_PARTS = (
    "/.env", "/node_modules/", "/.next/", "/secrets/", "/migrations/",
    "/supabase/", "/api/", "/checkout/", "/payment/", "/payments/",
)
BLOCKED_EXACT = {
    "seo/codex-daily-prompt.md", "seo/autopilot-v2.md",
    "seo/autopilot-input.json", "seo/state.md.bak",
    "apps/customer_storefront/package.json",
    "apps/customer_storefront/package-lock.json",
    "apps/customer_storefront/pnpm-lock.yaml",
    "apps/customer_storefront/yarn.lock",
}
MAX_FILES = 12


def check(paths):
    failures = []
    if len(paths) > MAX_FILES:
        failures.append(f"Too many changed paths: {len(paths)} > {MAX_FILES}")
    source = False
    for path in paths:
        normalized = "/" + path.replace("\\", "/")
        if not path.startswith(ALLOWED_PREFIXES):
            failures.append(f"Outside allowlist: {path}")
        if path in BLOCKED_EXACT or any(part in normalized for part in BLOCKED_PARTS):
            failures.append(f"Protected path: {path}")
        if path.startswith("apps/customer_storefront/"):
            source = True
    if paths and not source:
        failures.append("SEO metadata-only changes are not permitted")
    return failures


def changed_paths(base):
    proc = subprocess.run(
        ["git", "status", "--porcelain", "-z", "--untracked-files=all"],
        check=True, capture_output=True,
    )
    paths = []
    for entry in proc.stdout.decode("utf-8", "replace").split("\0"):
        if not entry:
            continue
        # git porcelain: XY<space>path; renamed entries are disallowed separately
        if entry[:2] in ("R ", " R", "C ", " C"):
            raise ValueError("Renames and copies are not allowed")
        paths.append(entry[3:])
    return paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="HEAD")
    args = parser.parse_args()
    try:
        paths = changed_paths(args.base)
        failures = check(paths)
    except (subprocess.CalledProcessError, ValueError) as exc:
        failures = [str(exc)]
    for failure in failures:
        print(f"::error::{failure}", file=sys.stderr)
    if failures:
        return 1
    print("Allowed changes validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
