#!/usr/bin/env python3
"""Compare inventory sheet snapshots with a Supabase catalog snapshot.

The deterministic audit is offline and read-only. Optional TypeSafe candidate
reviews are explicitly opt-in and remain suggestions for a human reviewer.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit, urlunsplit


SOURCE_SCOPES = (
    ("data/inventory", "inventory_source", "Supabase public.items and stock_levels are authoritative; local files are staged snapshots", "unresolved", "Local files are candidate inputs, not a live catalog. Row values are not copied into this metadata manifest."),
    ("data/catalog/images", "central_image_library", "Cloudflare R2 owns runtime image bytes; this is ignored local preservation/staging", "unresolved", "Keep bytes ignored and verify exact item mappings before any publication or deletion."),
    ("catalog-images", "image_candidate", "Cloudflare R2 owns runtime image bytes; local files are unverified candidates", "unresolved", "Local files are not verified as packshots or mapped to live items."),
    ("templates", "import_template", "Import format adapter; not a catalog authority", "adapter", "Preserve existing visible headers until callers are migrated."),
    ("scripts/catalog", "catalog_tooling", "Repository-owned read-only catalog tooling", "canonical", "Offline tooling does not own live product or stock facts."),
    ("scripts/images", "image_tooling", "Cloudflare R2 and public.items image metadata own published images", "legacy", "Review each script's callers and write behavior before retirement."),
    ("scripts/ops", "inventory_tooling", "Supabase public.items and stock_levels own live catalog and stock", "legacy", "Operational helpers have independent inputs and write paths; inspect before reuse."),
    ("apps/admin_web/src/features/import", "admin_importer", "Supabase public.items; stock_levels are store-scoped", "legacy", "Admin import currently has a separate product write path."),
    ("supabase/functions/import-inventory", "edge_importer", "Supabase public.items and stock_levels", "legacy", "Review preview side effects and attachment storage before using as a dry-run gate."),
    ("supabase/functions/issue-image-upload-ticket", "image_upload_authorization", "Authenticated session and scoped Cloudflare Worker ticket", "canonical", "Ticket issuance is the authorized entry to new user-facing image uploads."),
    ("supabase/functions/publish-product-image", "image_publication", "Supabase public.items image metadata via compare-and-swap", "canonical", "Publication must retain the current server-side CAS check."),
    ("cloudflare/workers/images", "image_bytes_runtime", "Cloudflare R2 bucket binding", "canonical", "Runtime image bytes are served through the image Worker."),
)
CALLER_SCAN_ROOTS = (
    "apps/admin_web/src",
    "apps/customer_storefront/src",
    "apps/mobile_app/lib",
    "apps/scraper",
    "scripts",
    "supabase/functions",
    "cloudflare/workers/images",
)
CALLER_SUFFIXES = {".cjs", ".dart", ".js", ".jsx", ".mjs", ".py", ".sql", ".ts", ".tsx"}
CALLER_SKIP_PARTS = {".git", "node_modules", "__pycache__", ".next", "dist", "build"}
IMAGE_CONSUMER_PATTERNS = re.compile(
    r"image_url|image_key|image_checksum|image_version|item-images|product-images|"
    r"publish-product-image|issue-image-upload-ticket|import-inventory",
    re.IGNORECASE,
)
SOURCE_CALLER_TOKENS = {
    "data/inventory": ("data/inventory",),
    "catalog-images": ("catalog-images",),
    "templates": ("lucky-store-import-template", "templates/"),
    "apps/admin_web/src/features/import": ("ImportProductsPage", "features/import/"),
    "supabase/functions/import-inventory": ("import-inventory",),
    "supabase/functions/issue-image-upload-ticket": ("issue-image-upload-ticket",),
    "supabase/functions/publish-product-image": ("publish-product-image",),
    "cloudflare/workers/images": ("R2Bucket", "IMAGE_BUCKET", "image-worker"),
}


FIELD_ALIASES = {
    "item name": "name",
    "item code": "sku",
    "sales price": "price",
    "category id": "category_id",
    "updated at": "updated_at",
    "created at": "created_at",
    "is active": "is_active",
    "opening stock": "opening_stock",
    "low stock": "low_stock",
}
REQUIRED_FIELDS = {
    "master": {"name", "category", "brand", "price", "sku"},
    "copy": {"id", "sku", "name", "brand", "price"},
    "supabase": {"id", "sku", "name", "brand", "category", "price"},
}
COMPARE_FIELDS = ("sku", "name", "brand", "category", "price", "is_active")


def _key(value: Any) -> str:
    text = re.sub(r"[_-]+", " ", str(value or "").strip().casefold())
    return re.sub(r"\s+", " ", text)


def _canonical_field(value: Any) -> str:
    key = _key(value)
    return FIELD_ALIASES.get(key, key.replace(" ", "_"))


def _empty(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _records(snapshot: Any, source: str) -> list[dict[str, Any]]:
    """Normalize a connector range (values) or row-array snapshot."""
    if isinstance(snapshot, dict) and isinstance(snapshot.get("values"), list):
        grid = snapshot["values"]
        if not grid or not isinstance(grid[0], list):
            raise ValueError(f"{source} sheet snapshot must have a header row in 'values'")
        headers = [_canonical_field(value) for value in grid[0]]
        duplicate_headers = sorted({key for key, count in Counter(headers).items() if count > 1 and key})
        if duplicate_headers:
            raise ValueError(f"{source} snapshot has duplicate columns: {', '.join(duplicate_headers)}")
        missing_headers = REQUIRED_FIELDS[source] - set(headers)
        if missing_headers:
            raise ValueError(f"{source} snapshot is missing required columns: {', '.join(sorted(missing_headers))}")
        rows = []
        for row_number, row in enumerate(grid[1:], start=2):
            if not isinstance(row, list):
                raise ValueError(f"{source} row {row_number} must be an array")
            if len(row) > len(headers):
                raise ValueError(f"{source} row {row_number} has more cells than the header row")
            rows.append({headers[i]: value for i, value in enumerate(row)})
    else:
        rows_value = snapshot.get("rows") if isinstance(snapshot, dict) else snapshot
        if not isinstance(rows_value, list):
            raise ValueError(f"{source} snapshot must be a row array or contain a 'values'/'rows' array")
        rows = []
        for row_number, row in enumerate(rows_value, start=2):
            if not isinstance(row, dict):
                raise ValueError(f"{source} snapshot rows must be JSON objects")
            canonical_keys = [_canonical_field(key) for key in row.keys()]
            duplicate_keys = sorted({key for key, count in Counter(canonical_keys).items() if count > 1 and key})
            if duplicate_keys:
                raise ValueError(f"{source} snapshot row {row_number} has duplicate columns: {', '.join(duplicate_keys)}")
            canonical_row = dict(zip(canonical_keys, row.values()))
            missing_fields = REQUIRED_FIELDS[source] - set(canonical_row.keys())
            if missing_fields:
                raise ValueError(f"{source} snapshot row {row_number} is missing required columns: {', '.join(sorted(missing_fields))}")
            rows.append(canonical_row)

    records = []
    for row_number, row in enumerate(rows, start=2):
        normalized = {key: value for key, value in row.items() if not _empty(value)}
        if not normalized:
            continue
        normalized["_source_row"] = row_number
        records.append(normalized)
    return records


def load_snapshot(path: str | Path) -> Any:
    """Read JSON without making network calls or mutating the source file."""
    snapshot_path = Path(path)
    try:
        return json.loads(snapshot_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"{snapshot_path}: invalid JSON at line {error.lineno}, column {error.colno}") from None
    except OSError as error:
        raise ValueError(f"{snapshot_path}: unable to read snapshot ({error.strerror or 'I/O error'})") from None


def _normal(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).casefold().split())


def reconcile_source_reference(reference: dict[str, Any], catalog_rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Resolve a source reference by exact item ID, SKU, or barcode only.

    A tenant scope narrows SKU/barcode matches. Names and other descriptive
    fields are deliberately ignored so this helper cannot create fuzzy joins.
    """
    identity_fields = (("item_id", "id"), ("sku", "sku"), ("barcode", "barcode"))
    result = {"match_status": "unresolved", "match_method": None, "item_id": None}
    for reference_field, catalog_field in identity_fields:
        value = reference.get(reference_field)
        if value is None or value == "":
            continue
        matches = [row for row in catalog_rows if row.get(catalog_field) == value]
        if reference_field != "item_id" and reference.get("tenant_id") is not None:
            matches = [row for row in matches if row.get("tenant_id") == reference["tenant_id"]]
        if len(matches) > 1:
            result.update(match_status="ambiguous", match_method=reference_field)
            return result
        if len(matches) == 1:
            result.update(match_status="matched", match_method=reference_field, item_id=matches[0].get("id"))
            return result
    return result


