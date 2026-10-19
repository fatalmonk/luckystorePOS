#!/usr/bin/env python3
"""
Lucky Store Receipt Standardization & Autocleaning Pipeline.

Standardizes, deduplicates, and profiles purchase receipt files across local
data directories to match the canonical Lucky Store naming convention:
    LS<seq>-<DD_MM_YY>-<SupplierName>-<TotalBDT>BDT.jpeg
Example:
    LS141-04_05_26-Haque&Sons-3076BDT.jpeg

Features:
- Automatic orientation detection & upright rotation via EXIF + Tesseract OSD.
- Cross-referencing against Lucky Store Financial Expenses Ledger for vendor & total enrichment.
- Exact SHA-256 and stem-pair deduplication (prefers higher quality .jpeg).
- Automatic extraction and formatting of invoice dates (DD_MM_YY) and sequences.
- Companion OCR text extraction for supplier and total amount parsing.
- Databricks Unity Catalog Volume discovery and synchronization via Databricks Python SDK.

Skills Integrated:
- data-autocleaning: Data profiling, deduplication, schema alignment, and null/anomaly auditing.
- databricks-data-discovery: Unity Catalog discovery of catalogs, schemas, volumes, and warehouses.
- databricks-python-sdk: WorkspaceClient orchestration for volume management and file uploads.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from PIL import Image, ImageOps

# Auto-load repository .env.local if present
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_LOCAL = REPO_ROOT / ".env.local"
if ENV_LOCAL.is_file():
    from dotenv import load_dotenv
    load_dotenv(ENV_LOCAL)

# Databricks SDK import with graceful fallback
try:
    from databricks.sdk import WorkspaceClient
    from databricks.sdk.service.catalog import VolumeType
    DATABRICKS_SDK_AVAILABLE = True
except ImportError:
    DATABRICKS_SDK_AVAILABLE = False


# Canonical Lucky Store receipt filename pattern:
# e.g.: LS141-04_05_26-Haque&Sons-3076BDT.jpeg
CANONICAL_RECEIPT_RE = re.compile(
    r"^(?P<prefix>LS\d+)[\s_-]+(?P<date>\d{1,4}[\s/_.-]\d{1,2}[\s/_.-]\d{1,4})[\s_-]+(?P<supplier>[a-zA-Z0-9.&()\-]+)[\s_-]+(?P<total>\d+(?:\.\d{1,2})?)(?:BDT|tk|taka)?\.(?P<ext>jpe?g|png)$",
    re.IGNORECASE,
)

# Daily Sales Summary pattern:
# e.g.: LS332-05_07_26-DailySummary.jpeg
DAILY_SUMMARY_RE = re.compile(
    r"^(?P<prefix>LS\d+)[\s_-]+(?P<date>\d{1,4}[\s/_.-]\d{1,2}[\s/_.-]\d{1,4})[\s_-]+(?:DailySummary|DailySalesSummary|Daily-Summary)\.(?P<ext>jpe?g|png)$",
    re.IGNORECASE,
)

# Camera export pattern:
# e.g.: 00001309-PHOTO-2026-06-02-00-14-40.jpg
CAMERA_PHOTO_RE = re.compile(
    r"^0*(\d+)-PHOTO-(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})-(?P<hour>\d{2})-(?P<minute>\d{2})-(?P<second>\d{2})\.(?P<ext>jpe?g|png)$",
    re.IGNORECASE,
)

# WhatsApp export pattern:
# e.g.: WhatsApp Image 2026-08-02 at 00.26.55.jpeg or ... at 00.26.56 (1).jpeg
WHATSAPP_PHOTO_RE = re.compile(
    r"^WhatsApp Image (?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2}) at (?P<time>[0-9.]+)(?: \(\d+\))?\.(?P<ext>jpe?g|png)$",
    re.IGNORECASE,
)

# Default path to store expenses ledger
DEFAULT_EXPENSES_CSV = REPO_ROOT / "data" / "Accounts" / "reconciled_expenses_for_google_sheet.csv"

# Known suppliers catalog extracted from verified Lucky Store receipts
KNOWN_SUPPLIERS = [
    "ACI", "ASEnterprise", "Aarong", "AbhayDistribution", "AbuBakar&Co", "AcnolPoly",
    "Ahmed", "AmesDistribution", "ArmyEnterprise", "AtlanticDistribution", "BismillahEnterprise",
    "BismillahFamilyFood", "BismillahTrading", "BokkorMilk", "BombaySweets", "Coca-Cola",
    "Dabur", "Drinko", "Eggs", "FMDistribution", "FarhadStore", "Fresh", "Fried(KoreanRamen)",
    "Fulkoli", "GroupStar", "Haque&Sons", "HaqueFoodIndustries", "IslamTrading",
    "JAKFoodEnterprise", "JKEnterprise", "JawadTrading", "KaaziFarms", "KashemDrycell",
    "Kazi&KaziTea", "KaziCuisine", "KGMEnterprise", "Meghna", "Meridian", "MimEnterprise",
    "Mostafa&Trading", "MostofaStore(Pahartali)", "NaharAgro", "Nestle", "NewZealandDairy",
    "OlympicIndustries", "Paragon", "Pitstop", "Potata", "PRAN-RFL", "PranAgroLimited",
    "Pusti", "RahmaEnterprise", "Rupchanda", "Sajeeb", "SavoyDistributors", "SQUARE",
    "TarinEnterprise", "Tibbet", "TrustlinkDistribution", "Unilever", "WellGroup", "Z.H.Enterprise"
]


@dataclass
class ReceiptMetadata:
    source_path: str
    file_name: str
    target_file_name: str
    target_rel_path: str
    file_size_bytes: int
    file_hash: str
    is_duplicate: bool
    is_anomalous: bool
    duplicate_of: Optional[str]
    doc_type: str
    invoice_number: Optional[str]
    invoice_date_iso: Optional[str]
    invoice_date_formatted: Optional[str]
    supplier_name: Optional[str]
    invoice_total_bdt: Optional[float]
    status: str
    rotation_needed_degrees: int = 0
    ledger_matched: bool = False
    anomaly_reason: Optional[str] = None


def compute_sha256(file_path: Path) -> str:
    """Compute sha256 checksum of a file for exact deduplication."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def normalize_date_to_iso(date_str: str) -> tuple[Optional[str], Optional[str]]:
    """
    Normalizes variable date strings into (YYYY-MM-DD, DD_MM_YY).
    Handles DD_MM_YY, DD-MM-YY, YYYY-MM-DD, DD.MM.YYYY, etc.
    """
    parts = re.split(r"[\s/.\-_]+", date_str.strip())
    if len(parts) != 3:
        return None, None

    try:
        nums = [int(p) for p in parts]
    except ValueError:
        return None, None

    if nums[0] >= 1000:
        year, month, day = nums[0], nums[1], nums[2]
    elif nums[2] >= 1000:
        day, month, year = nums[0], nums[1], nums[2]
    else:
        day, month = nums[0], nums[1]
        year = 2000 + nums[2] if nums[2] < 70 else 1900 + nums[2]

    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None, None

    iso_date = f"{year:04d}-{month:02d}-{day:02d}"
    formatted_date = f"{day:02d}_{month:02d}_{str(year)[-2:]}"
    return iso_date, formatted_date


