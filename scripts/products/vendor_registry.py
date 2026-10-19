#!/usr/bin/env python3
"""
Lucky Store — Dynamic Vendor Registry & Reconciliation Route
Manages known master vendors while dynamically registering and categorizing
new vendors discovered from:
- Invoices / Receipts (OCR + TypeSafe Jev)
- Bank statements / Challans
- Expense ledger rows
- New supplier onboarding
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
ACCOUNTS_DIR = REPO_ROOT / "data" / "Accounts"
MASTER_VENDORS_FILE = ACCOUNTS_DIR / "master_vendor_list.json"
VENDOR_CATEGORIES_FILE = ACCOUNTS_DIR / "vendor_categories.json"
DYNAMIC_REGISTRY_FILE = ACCOUNTS_DIR / "vendor_registry.json"


def normalize_vendor_name(name: str) -> str:
    """Normalize vendor name for fuzzy / exact matching."""
    cleaned = re.sub(r"[_\-]+", " ", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.title()


class VendorRegistry:
    """Dynamic Vendor Registry with auto-categorization and discovery routing."""

    def __init__(self):
        self.master_file = MASTER_VENDORS_FILE
        self.categories_file = VENDOR_CATEGORIES_FILE
        self.registry_file = DYNAMIC_REGISTRY_FILE
        self._load()

    def _load(self) -> None:
        # 1. Master canonical vendors
        if self.master_file.is_file():
            with open(self.master_file, "r", encoding="utf-8") as f:
                self.known_vendors: List[str] = json.load(f)
        else:
            self.known_vendors = []

        # 2. Categories taxonomy
        if self.categories_file.is_file():
            with open(self.categories_file, "r", encoding="utf-8") as f:
                self.categories: Dict[str, List[str]] = json.load(f)
        else:
            self.categories = {}

        # 3. Dynamic registry state
        if self.registry_file.is_file():
            with open(self.registry_file, "r", encoding="utf-8") as f:
                self.registry: Dict[str, Any] = json.load(f)
        else:
            self.registry = {
                "version": "1.0.0",
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "vendors": {},
            }
            # Initialize with master list
            for v in self.known_vendors:
                cat = self.infer_category(v)
                self.registry["vendors"][v] = {
                    "canonical_name": v,
                    "aliases": [v.lower(), re.sub(r"[^a-zA-Z0-9]", "", v).lower()],
                    "category": cat,
                    "status": "active",
                    "source": "master_list",
                    "added_at": datetime.now(timezone.utc).isoformat(),
                }

    def infer_category(self, vendor_name: str) -> str:
        """Heuristically assign category based on keyword matching."""
        v_lower = vendor_name.lower()
        for cat, examples in self.categories.items():
            if any(ex.lower() in v_lower or v_lower in ex.lower() for ex in examples):
                return cat

        if any(w in v_lower for w in ["electric", "mechanic", "cctv", "ac", "hardware", "glass", "paint"]):
            return "Utilities & Facility"
        if any(w in v_lower for w in ["distribut", "trading", "enterprise", "traders", "corporation"]):
            return "Local Distributors"
        if any(w in v_lower for w in ["food", "baker", "sweets", "flour", "candy", "chips"]):
            return "Snacks & Confectionery"
        if any(w in v_lower for w in ["milk", "dairy", "yoghurt", "ghee"]):
            return "FMCG & Dairy Suppliers"
        if any(w in v_lower for w in ["tea", "drink", "beverage", "juice"]):
            return "Beverages"
        if any(w in v_lower for w in ["egg", "poultry", "agro", "farm"]):
            return "Eggs & Poultry"

        return "Uncategorized / Pending Review"

    def match_or_register(
        self,
        candidate_name: str,
        source: str = "auto_discovery",
        category_hint: Optional[str] = None,
    ) -> Tuple[str, bool]:
        """
        Match candidate name to existing vendor or register as a new supplier route.
        Returns: (canonical_name, is_newly_registered)
        """
        normalized = normalize_vendor_name(candidate_name)
        comp_key = re.sub(r"[^a-zA-Z0-9]", "", candidate_name).lower()

        # Check existing entries & aliases
        for name, data in self.registry["vendors"].items():
            if name.lower() == normalized.lower():
                return name, False
            if comp_key in data.get("aliases", []):
                return name, False

        # Register new vendor
        cat = category_hint or self.infer_category(normalized)
        now_str = datetime.now(timezone.utc).isoformat()
        self.registry["vendors"][normalized] = {
            "canonical_name": normalized,
            "aliases": [candidate_name.lower(), comp_key],
            "category": cat,
            "status": "pending_verification",
            "source": source,
            "added_at": now_str,
        }

        # Keep master vendor list in sync
        if normalized not in self.known_vendors:
            self.known_vendors.append(normalized)
            self.known_vendors.sort()

        # Update categories if specified
        if cat in self.categories and normalized not in self.categories[cat]:
            self.categories[cat].append(normalized)

        self.save()
        return normalized, True

    def save(self) -> None:
        """Persist master list, categories, and dynamic registry."""
        self.registry["last_updated"] = datetime.now(timezone.utc).isoformat()
        self.master_file.parent.mkdir(parents=True, exist_ok=True)

        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(self.registry, f, indent=2)

        with open(self.master_file, "w", encoding="utf-8") as f:
            json.dump(self.known_vendors, f, indent=2)

        with open(self.categories_file, "w", encoding="utf-8") as f:
            json.dump(self.categories, f, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Lucky Store Dynamic Vendor Registry Manager")
    parser.add_argument("--add", help="Candidate vendor name to match or register")
    parser.add_argument("--source", default="manual_cli", help="Source of the vendor record")
    parser.add_argument("--category", help="Optional category override")
    parser.add_argument("--sync", action="store_true", help="Sync and save all files")
    args = parser.parse_args()

    reg = VendorRegistry()

    if args.add:
        name, is_new = reg.match_or_register(args.add, source=args.source, category_hint=args.category)
        status = "Registered NEW supplier" if is_new else "Matched EXISTING supplier"
        print(f"[{status}] -> '{name}' (Category: {reg.registry['vendors'][name]['category']})")
    elif args.sync:
        reg.save()
        print(f"Done: Synced {len(reg.registry['vendors'])} vendors in registry.")
    else:
        pending = [v for v, d in reg.registry["vendors"].items() if d.get("status") == "pending_verification"]
        print(f"Total Vendors: {len(reg.registry['vendors'])} | Pending Verification: {len(pending)}")


if __name__ == "__main__":
    main()