def classify_image_reference(
    reference: Any,
    root: str | Path | None = None,
    known_object_keys: set[str] | None = None,
) -> dict[str, Any]:
    """Classify a local path or URL without network access or filesystem writes."""
    result: dict[str, Any] = {
        "reference": None,
        "reference_kind": "missing",
        "object_key": None,
        "parser_rule": None,
        "exists": False,
        "size_bytes": None,
        "sha256": None,
        "status": "unresolved",
    }
    if not isinstance(reference, str) or not reference.strip():
        return result

    reference = reference.strip()
    result["reference"] = reference
    try:
        parsed = urlsplit(reference)
        port = parsed.port
    except ValueError as parse_error:
        result["reference"] = None
        result["reference_kind"] = "malformed_url"
        result["status"] = "malformed_url"
        result["parser_rule"] = f"parse_error:{type(parse_error).__name__}"
        return result

    if parsed.scheme.lower() in {"http", "https"} and parsed.hostname:
        safe_netloc = parsed.hostname
        if port:
            safe_netloc = f"{safe_netloc}:{port}"
        safe_url = urlunsplit((parsed.scheme.lower(), safe_netloc, parsed.path, "", ""))
        result["reference"] = safe_url
        path_parts = [unquote(part) for part in parsed.path.split("/") if part]
        key_start = next((i for i, part in enumerate(path_parts) if part in {"item-images", "product-images", "products"}), None)
        brand_start = next((i for i, part in enumerate(path_parts) if part.casefold() in {"brand", "brands"}), None)
        if brand_start is not None and len(path_parts) > brand_start + 1 and (key_start is None or brand_start < key_start):
            key_start = brand_start
        if key_start is not None:
            key = "/".join(path_parts[key_start:])
            rule = {
                "item-images": "item-images-prefix",
                "product-images": "product-images-prefix",
                "products": "products-prefix",
            }.get(path_parts[key_start], "brand-prefix")
            exists = key in known_object_keys if known_object_keys is not None else None
            result.update(
                reference_kind="legacy_remote",
                object_key=key,
                parser_rule=rule,
                exists=exists,
                status="legacy" if exists is not False else "unresolved",
            )
        else:
            result.update(reference_kind="external_url")
        return result

    key_parts = [unquote(part) for part in reference.strip("/").split("/") if part]
    if key_parts and key_parts[0] in {"item-images", "product-images", "products"}:
        key = "/".join(key_parts)
        exists = key in known_object_keys if known_object_keys is not None else None
        result.update(
            reference_kind="legacy_object_key",
            object_key=key,
            parser_rule=f"{key_parts[0]}-prefix",
            exists=exists,
            status="legacy" if exists is not False else "unresolved",
        )
        return result
    if len(key_parts) > 1 and key_parts[0].casefold() in {"brand", "brands"}:
        key = "/".join(key_parts)
        exists = key in known_object_keys if known_object_keys is not None else None
        result.update(
            reference_kind="legacy_object_key",
            object_key=key,
            parser_rule="brand-prefix",
            exists=exists,
            status="legacy" if exists is not False else "unresolved",
        )
        return result

    result["reference_kind"] = "local_file"
    path = Path(reference)
    base = Path(root).resolve() if root is not None else Path.cwd().resolve()
    candidate = path.resolve() if path.is_absolute() else (base / path).resolve()
    try:
        candidate.relative_to(base)
    except ValueError:
        result["reference"] = "<external_path>"
        return result
    result["reference"] = candidate.relative_to(base).as_posix()
    if not candidate.is_file():
        return result
    digest = hashlib.sha256()
    size = 0
    with candidate.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
            size += len(chunk)
    result.update(exists=True, size_bytes=size, sha256=digest.hexdigest())
    return result