def sanitize_supplier_name(supplier: str) -> str:
    """Standardizes supplier strings to alphanumeric / safe filename tokens."""
    cleaned = re.sub(r"[^\w.&()-]", "", supplier.strip())
    return cleaned if cleaned else "UnknownSupplier"


def match_known_supplier(text: str) -> Optional[str]:
    """Matches raw text against known Lucky Store suppliers."""
    compact_text = re.sub(r"[\s._-]+", "", text).lower()
    for sup in KNOWN_SUPPLIERS:
        compact_sup = re.sub(r"[\s._-]+", "", sup).lower()
        if compact_sup in compact_text:
            return sup
    return None


def parse_companion_text_file(txt_path: Path) -> tuple[Optional[str], Optional[float]]:
    """Extracts supplier and total amount from companion OCR text file if present."""
    if not txt_path.is_file():
        return None, None

    try:
        content = txt_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None, None

    supplier = match_known_supplier(content)

    total = None
    tot_match = re.search(r"(?:total|grand total|মোট|taka|bdt)\D*(\d{2,7}(?:\.\d{1,2})?)", content, re.IGNORECASE)
    if tot_match:
        try:
            total = float(tot_match.group(1))
        except ValueError:
            pass

    return supplier, total


def detect_image_rotation(file_path: Path, check_all: bool = False) -> int:
    """
    Detects if an image needs rotation:
    1. Reads EXIF orientation tag.
    2. If landscape (receipts are portrait slips) or check_all is True, runs Tesseract OSD.
    Returns degrees clockwise to rotate to make upright: 0, 90, 180, or 270.
    """
    try:
        with Image.open(file_path) as img:
            w, h = img.size
            exif = img.getexif()
            orientation = exif.get(0x0112)

            exif_rot_needed = 0
            if orientation == 3:
                exif_rot_needed = 180
            elif orientation == 6:
                exif_rot_needed = 90
            elif orientation == 8:
                exif_rot_needed = 270

            # If landscape (receipts are almost always vertical slips) or check_all:
            # invoke Tesseract OSD for text orientation
            if w > h or check_all:
                try:
                    res = subprocess.run(
                        ["tesseract", str(file_path), "stdout", "--psm", "0"],
                        capture_output=True,
                        text=True,
                        timeout=5,
                    )
                    rot_match = re.search(r"Rotate:\s*(\d+)", res.stdout + res.stderr)
                    if rot_match:
                        osd_rot = int(rot_match.group(1))
                        if osd_rot in (90, 180, 270):
                            return osd_rot
                except Exception:
                    pass

            return exif_rot_needed
    except Exception:
        return 0


