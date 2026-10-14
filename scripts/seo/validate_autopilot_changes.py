#!/usr/bin/env python3
"""Fail closed on unsafe autonomous SEO diffs."""
import argparse
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys

ALLOWED_PREFIXES = ("seo/", "apps/customer_storefront/app/")
BLOCKED_PARTS = (
    "/.env", "/node_modules/", "/.next/", "/secrets/", "/migrations/",
    "/supabase/", "/api/", "/checkout/", "/payment/", "/payments/",
    "/cart/", "/order/", "/profile/", "/login/", "/signup/", "/wishlist/",
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


def check_patch(path):
    data = Path(path).read_bytes()
    if len(data) > 131072 or b'GIT binary patch' in data or b'\0' in data:
        return ["Binary or oversized proposal patch forbidden"]
    records = subprocess.check_output(["git", "apply", "--numstat", "-z", str(path)]).decode().split('\0')
    paths = []
    for record in records:
        if not record:
            continue
        fields = record.split('\t', 2)
        if len(fields) != 3 or not fields[0].isdigit() or not fields[1].isdigit() or not fields[2]:
            return ["Malformed or binary patch metadata"]
        paths.append(fields[2])
    if not paths:
        return ["Empty proposal patch"]
    return check(paths)


def check(paths):
    failures = []
    if len(paths) > MAX_FILES:
        failures.append(f"Too many changed paths: {len(paths)} > {MAX_FILES}")
    source = False
    for path in paths:
        if PurePosixPath(path).is_absolute() or any(p in ("..", ".") for p in path.split("/")) or "\\" in path:
            failures.append(f"Invalid path: {path}")
        normalized = "/" + path.replace("\\", "/")
        if not path.startswith(ALLOWED_PREFIXES):
            failures.append(f"Outside allowlist: {path}")
        if path in BLOCKED_EXACT or any(part in normalized for part in BLOCKED_PARTS):
            failures.append(f"Protected path: {path}")
        if path.startswith("seo/") and not path.endswith(".md"):
            failures.append(f"Only Markdown SEO state/reports may change: {path}")
        if path.startswith("apps/customer_storefront/"):
            source = True
            if not (path.startswith(("apps/customer_storefront/app/(english)/", "apps/customer_storefront/app/(bengali)/bn/")) and path.endswith("/page.tsx")):
                failures.append(f"Only customer-facing route pages may change: {path}")
            if any(p.startswith(".") for p in PurePosixPath(path).parts) or any(p in ("components", "lib") for p in PurePosixPath(path).parts):
                failures.append(f"Protected implementation path: {path}")
    if paths and not source:
        failures.append("SEO metadata-only changes are not permitted")
    return failures


def changed_paths(base):
    def git(*args):
        return subprocess.check_output(["git", *args])

    start = git("rev-parse", "--verify", f"{base}^{{commit}}").strip()
    if git("rev-parse", "HEAD").strip() != start:
        raise ValueError("HEAD changed during generation; agent-created commits are forbidden")
    paths = set()
    # Check the index as well as the final worktree: staging a forbidden change
    # and then restoring only its worktree copy must not hide it.
    for options in ((), ("--cached",)):
        entries = git("diff", *options, "--raw", "-z", "--no-renames", base, "--").decode().split("\0")
        for i in range(0, len(entries) - 1, 2):
            header, path = entries[i], entries[i + 1]
            old, new, _, _, status_code = header[1:].split()
            if status_code not in ("A", "M") or old not in ("000000", "100644") or new != "100644":
                raise ValueError(f"Deletion, rename, symlink or file-mode change forbidden: {path}")
            paths.add(path)
    paths.update(p for p in git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0") if p)
    for path in paths:
        file = Path(path)
        if file.is_symlink() or not file.is_file() or file.resolve() != Path.cwd().resolve() / path:
            raise ValueError(f"Only regular files inside the checkout are permitted: {path}")
        if file.stat().st_mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH) or file.stat().st_size > 65536:
            raise ValueError(f"Executable or oversized file forbidden: {path}")
    return sorted(paths)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="HEAD")
    parser.add_argument("--patch", help="Inspect artifact paths before applying the patch")
    args = parser.parse_args()
    try:
        failures = check_patch(args.patch) if args.patch else check(changed_paths(args.base))
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