def _walk_files(root: Path, relative_root: str) -> list[Path]:
    directory = root / relative_root
    if not directory.is_dir():
        return []
    files: list[Path] = []
    for current, directories, filenames in os.walk(directory, followlinks=False):
        directories[:] = sorted(name for name in directories if name not in CALLER_SKIP_PARTS and not name.startswith("."))
        for filename in sorted(filenames):
            path = Path(current) / filename
            if filename == ".DS_Store" or path.suffix.lower() in {".pyc", ".pyo"} or path.is_symlink():
                continue
            if path.is_file():
                files.append(path)
    return files


def _read_code_callers(root: Path) -> dict[str, str]:
    callers: dict[str, str] = {}
    for relative_root in CALLER_SCAN_ROOTS:
        for path in _walk_files(root, relative_root):
            if path.suffix.lower() not in CALLER_SUFFIXES:
                continue
            relative = path.relative_to(root).as_posix()
            lowered = relative.lower()
            if "/test" in lowered or ".test." in lowered or lowered.endswith("_test.py"):
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            callers[relative] = content
    return callers


def _source_scope(relative_path: str) -> tuple[str, str, str, str, str] | None:
    for scope in SOURCE_SCOPES:
        if relative_path == scope[0] or relative_path.startswith(scope[0] + "/"):
            return scope
    if relative_path.startswith("supabase/migrations/"):
        name = Path(relative_path).name.lower()
        if re.search(r"item|inventory|stock|image|sku|barcode|tenant_scoped", name):
            return (
                "supabase/migrations",
                "catalog_schema_migration",
                "Supabase public.items and stock_levels; migration defines the operational schema",
                "canonical" if "decommission_legacy" not in name else "legacy",
                "Selected by catalog, stock, identifier, or image migration filename; verify migration semantics before relying on it.",
            )
    return None


