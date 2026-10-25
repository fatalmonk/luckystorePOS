#!/usr/bin/env python3
"""Compare inventory sheet snapshots with a Supabase catalog snapshot.

The deterministic audit is offline and read-only. Optional TypeSafe candidate
reviews are explicitly opt-in and remain suggestions for a human reviewer.
"""

from __future__ import annotations

import argparse
import difflib
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
            canonical_row = {_canonical_field(key): value for key, value in row.items()}
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
    return " ".join(str(value or "").casefold().split())


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


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--master", required=True, help="JSON snapshot of LS-inventory-01 values")
    parser.add_argument("--copy", required=True, help="JSON snapshot of Copy of LS-inventory-01 values")
    parser.add_argument("--supabase", required=True, help="JSON array or {rows: [...]} snapshot of Supabase products")
    parser.add_argument("--output", required=True, help="Local JSON report path")
    parser.add_argument("--typesafe-candidates", action="store_true", help="Opt in to sending bounded unmatched product candidates to TypeSafe")
    parser.add_argument("--typesafe-limit", type=int, default=25, help="Maximum candidate pairs sent to TypeSafe (1-50; default 25)")
    parser.add_argument("--typesafe-model", default="jev-latest", help="TypeSafe model alias (default: jev-latest)")
    args = parser.parse_args(argv)

    try:
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
