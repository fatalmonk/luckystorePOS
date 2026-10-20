#!/usr/bin/env python3
"""
Lucky Store — Storefront Catalog Enrichment & Segregation Script
Integrates Jev / TypeSafe System One to segregate and enrich products:
- Parses items_rows.csv (id, name, cost, price, mrp, category, etc.)
- Segregates inventory and flags pricing integrity (e.g. margin, mrp vs price)
- Evaluates storefront readiness using TypeSafe System One (Jev)
- Formats structured outputs aligned with Storefront Browse Products & Enrichment schemas.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.receipts.typesafe_client import TypeSafeClient

STOREFRONT_READINESS_CRITERIA = {
    "ready": "Product has complete metadata (clean name, sensible price, valid description/category) ready for storefront listing.",
    "needs_enrichment": "Missing essential consumer details (e.g., specifications, clear usage, or pack size) or requires description cleanup.",
    "pricing_defect": "Inconsistent or problematic pricing (e.g., cost higher than price, missing MRP, zero price).",
    "unverified_pack": "Unverified packaging details or untrusted OCR/title format needing manual review.",
}


class StorefrontEnricher:
    """Enriches and segregates raw catalog items for Lucky Store customer storefront."""

    def __init__(self, client: Optional[TypeSafeClient] = None, model: str = "jev-latest"):
        self.client = client
        self.model = model

    def parse_csv_items(self, csv_path: Path) -> List[Dict[str, Any]]:
        """Parse raw items CSV into typed dictionaries."""
        items: List[Dict[str, Any]] = []
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    cost_val = float(row.get("cost", 0) or 0)
                except ValueError:
                    cost_val = 0.0

                try:
                    price_val = float(row.get("price", 0) or 0)
                except ValueError:
                    price_val = 0.0

                try:
                    mrp_val = float(row.get("mrp", 0) or 0) if row.get("mrp") else None
                except ValueError:
                    mrp_val = None

                is_active = str(row.get("is_active", "false")).lower() in ("true", "1", "yes")

                items.append({
                    "id": row.get("id", "").strip(),
                    "sku": row.get("sku", "").strip(),
                    "barcode": row.get("barcode", "").strip(),
                    "name": row.get("name", "").strip(),
                    "category_id": row.get("category_id", "").strip(),
                    "description": row.get("description", "").strip(),
                    "cost": cost_val,
                    "price": price_val,
                    "mrp": mrp_val,
                    "brand": row.get("brand", "").strip(),
                    "image_url": row.get("image_url", "").strip(),
                    "is_active": is_active,
                    "short_code": row.get("short_code", "").strip(),
                    "tenant_id": row.get("tenant_id", "").strip(),
                })
        return items

    def segregate_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Perform deterministic pricing, margin, and storefront segregation."""
        cost = item["cost"]
        price = item["price"]
        mrp = item["mrp"]

        margin_amt = price - cost
        margin_pct = (margin_amt / price * 100) if price > 0 else 0.0

        anomalies: List[str] = []
        if price <= 0:
            anomalies.append("ZERO_OR_NEGATIVE_PRICE")
        if cost > price:
            anomalies.append("NEGATIVE_MARGIN")
        if mrp is not None and price > mrp:
            anomalies.append("PRICE_EXCEEDS_MRP")
        if not item["image_url"]:
            anomalies.append("MISSING_IMAGE")

        # Derive 8-char slug prefix for storefront registry compliance
        slug_prefix = item["id"][:8] if item["id"] else ""

        # Map to Browse Products Skill schema
        storefront_product = {
            "id": item["id"],
            "slug_prefix": slug_prefix,
            "sku": item["sku"],
            "name": item["name"],
            "brand": item["brand"],
            "cost": cost,
            "price": price,
            "mrp": mrp,
            "margin_pct": round(margin_pct, 2),
            "originalPrice": mrp if mrp else price,
            "image_url": item["image_url"],
            "is_active": item["is_active"],
            "anomalies": anomalies,
            "has_pricing_defect": len(anomalies) > 0,
        }
        return storefront_product

    def evaluate_with_typesafe(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Optionally query TypeSafe System One (Jev) for storefront readiness."""
        if not self.client:
            return {"status": "unvetted", "verdict": "skipped_no_client"}

        item_summary = (
            f"Product: {item['name']}\n"
            f"Brand: {item['brand']}\n"
            f"Cost: {item['cost']}, Price: {item['price']}, MRP: {item['mrp']}\n"
            f"Description: {item.get('description', '')[:200]}"
        )

        try:
            res = self.client.choice(
                instructions=f"Evaluate catalog readiness for storefront listing:\n{item_summary}",
                criteria=STOREFRONT_READINESS_CRITERIA,
            )
            return {"status": "vetted", "verdict": res}
        except Exception as e:
            return {"status": "error", "error": str(e)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich and segregate Lucky Store catalog items.")
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to an explicitly supplied items_rows.csv export",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "data" / "catalog" / "storefront_enriched_products.json",
        help="Path to output JSON file",
    )
    parser.add_argument(
        "--with-jev",
        action="store_true",
        help="Enable TypeSafe System One (Jev) semantic vetting via API",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of items processed",
    )

    args = parser.parse_args()

    client = None
    if args.with_jev:
        client = TypeSafeClient()

    enricher = StorefrontEnricher(client=client)

    print(f"Reading: @[{args.input}]")
    raw_items = enricher.parse_csv_items(args.input)
    if args.limit:
        raw_items = raw_items[:args.limit]

    print(f"Loaded {len(raw_items)} items. Segregating...")

    processed: List[Dict[str, Any]] = []
    ready_count = 0
    defect_count = 0

    for item in raw_items:
        segregated = enricher.segregate_item(item)
        if args.with_jev:
            jev_res = enricher.evaluate_with_typesafe(item)
            segregated["jev_evaluation"] = jev_res

        if segregated["has_pricing_defect"]:
            defect_count += 1
        else:
            ready_count += 1

        processed.append(segregated)

    output_payload = {
        "total": len(processed),
        "ready_count": ready_count,
        "defect_count": defect_count,
        "products": processed,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print(f"Done: @[{args.output}] ({len(processed)} products, {ready_count} ready, {defect_count} defects)")


if __name__ == "__main__":
    main()