def _inventory_image_references(path: Path, relative_path: str, project_root: Path) -> list[dict[str, Any]]:
    """Extract identifiers and image references only; never copy row values."""
    rows: list[dict[str, Any]] = []
    try:
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
                rows = list(csv.DictReader(handle))
        elif path.suffix.lower() == ".json":
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict):
                value = value.get("rows", value.get("items", value.get("products")))
            if isinstance(value, list):
                rows = [row for row in value if isinstance(row, dict)]
    except (OSError, ValueError, csv.Error):
        return []

    aliases = {
        "id": "item_id", "item id": "item_id", "item_id": "item_id",
        "sku": "sku", "barcode": "barcode", "tenant id": "tenant_id", "tenant_id": "tenant_id",
        "image url": "image_url", "image_url": "image_url", "image key": "object_key", "image_key": "object_key",
        "object key": "object_key", "object_key": "object_key", "r2 key": "object_key", "r2_key": "object_key",
    }
    normalized: list[dict[str, Any]] = []
    all_rows: list[dict[str, Any]] = []
    for source_row, row in enumerate(rows, start=2):
        current: dict[str, Any] = {}
        for key, value in row.items():
            canonical = aliases.get(_key(key).replace("_", " "), aliases.get(str(key).strip().casefold()))
            if canonical and value is not None:
                current[canonical] = value
        reference = current.get("object_key") or current.get("image_url")
        current["_source_row"] = source_row
        all_rows.append(current)
        if isinstance(reference, str) and reference.strip():
            normalized.append({**current, "_reference": reference.strip()})

    duplicates: Counter[tuple[str, str, str]] = Counter()
    for row in all_rows:
        tenant = row.get("tenant_id")
        for key in ("sku", "barcode"):
            value = row.get(key)
            if isinstance(value, str) and value:
                duplicates[(str(tenant or ""), key, value)] += 1

    result = []
    file_size = path.stat().st_size
    file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    for row in normalized:
        reference_info = classify_image_reference(row["_reference"], root=project_root)
        tenant = row.get("tenant_id")
        is_duplicate = any(
            duplicates[(str(tenant or ""), key, str(row.get(key)))] > 1
            for key in ("sku", "barcode")
            if row.get(key) not in (None, "")
        )
        notes = "Local source-row reference; no approved canonical catalog snapshot was supplied, so item matching remains unresolved."
        if is_duplicate:
            notes += " Duplicate exact SKU/barcode exists in this source scope; human resolution is required."
        result.append({
            "source_path": relative_path,
            "source_row": row["_source_row"],
            "source_kind": "inventory_image_reference",
            "owner_authority": "Local import snapshot only; Supabase public.items owns live product fields and image pointers",
            "format": path.suffix.lower().lstrip("."),
            "item_key": None,
            "item_key_kind": None,
            "object_key_or_url": None,
            "reference_kind": reference_info["reference_kind"],
            "parser_rule": reference_info["parser_rule"],
            "size_bytes": file_size,
            "sha256": file_hash,
            "current_callers": [],
            "match_status": "ambiguous" if is_duplicate else "unresolved",
            "status": reference_info["status"],
            "migration_notes": notes,
        })
    return result