class ReceiptStandardizer:
    def __init__(
        self,
        source_dir: Path,
        target_dir: Path,
        preferred_ext: str = "jpeg",
        auto_rotate: bool = True,
        check_all_rotations: bool = False,
        expenses_csv_path: Optional[Path] = DEFAULT_EXPENSES_CSV,
        databricks_volume: str = "/Volumes/workspace/receipt_intelligence_dev/receipts_landing",
    ):
        self.source_dir = source_dir
        self.target_dir = target_dir
        self.preferred_ext = preferred_ext.lower().lstrip(".")
        self.auto_rotate = auto_rotate
        self.check_all_rotations = check_all_rotations
        self.expenses_csv_path = expenses_csv_path
        self.databricks_volume = databricks_volume

        self.items: list[ReceiptMetadata] = []
        self.hash_to_primary: dict[str, ReceiptMetadata] = {}
        self.stem_map: dict[str, list[Path]] = defaultdict(list)
        self.max_ls_sequence: int = 100

        # Ledger index mappings
        self.expenses_by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.expenses_by_inv: dict[str, dict[str, Any]] = {}
        self.expenses_date_assigned: dict[str, int] = defaultdict(int)

        self._load_expenses_ledger()

    def _load_expenses_ledger(self) -> None:
        """Loads Lucky Store financial expenses ledger to enrich vendor names & totals."""
        if not self.expenses_csv_path or not self.expenses_csv_path.is_file():
            print("[*] No expenses ledger found. Skipping ledger enrichment.")
            return

        try:
            with open(self.expenses_csv_path, encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if len(row) > 8 and row[7].startswith("LS"):
                        raw_date, vendor, _, raw_amount, _, _, _, inv_no, col10 = row[:9]
                        clean_inv = inv_no.strip().upper()
                        clean_vendor = sanitize_supplier_name(vendor)
                        amount_val = None
                        try:
                            amount_val = float(raw_amount.replace(",", "").strip())
                        except ValueError:
                            pass

                        date_parts = raw_date.strip().split("/")
                        iso_d = None
                        if len(date_parts) == 3:
                            iso_d = f"{date_parts[2]}-{date_parts[1].zfill(2)}-{date_parts[0].zfill(2)}"

                        entry = {
                            "invoice_number": clean_inv,
                            "vendor": clean_vendor,
                            "amount": amount_val,
                            "col10": col10.strip(),
                            "iso_date": iso_d,
                        }
                        self.expenses_by_inv[clean_inv] = entry
                        if iso_d:
                            self.expenses_by_date[iso_d].append(entry)

            print(f"[✓] Loaded {len(self.expenses_by_inv)} verified invoices from Financial Expenses ledger")
        except Exception as e:
            print(f"[!] Warning: Failed to load expenses ledger: {e}")

    def discover_receipt_directories(self) -> list[Path]:
        """Finds all receipt subdirectories in source_dir, correcting for typos."""
        candidates = []
        for p in sorted(self.source_dir.iterdir()):
            if p.is_dir() and re.search(r"rec[ie]+pts", p.name, re.IGNORECASE):
                candidates.append(p)
        return candidates

    def scan_and_profile(self) -> list[ReceiptMetadata]:
        """
        Profiles, deduplicates, auto-rotates, and standardizes all receipts.
        Ensures format conforms strictly to:
            LS<seq>-<DD_MM_YY>-<SupplierName>-<TotalBDT>BDT.jpeg
        """
        receipt_dirs = self.discover_receipt_directories()
        print(f"[*] Discovered {len(receipt_dirs)} receipt directories in {self.source_dir}")

        all_files: list[Path] = []
        for r_dir in receipt_dirs:
            for f in sorted(r_dir.iterdir()):
                if f.is_file() and not f.name.startswith("."):
                    all_files.append(f)
                    self.stem_map[f.stem].append(f)

        print(f"[*] Total files found: {len(all_files)}")

        # Find highest existing LS### sequence number
        for f in all_files:
            m = re.match(r"^LS(\d+)", f.name, re.IGNORECASE)
            if m:
                num = int(m.group(1))
                if num > self.max_ls_sequence:
                    self.max_ls_sequence = num

        print(f"[*] Highest existing LS invoice number: LS{self.max_ls_sequence}")

        results: list[ReceiptMetadata] = []
        next_seq = self.max_ls_sequence + 1

        for f in all_files:
            size_bytes = f.stat().st_size
            ext = f.suffix.lower().lstrip(".")

            # Check for non-image or anomalous artifacts
            if ext in ("txt", "webp", "ds_store") or ext not in ("jpg", "jpeg", "png"):
                file_hash = compute_sha256(f) if size_bytes > 0 else "empty_file"
                doc_type = "text_scrap" if ext == "txt" else ("sticker" if ext == "webp" else "other_anomalous")
                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=f"quarantine/{f.name}",
                    target_rel_path=f"quarantine/{f.name}",
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=False,
                    is_anomalous=True,
                    duplicate_of=None,
                    doc_type=doc_type,
                    invoice_number=None,
                    invoice_date_iso=None,
                    invoice_date_formatted=None,
                    supplier_name=None,
                    invoice_total_bdt=None,
                    status="quarantined",
                    rotation_needed_degrees=0,
                    ledger_matched=False,
                    anomaly_reason=f"Unsupported format: .{ext}",
                )
                results.append(item)
                continue

            file_hash = compute_sha256(f)

            # Check for exact content duplicate
            if file_hash in self.hash_to_primary:
                primary = self.hash_to_primary[file_hash]
                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=primary.target_file_name,
                    target_rel_path=primary.target_rel_path,
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=True,
                    is_anomalous=False,
                    duplicate_of=primary.source_path,
                    doc_type=primary.doc_type,
                    invoice_number=primary.invoice_number,
                    invoice_date_iso=primary.invoice_date_iso,
                    invoice_date_formatted=primary.invoice_date_formatted,
                    supplier_name=primary.supplier_name,
                    invoice_total_bdt=primary.invoice_total_bdt,
                    status="duplicate",
                    rotation_needed_degrees=0,
                    ledger_matched=primary.ledger_matched,
                    anomaly_reason="Exact SHA256 duplicate",
                )
                results.append(item)
                continue

            # Check for stem-pair duplicate where .jpeg & .jpg exist for same receipt
            is_stem_dup = False
            if len(self.stem_map[f.stem]) > 1:
                if ext == "jpg":
                    jpeg_sibling = f.with_suffix(".jpeg")
                    if jpeg_sibling.is_file() and jpeg_sibling in all_files:
                        is_stem_dup = True

            # Rotation check
            rot_deg = 0
            if self.auto_rotate and not is_stem_dup:
                rot_deg = detect_image_rotation(f, check_all=self.check_all_rotations)

            # Match 0: Recognized Daily Sales Summary
            daily_match = DAILY_SUMMARY_RE.match(f.name)
            if daily_match:
                inv_no = daily_match.group("prefix").upper()
                raw_date = daily_match.group("date")
                iso_date, fmt_date = normalize_date_to_iso(raw_date)
                year_month = iso_date[:7] if iso_date else "unknown-period"
                target_name = f"{inv_no}-{fmt_date or '01_01_26'}-DailySummary.{self.preferred_ext}"
                target_rel = f"{year_month}/{target_name}"

                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=target_name,
                    target_rel_path=target_rel,
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=is_stem_dup,
                    is_anomalous=False,
                    duplicate_of=str(f.with_suffix(".jpeg")) if is_stem_dup else None,
                    doc_type="daily_sales_summary",
                    invoice_number=inv_no,
                    invoice_date_iso=iso_date,
                    invoice_date_formatted=fmt_date,
                    supplier_name="DailySummary",
                    invoice_total_bdt=None,
                    status="duplicate" if is_stem_dup else "daily_summary",
                    rotation_needed_degrees=rot_deg,
                    ledger_matched=False,
                )
                if not is_stem_dup:
                    self.hash_to_primary[file_hash] = item
                results.append(item)
                continue

            # Match 1: Already canonical LS format
            canon_match = CANONICAL_RECEIPT_RE.match(f.name)
            if canon_match:
                inv_no = canon_match.group("prefix").upper()
                raw_date = canon_match.group("date")
                raw_sup = canon_match.group("supplier")
                raw_tot = canon_match.group("total")

                iso_date, fmt_date = normalize_date_to_iso(raw_date)
                sup_clean = sanitize_supplier_name(raw_sup)
                tot_val = float(raw_tot) if raw_tot else None

                # Cross-check against ledger
                ledger_hit = False
                if inv_no in self.expenses_by_inv:
                    leg_entry = self.expenses_by_inv[inv_no]
                    ledger_hit = True
                    if leg_entry.get("vendor"):
                        sup_clean = leg_entry["vendor"]
                    if leg_entry.get("amount") is not None:
                        tot_val = leg_entry["amount"]

                year_month = iso_date[:7] if iso_date else "unknown-period"
                target_name = f"{inv_no}-{fmt_date or '01_01_26'}-{sup_clean}-{int(tot_val) if tot_val else 0}BDT.{self.preferred_ext}"
                target_rel = f"{year_month}/{target_name}"

                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=target_name,
                    target_rel_path=target_rel,
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=is_stem_dup,
                    is_anomalous=False,
                    duplicate_of=str(f.with_suffix(".jpeg")) if is_stem_dup else None,
                    doc_type="purchase_invoice",
                    invoice_number=inv_no,
                    invoice_date_iso=iso_date,
                    invoice_date_formatted=fmt_date,
                    supplier_name=sup_clean,
                    invoice_total_bdt=tot_val,
                    status="duplicate" if is_stem_dup else "standardized",
                    rotation_needed_degrees=rot_deg,
                    ledger_matched=ledger_hit,
                )
                if not is_stem_dup:
                    self.hash_to_primary[file_hash] = item
                results.append(item)
                continue

            # Check for companion OCR text file
            txt_sibling = f.with_name(f"{f.stem}-text.txt")
            txt_sup, txt_tot = parse_companion_text_file(txt_sibling)

            # Match 2: Camera Photo format (0000####-PHOTO-YYYY-MM-DD-...)
            cam_match = CAMERA_PHOTO_RE.match(f.name)
            if cam_match:
                y = cam_match.group("year")
                m = cam_match.group("month")
                d = cam_match.group("day")
                iso_date = f"{y}-{m}-{d}"
                fmt_date = f"{d}_{m}_{y[-2:]}"
                year_month = f"{y}-{m}"

                # Ledger lookup by date
                ledger_hit = False
                inv_no = None
                sup_name = txt_sup
                tot_val = txt_tot

                if iso_date in self.expenses_by_date:
                    idx = self.expenses_date_assigned[iso_date]
                    entries = self.expenses_by_date[iso_date]
                    if idx < len(entries):
                        entry = entries[idx]
                        inv_no = entry["invoice_number"]
                        sup_name = entry["vendor"]
                        tot_val = entry["amount"]
                        self.expenses_date_assigned[iso_date] += 1
                        ledger_hit = True

                if not inv_no:
                    inv_no = f"LS{next_seq}"
                    next_seq += 1
                if not sup_name:
                    sup_name = "PendingSupplier"
                if tot_val is None:
                    tot_val = 0

                target_name = f"{inv_no}-{fmt_date}-{sup_name}-{int(tot_val)}BDT.{self.preferred_ext}"
                target_rel = f"{year_month}/{target_name}"

                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=target_name,
                    target_rel_path=target_rel,
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=is_stem_dup,
                    is_anomalous=False,
                    duplicate_of=str(f.with_suffix(".jpeg")) if is_stem_dup else None,
                    doc_type="purchase_invoice",
                    invoice_number=inv_no,
                    invoice_date_iso=iso_date,
                    invoice_date_formatted=fmt_date,
                    supplier_name=sup_name,
                    invoice_total_bdt=tot_val if tot_val > 0 else None,
                    status="duplicate" if is_stem_dup else ("standardized" if ledger_hit else "standardized_pending_ocr"),
                    rotation_needed_degrees=rot_deg,
                    ledger_matched=ledger_hit,
                )
                if not is_stem_dup:
                    self.hash_to_primary[file_hash] = item
                results.append(item)
                continue

            # Match 3: WhatsApp Image format (WhatsApp Image YYYY-MM-DD at ...)
            wa_match = WHATSAPP_PHOTO_RE.match(f.name)
            if wa_match:
                y = wa_match.group("year")
                m = wa_match.group("month")
                d = wa_match.group("day")
                iso_date = f"{y}-{m}-{d}"
                fmt_date = f"{d}_{m}_{y[-2:]}"
                year_month = f"{y}-{m}"

                # Ledger lookup by date
                ledger_hit = False
                inv_no = None
                sup_name = txt_sup
                tot_val = txt_tot

                if iso_date in self.expenses_by_date:
                    idx = self.expenses_date_assigned[iso_date]
                    entries = self.expenses_by_date[iso_date]
                    if idx < len(entries):
                        entry = entries[idx]
                        inv_no = entry["invoice_number"]
                        sup_name = entry["vendor"]
                        tot_val = entry["amount"]
                        self.expenses_date_assigned[iso_date] += 1
                        ledger_hit = True

                if not inv_no:
                    inv_no = f"LS{next_seq}"
                    next_seq += 1
                if not sup_name:
                    sup_name = "PendingSupplier"
                if tot_val is None:
                    tot_val = 0

                target_name = f"{inv_no}-{fmt_date}-{sup_name}-{int(tot_val)}BDT.{self.preferred_ext}"
                target_rel = f"{year_month}/{target_name}"

                item = ReceiptMetadata(
                    source_path=str(f),
                    file_name=f.name,
                    target_file_name=target_name,
                    target_rel_path=target_rel,
                    file_size_bytes=size_bytes,
                    file_hash=file_hash,
                    is_duplicate=is_stem_dup,
                    is_anomalous=False,
                    duplicate_of=str(f.with_suffix(".jpeg")) if is_stem_dup else None,
                    doc_type="purchase_invoice",
                    invoice_number=inv_no,
                    invoice_date_iso=iso_date,
                    invoice_date_formatted=fmt_date,
                    supplier_name=sup_name,
                    invoice_total_bdt=tot_val if tot_val > 0 else None,
                    status="duplicate" if is_stem_dup else ("standardized" if ledger_hit else "standardized_pending_ocr"),
                    rotation_needed_degrees=rot_deg,
                    ledger_matched=ledger_hit,
                )
                if not is_stem_dup:
                    self.hash_to_primary[file_hash] = item
                results.append(item)
                continue

            # Fallback for unrecognized image files
            inv_no = f"LS{next_seq}"
            next_seq += 1
            target_name = f"{inv_no}-01_01_26-Unclassified-0BDT.{self.preferred_ext}"
            target_rel = f"unclassified/{target_name}"
            item = ReceiptMetadata(
                source_path=str(f),
                file_name=f.name,
                target_file_name=target_name,
                target_rel_path=target_rel,
                file_size_bytes=size_bytes,
                file_hash=file_hash,
                is_duplicate=is_stem_dup,
                is_anomalous=False,
                duplicate_of=None,
                doc_type="purchase_invoice",
                invoice_number=inv_no,
                invoice_date_iso=None,
                invoice_date_formatted=None,
                supplier_name="Unclassified",
                invoice_total_bdt=None,
                status="needs_review",
                rotation_needed_degrees=rot_deg,
                ledger_matched=False,
                anomaly_reason="Unrecognized filename pattern",
            )
            if not is_stem_dup:
                self.hash_to_primary[file_hash] = item
            results.append(item)

        self.items = results
        return results

    def print_data_autocleaning_profile(self) -> None:
        """Prints a comprehensive Data Autocleaning quality report."""
        if not self.items:
            self.scan_and_profile()

        total = len(self.items)
        duplicates = sum(1 for i in self.items if i.is_duplicate)
        anomalous = sum(1 for i in self.items if i.is_anomalous)
        active_valid = total - duplicates - anomalous
        canon_named = sum(1 for i in self.items if i.status == "standardized" and not i.is_duplicate)
        daily_summaries = sum(1 for i in self.items if i.doc_type == "daily_sales_summary" and not i.is_duplicate)
        pending_ocr = sum(1 for i in self.items if "pending_ocr" in i.status)
        ledger_matched_count = sum(1 for i in self.items if i.ledger_matched and not i.is_duplicate)
        missing_total = sum(1 for i in self.items if i.invoice_total_bdt is None and not i.is_duplicate and not i.is_anomalous and i.doc_type != "daily_sales_summary")
        rot_count = sum(1 for i in self.items if i.rotation_needed_degrees > 0 and not i.is_duplicate)

        total_bytes = sum(i.file_size_bytes for i in self.items)
        unique_bytes = sum(i.file_size_bytes for i in self.items if not i.is_duplicate)
        saved_bytes = total_bytes - unique_bytes

        print("\n" + "=" * 75)
        print("📊 DATA AUTOCLEANING PROFILE & DATASET AUDIT REPORT")
        print("=" * 75)
        print(f"Standard Naming Format Target : LS<seq>-<DD_MM_YY>-<Supplier>-<Total>BDT.{self.preferred_ext}")
        print(f"Canonical Sample Match        : LS141-04_05_26-Haque&Sons-3076BDT.jpeg")
        print("-" * 75)
        print(f"Total Source Receipt Artifacts: {total}")
        print(f"├── Active Canonical Receipts : {active_valid} ({active_valid/total*100:.1f}%)")
        print(f"│   ├── Ledger Verified Match : {ledger_matched_count} (Cross-checked with Expenses.csv)")
        print(f"│   ├── Pre-standardized      : {canon_named}")
        print(f"│   ├── Daily Sales Summaries : {daily_summaries}")
        print(f"│   └── Standardized from raw : {pending_ocr}")
        print(f"├── Exact Duplicates Flagged  : {duplicates} ({duplicates/total*100:.1f}%)")
        print(f"└── Anomalous / Quarantined   : {anomalous} ({anomalous/total*100:.1f}%)")
        print("-" * 75)
        print(f"Orientation & Rotation Status:")
        print(f"├── Upright / Correct Angle   : {active_valid - rot_count}")
        print(f"└── Sideways / Rotated Slips  : {rot_count} (Auto-rotated to upright during processing)")
        print("-" * 75)
        print(f"Storage Footprint:")
        print(f"├── Total Raw Size            : {total_bytes / (1024*1024):.2f} MB")
        print(f"├── Deduplicated Size         : {unique_bytes / (1024*1024):.2f} MB")
        print(f"└── Redundant Space Reclaimed : {saved_bytes / (1024*1024):.2f} MB ({saved_bytes/total_bytes*100:.1f}%)")
        print("-" * 75)
        print(f"Data Completeness Metrics:")
        print(f"├── Normalized Invoice Dates  : {sum(1 for i in self.items if i.invoice_date_iso):>4} / {total} ({(sum(1 for i in self.items if i.invoice_date_iso)/total)*100:.1f}%)")
        print(f"├── Verified Supplier Names   : {sum(1 for i in self.items if i.supplier_name and i.supplier_name not in ('PendingSupplier', 'Unclassified')):>4} / {total}")
        print(f"└── Missing Total Amounts     : {missing_total:>4} (Pending Vision / OCR enrichment)")
        print("=" * 75 + "\n")

    def export_manifest(self, output_dir: Optional[Path] = None) -> tuple[Path, Path]:
        """Exports JSON and CSV catalog manifests of all processed receipts."""
        out_path = output_dir or self.target_dir
        out_path.mkdir(parents=True, exist_ok=True)

        json_path = out_path / "receipts_manifest.json"
        csv_path = out_path / "receipts_manifest.csv"

        data = [asdict(i) for i in self.items]

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        if data:
            keys = list(data[0].keys())
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(data)

        print(f"[✓] Manifest written: {json_path}")
        print(f"[✓] CSV catalog written: {csv_path}")
        return json_path, csv_path

    def apply_standardization(self, dry_run: bool = True) -> dict[str, int]:
        """
        Executes file standardization, auto-rotation, and deduplication.
        In dry_run mode, simulates operations and reports counts.
        """
        if not self.items:
            self.scan_and_profile()

        stats = {"copied": 0, "rotated": 0, "skipped_duplicates": 0, "quarantined": 0}

        if dry_run:
            print("\n[DRY-RUN] Simulating receipt standardization...")
            for i in self.items[:15]:
                rot_str = f" [ROTATE {i.rotation_needed_degrees}°]" if i.rotation_needed_degrees else ""
                leg_str = " [LEDGER-MATCH]" if i.ledger_matched else ""
                action = "SKIP (DUPLICATE)" if i.is_duplicate else ("QUARANTINE" if i.is_anomalous else f"STANDARDIZE{rot_str}{leg_str}")
                print(f"  [{action}] {Path(i.source_path).name} -> {i.target_rel_path}")
            if len(self.items) > 15:
                print(f"  ... and {len(self.items) - 15} more files.")
            return stats

        print(f"\n[*] Applying standardization to target directory: {self.target_dir}")
        self.target_dir.mkdir(parents=True, exist_ok=True)

        for item in self.items:
            if item.is_duplicate:
                stats["skipped_duplicates"] += 1
                continue

            src = Path(item.source_path)
            dest = self.target_dir / item.target_rel_path
            dest.parent.mkdir(parents=True, exist_ok=True)

            if item.is_anomalous:
                shutil.copy2(src, dest)
                stats["quarantined"] += 1
                continue

            # Process image: rotate if needed or convert to preferred format
            needs_rotation = self.auto_rotate and (item.rotation_needed_degrees > 0)
            needs_conversion = not src.name.lower().endswith(f".{self.preferred_ext}")

            if needs_rotation or needs_conversion:
                try:
                    with Image.open(src) as img:
                        img = ImageOps.exif_transpose(img)
                        if item.rotation_needed_degrees in (90, 180, 270):
                            # Rotate clockwise: Pillow's rotate rotates CCW, so pass negative angle
                            img = img.rotate(-item.rotation_needed_degrees, expand=True)
                            stats["rotated"] += 1

                        if img.mode != "RGB":
                            img = img.convert("RGB")

                        img.save(dest, format="JPEG", quality=95)
                        stats["copied"] += 1
                except Exception as e:
                    print(f"  [!] Fallback copy for {src.name} due to image process error: {e}")
                    shutil.copy2(src, dest)
                    stats["copied"] += 1
            else:
                shutil.copy2(src, dest)
                stats["copied"] += 1

        print(f"[✓] Standardization complete:")
        print(f"    - Standardized receipts written : {stats['copied']}")
        print(f"    - Images auto-rotated upright   : {stats['rotated']}")
        print(f"    - Duplicate files suppressed    : {stats['skipped_duplicates']}")
        print(f"    - Anomalous files quarantined  : {stats['quarantined']}")
        return stats

    def discover_databricks_assets(self) -> None:
        """
        Queries Unity Catalog to discover catalogs, schemas, warehouses,
        and receipt landing volumes using databricks-python-sdk.
        """
        if not DATABRICKS_SDK_AVAILABLE:
            print("[!] Error: databricks-sdk is not installed. Run: pip install databricks-sdk", file=sys.stderr)
            return

        print("\n🔍 DATABRICKS UNITY CATALOG & COMPUTE DISCOVERY")
        print("=" * 70)
        client = WorkspaceClient()

        # 1. Warehouses
        print("\nCompute Warehouses:")
        for wh in client.warehouses.list():
            print(f"  - {wh.name} (ID: {wh.id}, State: {wh.state}, Size: {wh.cluster_size})")

        # 2. Catalogs & Schemas
        print("\nUnity Catalog Catalogs & Schemas:")
        for cat in client.catalogs.list():
            try:
                schemas = [s.name for s in client.schemas.list(catalog_name=cat.name)]
                print(f"  Catalog [{cat.name}]: {', '.join(schemas)}")
            except Exception as e:
                print(f"  Catalog [{cat.name}]: (Error: {e})")

        # 3. Volumes in target workspace schema
        catalog_part = "workspace"
        schema_part = "default"
        print(f"\nVolumes in {catalog_part}.{schema_part}:")
        try:
            volumes = list(client.volumes.list(catalog_name=catalog_part, schema_name=schema_part))
            if volumes:
                for v in volumes:
                    print(f"  - {v.name} ({v.volume_type}) path: /Volumes/{catalog_part}/{schema_part}/{v.name}")
            else:
                print("  (No volumes found)")
        except Exception as e:
            print(f"  Error reading volumes: {e}")

        print("=" * 70 + "\n")

    def sync_to_databricks_volume(self, volume_path: Optional[str] = None) -> None:
        """
        Uploads standardized receipts to a Databricks Unity Catalog Volume
        using the Databricks Python SDK (WorkspaceClient).
        """
        if not DATABRICKS_SDK_AVAILABLE:
            print("[!] Error: databricks-sdk is not installed. Run: pip install databricks-sdk", file=sys.stderr)
            return

        target_vol = volume_path or self.databricks_volume
        parts = target_vol.strip("/").split("/")
        if len(parts) < 4 or parts[0] != "Volumes":
            print(f"[!] Error: Invalid volume path '{target_vol}'. Format must be /Volumes/<catalog>/<schema>/<volume_name>", file=sys.stderr)
            return

        _, catalog, schema, volume_name = parts[:4]

        print(f"\n🚀 Syncing standardized receipts to Databricks Volume: {target_vol}")
        client = WorkspaceClient()

        # Verify or create volume
        try:
            client.volumes.read(full_name_arg=f"{catalog}.{schema}.{volume_name}")
            print(f"[✓] Verified Unity Catalog volume {catalog}.{schema}.{volume_name}")
        except Exception:
            print(f"[*] Volume {catalog}.{schema}.{volume_name} does not exist. Creating managed volume...")
            try:
                client.volumes.create(
                    catalog_name=catalog,
                    schema_name=schema,
                    name=volume_name,
                    volume_type=VolumeType.MANAGED,
                    comment="Landing volume for Lucky Store standardized receipt intelligence",
                )
                print(f"[✓] Created volume: {catalog}.{schema}.{volume_name}")
            except Exception as e:
                print(f"[!] Could not create volume automatically: {e}. Attempting upload to path...", file=sys.stderr)

        # Upload non-duplicate, non-anomalous receipts
        active_items = [i for i in self.items if not i.is_duplicate and not i.is_anomalous]
        print(f"[*] Uploading {len(active_items)} standardized receipts to {target_vol}...")

        uploaded = 0
        failed = 0
        for idx, item in enumerate(active_items, 1):
            std_file = self.target_dir / item.target_rel_path
            local_file = std_file if std_file.is_file() else Path(item.source_path)
            dest_vol_path = f"{target_vol.rstrip('/')}/{item.target_rel_path}"

            try:
                with open(local_file, "rb") as f_obj:
                    client.files.upload(
                        file_path=dest_vol_path,
                        contents=f_obj,
                        overwrite=True,
                    )
                uploaded += 1
                if idx % 25 == 0 or idx == len(active_items):
                    print(f"  [Progress] {idx}/{len(active_items)} uploaded...")
            except Exception as e:
                failed += 1
                print(f"  [!] Failed to upload {item.file_name}: {e}")

        print(f"[✓] Databricks sync complete: {uploaded} uploaded successfully, {failed} failed.")


