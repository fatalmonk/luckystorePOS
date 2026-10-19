#!/usr/bin/env python3
"""
Lucky Store — Non-Receipt Image Auditor
Identifies photos categorized as non-receipts (product, screenshot, other)
from the TypeSafe Jev vision audit and maps those currently placed in
data/standardized_receipts for relocation or catalog enrichment.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import sys
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]


def audit_non_receipts(
    vision_jsonl: Path,
    output_csv: Path,
    output_json: Path,
) -> None:
    non_receipts: List[Dict[str, Any]] = []

    with open(vision_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            choice = row.get("answers", {}).get("type", {}).get("choice")
            if choice == "receipt":
                continue

            path_str = row.get("representative_path", "")
            p = Path(path_str)
            is_in_standardized = "standardized_receipts" in path_str

            non_receipts.append({
                "sha256": row.get("sha256", ""),
                "filename": p.name,
                "full_path": path_str,
                "type": choice,
                "confidence": row.get("answers", {}).get("type", {}).get("confidence", 0.0),
                "quality": row.get("answers", {}).get("quality", {}).get("choice", ""),
                "readable_noul": row.get("answers", {}).get("readable", {}).get("noul", 0.0),
                "is_in_standardized_receipts": is_in_standardized,
                "recommended_folder": "product_photos" if choice == "product" else ("screenshots" if choice == "screenshot" else "other_documents"),
            })

    # Write CSV
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "filename",
        "type",
        "confidence",
        "quality",
        "readable_noul",
        "is_in_standardized_receipts",
        "recommended_folder",
        "full_path",
        "sha256",
    ]
    with open(output_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for nr in non_receipts:
            writer.writerow(nr)

    # Write JSON summary
    summary = {
        "total_non_receipts": len(non_receipts),
        "in_standardized_receipts": sum(1 for nr in non_receipts if nr["is_in_standardized_receipts"]),
        "breakdown": {
            "product": sum(1 for nr in non_receipts if nr["type"] == "product"),
            "screenshot": sum(1 for nr in non_receipts if nr["type"] == "screenshot"),
            "other": sum(1 for nr in non_receipts if nr["type"] == "other"),
        },
        "standardized_misplaced_breakdown": {
            "product": sum(1 for nr in non_receipts if nr["is_in_standardized_receipts"] and nr["type"] == "product"),
            "screenshot": sum(1 for nr in non_receipts if nr["is_in_standardized_receipts"] and nr["type"] == "screenshot"),
            "other": sum(1 for nr in non_receipts if nr["is_in_standardized_receipts"] and nr["type"] == "other"),
        },
        "items": non_receipts,
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Done: @[{output_csv}] ({len(non_receipts)} non-receipts, {summary['in_standardized_receipts']} in standardized_receipts)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and extract non-receipt photos from vision audit.")
    parser.add_argument(
        "--vision",
        type=Path,
        default=REPO_ROOT / "data" / "audits" / "jev-vision-2026-10-19" / "unique-image-results.jsonl",
        help="Path to vision audit jsonl",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=REPO_ROOT / "data" / "audits" / "non_receipt_photos_audit.csv",
        help="Path to output CSV report",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=REPO_ROOT / "data" / "audits" / "non_receipt_photos_audit.json",
        help="Path to output JSON summary",
    )
    args = parser.parse_args()
    audit_non_receipts(args.vision, args.csv, args.json)


if __name__ == "__main__":
    main()