def build_source_inventory(project_root: str | Path, r2_snapshot: Any = None) -> dict[str, Any]:
    """Build a stable, metadata-only inventory of local catalog sources and callers."""
    root = Path(project_root).resolve()
    if not root.is_dir():
        raise ValueError(f"source inventory root is not a directory: {project_root}")

    caller_text = _read_code_callers(root)
    sources_by_path: dict[str, dict[str, Any]] = {}
    row_sources: list[dict[str, Any]] = []
    missing_scopes: list[str] = []
    scan_scopes = [scope[0] for scope in SOURCE_SCOPES]
    migrations_dir = root / "supabase/migrations"
    if migrations_dir.is_dir():
        scan_scopes.append("supabase/migrations")
    for scope_path in scan_scopes:
        if not (root / scope_path).is_dir():
            missing_scopes.append(scope_path)

    for relative_scope in scan_scopes:
        for path in _walk_files(root, relative_scope):
            relative = path.relative_to(root).as_posix()
            scope = _source_scope(relative)
            if scope is None:
                continue
            scope_path, source_kind, authority, status, note = scope
            if scope_path == "catalog-images":
                source_kind = "design_asset_candidate" if "/banners/" in f"/{relative}/" else "image_candidate"
            if scope_path == "supabase/migrations":
                note = "Selected schema migration; inspect its contents for exact table/index/image contract."
            digest = hashlib.sha256()
            size = 0
            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
                    size += len(chunk)
            item_key = None
            if scope_path == "catalog-images" and "/sku-named/" in f"/{relative}/":
                item_key = path.stem
                note += " Filename key is a candidate only; no live item mapping is asserted."
            if scope_path == "supabase/functions/import-inventory":
                note = "Current importer has a separate write path; preview attachment behavior must be verified before use."
            tokens = SOURCE_CALLER_TOKENS.get(scope_path, (relative,))
            matched_callers = sorted(
                caller_path
                for caller_path, content in caller_text.items()
                if caller_path != relative and any(token in content for token in tokens)
            )
            if relative in caller_text and IMAGE_CONSUMER_PATTERNS.search(caller_text[relative]):
                source_kind = "image_reference_consumer" if source_kind not in {"admin_importer", "edge_importer", "image_upload_authorization", "image_publication", "image_bytes_runtime", "tooling", "legacy_tooling"} else source_kind
            sources_by_path[relative] = {
                "source_path": relative,
                "source_kind": source_kind,
                "owner_authority": authority,
                "format": path.suffix.lower().lstrip(".") or "unknown",
                "item_key": item_key,
                "object_key_or_url": None,
                "size_bytes": size,
                "sha256": digest.hexdigest(),
                "current_callers": matched_callers,
                "status": status,
                "migration_notes": note,
            }
            if scope_path == "data/inventory":
                extracted = _inventory_image_references(path, relative, root)
                for row in extracted:
                    row["current_callers"] = matched_callers
                row_sources.extend(extracted)

    for relative, content in caller_text.items():
        if relative in sources_by_path or not IMAGE_CONSUMER_PATTERNS.search(content):
            continue
        source_scope = _source_scope(relative)
        if source_scope is not None:
            continue
        path = root / relative
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        sources_by_path[relative] = {
            "source_path": relative,
            "source_kind": "image_reference_consumer",
            "owner_authority": "Reads image pointers owned by Supabase public.items; runtime image bytes are served by Cloudflare R2/Worker",
            "format": path.suffix.lower().lstrip(".") or "unknown",
            "item_key": None,
            "object_key_or_url": None,
            "size_bytes": path.stat().st_size,
            "sha256": digest,
            "current_callers": [],
            "status": "canonical" if relative.startswith("apps/customer_storefront/src/") else "legacy",
            "migration_notes": "Static reference consumer found by image URL/key or import function search; review for current caller and read/write behavior.",
        }

    remote_sources: dict[str, Any] = {"r2_listing": "not_supplied; no remote API was called"}
    if r2_snapshot is not None:
        if not isinstance(r2_snapshot, dict) or r2_snapshot.get("read_only") is not True or not isinstance(r2_snapshot.get("products"), list):
            raise ValueError("R2 snapshot must be a read-only object metadata listing with a products array")
        if not isinstance(r2_snapshot.get("bucket_binding"), str) or not isinstance(r2_snapshot.get("bucket_name"), str):
            raise ValueError("R2 snapshot must identify its configured bucket binding and name")
        remote_sources = {
            "r2_listing": "read-only metadata snapshot supplied",
            "bucket_binding": r2_snapshot["bucket_binding"],
            "bucket_name": r2_snapshot["bucket_name"],
            "total_bucket_objects": int(r2_snapshot.get("total_bucket_objects", 0)),
            "total_bucket_bytes": int(r2_snapshot.get("total_bucket_bytes", 0)),
            "product_object_count": len(r2_snapshot["products"]),
            "classified_prefix_counts": r2_snapshot.get("classified_prefix_counts", {}),
            "sha256_available": False,
        }
        for obj in r2_snapshot["products"]:
            if not isinstance(obj, dict) or not isinstance(obj.get("key"), str) or not obj["key"].startswith("products/"):
                raise ValueError("R2 product metadata contains an invalid object key")
            key = obj["key"]
            sources_by_path[f"cloudflare-r2/{r2_snapshot['bucket_binding']}/{key}"] = {
                "source_path": f"cloudflare-r2/{r2_snapshot['bucket_binding']}/{key}",
                "source_kind": "r2_object",
                "owner_authority": "Cloudflare R2 object store via the configured image Worker binding",
                "format": Path(key).suffix.lower().lstrip(".") or "unknown",
                "item_key": None,
                "object_key_or_url": key,
                "size_bytes": int(obj.get("size", 0)),
                "sha256": None,
                "etag": obj.get("etag"),
                "content_type": obj.get("content_type"),
                "last_modified": obj.get("last_modified"),
                "current_callers": ["cloudflare/workers/images/src/index.ts"],
                "match_status": "unresolved",
                "status": "canonical",
                "migration_notes": "Read-only object metadata; ETag is not treated as SHA-256 and the object body was not fetched.",
            }
    sources = sorted([*sources_by_path.values(), *row_sources], key=lambda row: (row["source_path"], row.get("source_row", 0), row["source_kind"]))
    counts_by_status = dict(sorted(Counter(row["status"] for row in sources).items()))
    counts_by_kind = dict(sorted(Counter(row["source_kind"] for row in sources).items()))
    return {
        "schema_version": 1,
        "generated_by": "scripts/catalog/reconcile_inventory_snapshots.py",
        "read_only": True,
        "remote_sources": remote_sources,
        "missing_scopes": sorted(missing_scopes),
        "summary": {
            "source_count": len(sources),
            "counts_by_status": counts_by_status,
            "counts_by_kind": counts_by_kind,
        },
        "sources": sources,
    }