def main():
    parser = argparse.ArgumentParser(
        description="Lucky Store Receipt Standardization, Rotation & Databricks Sync Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=REPO_ROOT / "data",
        help="Root data directory containing receipt folders (default: repo data/)",
    )
    parser.add_argument(
        "--target-dir",
        type=Path,
        default=REPO_ROOT / "data" / "standardized_receipts",
        help="Target directory for standardized receipts (default: data/standardized_receipts)",
    )
    parser.add_argument(
        "--prefer-ext",
        type=str,
        default="jpeg",
        choices=["jpeg", "jpg", "png"],
        help="Preferred image extension for standardized files (default: jpeg)",
    )
    parser.add_argument(
        "--auto-rotate",
        action="store_true",
        default=True,
        help="Automatically detect orientation and rotate sideways receipts upright (default: True)",
    )
    parser.add_argument(
        "--no-rotate",
        action="store_false",
        dest="auto_rotate",
        help="Disable automatic rotation",
    )
    parser.add_argument(
        "--check-all-rotations",
        action="store_true",
        help="Run Tesseract OSD on all images, not only landscape images",
    )
    parser.add_argument(
        "--expenses-csv",
        type=Path,
        default=DEFAULT_EXPENSES_CSV,
        help="Path to Financial Records Expenses.csv ledger",
    )
    parser.add_argument(
        "--profile",
        action="store_true",
        help="Display Data Autocleaning profiling and anomaly report",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply standardization and rotation to disk (default is dry-run simulation)",
    )
    parser.add_argument(
        "--export-manifest",
        action="store_true",
        help="Generate JSON and CSV manifests of all receipts",
    )
    parser.add_argument(
        "--discover-databricks",
        action="store_true",
        help="Discover Databricks Unity Catalog resources and compute warehouses",
    )
    parser.add_argument(
        "--sync-databricks",
        action="store_true",
        help="Sync standardized receipts to Databricks Unity Catalog volume",
    )
    parser.add_argument(
        "--databricks-volume",
        type=str,
        default="/Volumes/workspace/receipt_intelligence_dev/receipts_landing",
        help="Target Databricks volume path (default: /Volumes/workspace/receipt_intelligence_dev/receipts_landing)",
    )

    args = parser.parse_args()

    standardizer = ReceiptStandardizer(
        source_dir=args.source_dir,
        target_dir=args.target_dir,
        preferred_ext=args.prefer_ext,
        auto_rotate=args.auto_rotate,
        check_all_rotations=args.check_all_rotations,
        expenses_csv_path=args.expenses_csv,
        databricks_volume=args.databricks_volume,
    )

    # Discovery command
    if args.discover_databricks:
        standardizer.discover_databricks_assets()
        if not (args.profile or args.apply or args.sync_databricks or args.export_manifest):
            return

    # Scan and profile
    standardizer.scan_and_profile()

    # Profile report
    if args.profile or (not args.apply and not args.sync_databricks and not args.export_manifest):
        standardizer.print_data_autocleaning_profile()

    # Apply or Dry-Run
    dry_run = not args.apply
    standardizer.apply_standardization(dry_run=dry_run)

    # Manifest export
    if args.export_manifest or args.apply:
        standardizer.export_manifest()

    # Databricks sync
    if args.sync_databricks:
        standardizer.sync_to_databricks_volume()


if __name__ == "__main__":
    main()
