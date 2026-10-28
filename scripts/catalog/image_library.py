"""Pure helpers for the metadata-only product image library manifest."""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import PurePosixPath
from typing import Any, Iterable

IMAGE_SUFFIXES = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def exact_duplicate_groups(entries: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Group only exact SHA-256 duplicates. Missing hashes stay unresolved."""
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        digest = entry.get("sha256")
        if isinstance(digest, str) and _SHA256.fullmatch(digest.lower()):
            groups[digest.lower()].append(entry)
    return {digest: sorted(rows, key=lambda row: str(row.get("source_path", ""))) for digest, rows in sorted(groups.items())}


def canonical_filename(item_sku: str | None, role: str, sha256: str, suffix: str) -> str:
    """Return a collision-resistant proposed filename; it does not authorize a match."""
    digest = sha256.lower()
    if not _SHA256.fullmatch(digest):
        raise ValueError("A full SHA-256 digest is required")
    safe_sku = re.sub(r"[^A-Za-z0-9._-]+", "_", (item_sku or "unmatched").strip()).strip("._-") or "unmatched"
    safe_role = re.sub(r"[^A-Za-z0-9._-]+", "_", role.strip()).strip("._-") or "source"
    extension = suffix.lower() if suffix.lower() in IMAGE_SUFFIXES else ".bin"
    return f"{safe_sku}-{safe_role}-{digest[:12]}{extension}"


def tracked_product_image_paths(paths: Iterable[str]) -> list[str]:
    """Find product-image locations while leaving application UI artwork alone."""
    findings = []
    for raw_path in paths:
        path = PurePosixPath(raw_path.replace("\\", "/"))
        parts = tuple(part.lower() for part in path.parts)
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        if (
            parts[:1] == ("catalog-images",)
            or parts[:2] == ("social-media", "catalogue-images")
            or parts[:3] == ("data", "catalog", "images")
            or parts[:1] == ("products",)
            or any(parts[i:i + 2] == ("public", "products") for i in range(max(0, len(parts) - 1)))
        ):
            findings.append(raw_path)
    return sorted(findings)