def _same_price(left: Any, right: Any) -> bool | None:
    if _empty(left) or _empty(right):
        return None
    try:
        return Decimal(str(left).replace(",", "").strip()) == Decimal(str(right).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        return False


def _same_active(left: Any, right: Any) -> bool | None:
    if _empty(left) or _empty(right):
        return None

    def parse(value: Any) -> bool | None:
        if isinstance(value, bool):
            return value
        text = _normal(value)
        if text in {"true", "1", "yes", "active"}:
            return True
        if text in {"false", "0", "no", "inactive"}:
            return False
        return None

    a, b = parse(left), parse(right)
    return None if a is None or b is None else a == b


def _timestamp(value: Any) -> datetime | None:
    if _empty(value):
        return None
    try:
        parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _compare_fields(source: dict[str, Any], database: dict[str, Any]) -> tuple[dict[str, str], dict[str, dict[str, Any]]]:
    states: dict[str, str] = {}
    differences: dict[str, dict[str, Any]] = {}
    for field in COMPARE_FIELDS:
        source_value = source.get(field)
        db_value = database.get(field)
        if field == "category":
            source_category_id = source.get("category_id")
            db_category_id = database.get("category_id")
            if not _empty(source_category_id) and not _empty(db_category_id):
                source_value, db_value = source_category_id, db_category_id
        if field == "price":
            same = _same_price(source_value, db_value)
        elif field == "is_active":
            same = _same_active(source_value, db_value)
        else:
            same = None if _empty(source_value) or _empty(db_value) else _normal(source_value) == _normal(db_value)
        if same is None:
            states[field] = "unknown"
        elif same:
            states[field] = "matched"
        else:
            states[field] = "mismatched"
            differences[field] = {"sheet": source_value, "supabase": db_value}
            if field == "category":
                differences[field]["supabase_category_name"] = database.get("category")
    return states, differences


def _duplicate_keys(rows: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    buckets: dict[str, list[int]] = defaultdict(list)
    for row in rows:
        value = _normal(row.get(field))
        if value:
            buckets[value].append(row["_source_row"])
    return [{"value": key, "source_rows": values} for key, values in sorted(buckets.items()) if len(values) > 1]


def _index(rows: list[dict[str, Any]], field: str) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = _normal(row.get(field))
        if value:
            index[value].append(row)
    return index


def _public_row(row: dict[str, Any]) -> dict[str, Any]:
    public_fields = ("id", "sku", "name", "brand", "category", "category_id", "price", "updated_at")
    result = {key: row[key] for key in public_fields if key in row}
    result["source_row"] = row["_source_row"]
    return result


def _compare_source(source: str, source_rows: list[dict[str, Any]], db_rows: list[dict[str, Any]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    source_ids = _index(source_rows, "id")
    source_skus = _index(source_rows, "sku")
    db_ids = _index(db_rows, "id")
    db_skus = _index(db_rows, "sku")
    matches: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []
    used_db_rows: set[int] = set()

    for row in source_rows:
        source_row = row["_source_row"]
        selected: dict[str, Any] | None = None
        method: str | None = None
        item_id = _normal(row.get("id"))
        sku = _normal(row.get("sku"))

        if item_id and (len(source_ids[item_id]) > 1 or len(db_ids.get(item_id, [])) > 1):
            ambiguous.append({"source_row": source_row, "sku": row.get("sku"), "reason": "duplicate_id"})
            unmatched.append(row)
            continue
        if item_id and len(db_ids.get(item_id, [])) == 1:
            selected, method = db_ids[item_id][0], "id"
        elif sku and (len(source_skus[sku]) > 1 or len(db_skus.get(sku, [])) > 1):
            ambiguous.append({"source_row": source_row, "sku": row.get("sku"), "reason": "duplicate_sku"})
            unmatched.append(row)
            continue
        elif sku and len(db_skus.get(sku, [])) == 1:
            selected, method = db_skus[sku][0], "sku"

        if selected is None or selected["_source_row"] in used_db_rows:
            reason = "database_record_already_matched" if selected is not None else "no_exact_id_or_unique_sku"
            unmatched.append(row)
            if selected is not None:
                ambiguous.append({"source_row": source_row, "sku": row.get("sku"), "reason": reason})
            continue

        used_db_rows.add(selected["_source_row"])
        field_states, differences = _compare_fields(row, selected)
        matches.append({
            "source_row": source_row,
            "supabase_id": selected.get("id"),
            "match_method": method,
            "field_states": field_states,
            "field_differences": differences,
        })

    field_counts = {field: {"matched": 0, "mismatched": 0, "unknown": 0} for field in COMPARE_FIELDS}
    for match in matches:
        for field, state in match["field_states"].items():
            field_counts[field][state] += 1

    freshness = {"newer": 0, "older": 0, "equal": 0, "unknown": 0}
    timestamp_field = "updated_at" if any(not _empty(row.get("updated_at")) for row in source_rows) else None
    if timestamp_field:
        source_by_row = {row["_source_row"]: row for row in source_rows}
        for match in matches:
            row = source_by_row[match["source_row"]]
            database_row = db_ids.get(_normal(match.get("supabase_id")), [])
            if len(database_row) != 1:
                freshness["unknown"] += 1
                continue
            source_time = _timestamp(row.get(timestamp_field))
            db_time = _timestamp(database_row[0].get("updated_at"))
            if source_time is None or db_time is None:
                freshness["unknown"] += 1
            elif source_time > db_time:
                freshness["newer"] += 1
            elif source_time < db_time:
                freshness["older"] += 1
            else:
                freshness["equal"] += 1
        freshness["unknown"] += len(unmatched)
    else:
        freshness["unknown"] = len(source_rows)

    compared = sum(counts["matched"] + counts["mismatched"] for counts in field_counts.values())
    agreed = sum(counts["matched"] for counts in field_counts.values())
    report = {
        "row_count": len(source_rows),
        "matched_count": len(matches),
        "unmatched_source_count": len(unmatched),
        "unmatched_database_count": len(db_rows) - len(used_db_rows),
        "ambiguous_count": len(ambiguous),
        "duplicate_ids": _duplicate_keys(source_rows, "id"),
        "duplicate_skus": _duplicate_keys(source_rows, "sku"),
        "matches": matches,
        "unmatched_source_rows": [
            {"source_row": row["_source_row"], "sku": row.get("sku"), "name": row.get("name"), "brand": row.get("brand")}
            for row in unmatched
        ],
        "ambiguous_rows": ambiguous,
        "field_counts": field_counts,
        "field_agreement_rate": (agreed / compared) if compared else None,
        "freshness_vs_supabase": freshness,
    }
    return report, unmatched


def reconcile(master_snapshot: Any, copy_snapshot: Any, supabase_snapshot: Any) -> dict[str, Any]:
    """Return a field-level report; never invokes a connector or writes data."""
    master_rows = _records(master_snapshot, "master")
    copy_rows = _records(copy_snapshot, "copy")
    db_rows = _records(supabase_snapshot, "supabase")
    if not db_rows:
        raise ValueError("supabase snapshot has no product rows")
    db_duplicates = {field: _duplicate_keys(db_rows, field) for field in ("id", "sku")}
    master_report, master_unmatched = _compare_source("master", master_rows, db_rows)
    copy_report, copy_unmatched = _compare_source("copy", copy_rows, db_rows)
    return {
        "schema_version": 1,
        "read_only": True,
        "sources": {
            "master": {"row_count": len(master_rows), "has_row_timestamps": any(not _empty(r.get("updated_at")) for r in master_rows)},
            "copy": {"row_count": len(copy_rows), "has_row_timestamps": any(not _empty(r.get("updated_at")) for r in copy_rows)},
            "supabase": {"row_count": len(db_rows)},
        },
        "supabase_duplicate_keys": db_duplicates,
        "comparisons": {"master": master_report, "copy": copy_report},
        "unmatched_records_for_candidates": {
            "master": [_public_row(row) for row in master_unmatched],
            "copy": [_public_row(row) for row in copy_unmatched],
        },
        "typesafe_reviews": {"status": "not_requested", "reviewed_count": 0, "results": []},
        "notice": "Database agreement is not evidence of product truth; verify catalog corrections with authoritative product evidence.",
    }


def _candidate_pairs(report: dict[str, Any], db_rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    candidates = []
    for source in ("master", "copy"):
        matched_ids = {
            str(match.get("supabase_id"))
            for match in report["comparisons"][source]["matches"]
            if match.get("supabase_id")
        }
        for row in report["unmatched_records_for_candidates"][source]:
            source_brand = _normal(row.get("brand"))
            source_name = _normal(row.get("name"))
            ranked = []
            for db_row in db_rows:
                if str(db_row.get("id")) in matched_ids:
                    continue
                db_brand = _normal(db_row.get("brand"))
                if source_brand and db_brand and source_brand != db_brand:
                    continue
                ratio = difflib.SequenceMatcher(None, source_name, _normal(db_row.get("name"))).ratio()
                if ratio >= 0.58:
                    ranked.append((ratio, db_row))
            ranked.sort(key=lambda pair: (-pair[0], str(pair[1].get("id", ""))))
            for ratio, db_row in ranked[:3]:
                candidates.append({
                    "source": source,
                    "source_row": row.get("_source_row", row.get("source_row")),
                    "sheet": {key: row.get(key) for key in ("sku", "name", "brand", "price") if key in row},
                    "supabase": {key: db_row.get(key) for key in ("id", "sku", "name", "brand", "price", "category")},
                    "local_similarity": round(ratio, 4),
                })
    candidates.sort(key=lambda c: (-c["local_similarity"], c["source"], c["source_row"] or 0))
    return candidates[:limit]


class InvalidTypeSafeResult(Exception):
    """Raised when a TypeSafe response cannot be stored safely in JSON."""


def _normalize_typesafe_result(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InvalidTypeSafeResult
    try:
        return json.loads(json.dumps(value, allow_nan=False))
    except (TypeError, ValueError, OverflowError) as error:
        raise InvalidTypeSafeResult from error


def add_typesafe_reviews(
    report: dict[str, Any],
    database_rows: list[dict[str, Any]],
    limit: int = 25,
    model: str = "jev-latest",
) -> None:
    """Score only bounded fuzzy candidates; results remain inferred suggestions."""
    report["typesafe_reviews"] = {"status": "unavailable", "reviewed_count": 0, "results": []}
    if limit < 1 or limit > 50:
        raise ValueError("TypeSafe review limit must be between 1 and 50")
    pairs = _candidate_pairs(report, database_rows, limit)
    if not pairs:
        report["typesafe_reviews"] = {"status": "no_candidates", "reviewed_count": 0, "candidate_count": 0, "results": []}
        return
    try:
        repo_root = Path(__file__).resolve().parents[2]
        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))
        from scripts.receipts.typesafe_client import TypeSafeClient

        client = TypeSafeClient(model=model)
    except Exception as error:
        report["typesafe_reviews"]["reason"] = "client_unavailable" if type(error).__name__ != "ValueError" else "credentials_unavailable"
        return

    results = []
    for index, pair in enumerate(pairs, start=1):
        state = {
            "sheet_product": {key: pair["sheet"].get(key) for key in ("sku", "name", "brand", "price") if key in pair["sheet"]},
            "database_candidate": {key: pair["supabase"].get(key) for key in ("sku", "name", "brand", "price", "category") if key in pair["supabase"]},
            "task": "Assess whether these two catalog records represent the same exact sellable product. Consider brand, product type, flavor, variant, and package size. Do not infer missing attributes.",
        }
        question = TypeSafeClient.score(
            instructions="Rate the identity relationship. 'same product' requires compatible brand, product/variant, and package size; otherwise prefer uncertain or different.",
            criteria=["different product", "related or uncertain", "same exact sellable product"],
        )
        try:
            typed_result = _normalize_typesafe_result(
                client.evaluate(state=state, questions={"relationship": question}, model=model)
            )
            results.append({
                "candidate_index": index,
                "candidate": pair,
                "provenance": "inferred_typesafe",
                "review_required": True,
                "result": typed_result,
            })
        except Exception as error:
            results.append({
                "candidate_index": index,
                "candidate": pair,
                "provenance": "inferred_typesafe",
                "review_required": True,
                "error_type": "InvalidTypeSafeResult" if isinstance(error, InvalidTypeSafeResult) else type(error).__name__,
            })
    reviewed_count = sum("result" in result for result in results)
    report["typesafe_reviews"] = {
        "status": "completed" if reviewed_count == len(pairs) else ("partial" if reviewed_count else "failed"),
        "reviewed_count": reviewed_count,
        "candidate_count": len(pairs),
        "model": model,
        "results": results,
        "notice": "TypeSafe judgments are suggestions only and must not authorize catalog changes.",
    }


def write_report(report: dict[str, Any], output_path: str | Path) -> None:
    """Write a complete local JSON report atomically."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
            temporary_path = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)


def _ensure_output_is_separate(output_path: str | Path, input_paths: Iterable[str | Path]) -> None:
    output = Path(output_path).resolve()
    for input_path in input_paths:
        source = Path(input_path).resolve()
        same_file = output == source
        if not same_file and output.exists() and source.exists():
            try:
                same_file = os.path.samefile(output, source)
            except OSError:
                same_file = False
        if same_file:
            raise ValueError("--output must not overwrite an input snapshot")


def _ensure_source_output_outside_scopes(output_path: str | Path, project_root: str | Path) -> None:
    output = Path(output_path).resolve()
    root = Path(project_root).resolve()
    scopes = [scope[0] for scope in SOURCE_SCOPES] + ["supabase/migrations"]
    for relative_scope in scopes:
        try:
            output.relative_to(root / relative_scope)
        except ValueError:
            continue
        raise ValueError(f"source inventory output must be outside scanned source scope: {relative_scope}")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-inventory-root", help="Build a metadata-only inventory from this local repository root")
    parser.add_argument("--source-inventory-output", help="Local JSON destination for --source-inventory-root")
    parser.add_argument("--r2-snapshot", help="Optional local read-only R2 object metadata snapshot for source inventory mode")
    parser.add_argument("--master", help="JSON snapshot of LS-inventory-01 values (reconciliation mode)")
    parser.add_argument("--copy", help="JSON snapshot of Copy of LS-inventory-01 values (reconciliation mode)")
    parser.add_argument("--supabase", help="JSON array or {rows: [...]} snapshot of Supabase products (reconciliation mode)")
    parser.add_argument("--output", help="Local JSON report path (reconciliation mode)")
    parser.add_argument("--typesafe-candidates", action="store_true", help="Opt in to sending bounded unmatched product candidates to TypeSafe")
    parser.add_argument("--typesafe-limit", type=int, default=25, help="Maximum candidate pairs sent to TypeSafe (1-50; default 25)")
    parser.add_argument("--typesafe-model", default="jev-latest", help="TypeSafe model alias (default: jev-latest)")
    args = parser.parse_args(argv)

    try:
        if args.source_inventory_root or args.source_inventory_output:
            if not args.source_inventory_root or not args.source_inventory_output:
                parser.error("--source-inventory-root and --source-inventory-output must be provided together")
            if any((args.master, args.copy, args.supabase, args.output, args.typesafe_candidates)):
                parser.error("source inventory mode cannot be combined with reconciliation or TypeSafe options")
            _ensure_source_output_outside_scopes(args.source_inventory_output, args.source_inventory_root)
            if args.r2_snapshot:
                _ensure_output_is_separate(args.source_inventory_output, (args.r2_snapshot,))
            manifest = build_source_inventory(args.source_inventory_root, load_snapshot(args.r2_snapshot) if args.r2_snapshot else None)
            write_report(manifest, args.source_inventory_output)
            print(f"Wrote read-only source inventory: {args.source_inventory_output}")
            return 0
        if not all((args.master, args.copy, args.supabase, args.output)):
            parser.error("reconciliation mode requires --master, --copy, --supabase, and --output")
        _ensure_output_is_separate(args.output, (args.master, args.copy, args.supabase))
        report = reconcile(load_snapshot(args.master), load_snapshot(args.copy), load_snapshot(args.supabase))
        if args.typesafe_candidates:
            database_rows = _records(load_snapshot(args.supabase), "supabase")
            add_typesafe_reviews(report, database_rows, args.typesafe_limit, args.typesafe_model)
        write_report(report, args.output)
    except (OSError, ValueError) as error:
        print(f"inventory audit failed: {error}", file=sys.stderr)
        return 2
    print(f"Wrote read-only inventory comparison: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
