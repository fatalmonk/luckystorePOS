"""Validation and loss-aware adapters for CatalogImportBatchV1."""

from __future__ import annotations

import json
import math
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator, FormatChecker


SCHEMA_PATH = Path(__file__).resolve().parents[2] / "data/catalog/contracts/catalog-import-v1.schema.json"
TEMPLATE_PATH = Path(__file__).resolve().parents[2] / "data/catalog/templates/catalog-import-v1.csv"
ADMIN_COLUMNS = {
    "Product Name": ("name", "product"),
    "Sales Price (৳)": ("price", "product"),
    "Purchase Price (৳)": ("cost", "product"),
    "Item Code (SKU)": ("sku", "product"),
    "Barcode": ("barcode", "product"),
    "Image URL": ("image_url", "image"),
    "Category": ("category", "product"),
}
OPERATIONAL_COLUMNS = {
    "name": ("name", "product"), "Name": ("name", "product"),
    "title": ("name", "product"), "Title": ("name", "product"),
    "sku": ("sku", "product"), "SKU": ("sku", "product"), "id": ("sku", "product"), "ID": ("sku", "product"),
    "barcode": ("barcode", "product"), "Barcode": ("barcode", "product"),
    "gtin": ("barcode", "product"), "GTIN": ("barcode", "product"), "EAN": ("barcode", "product"),
    "brand": ("brand", "product"), "Brand": ("brand", "product"),
    "category": ("category", "product"), "Category": ("category", "product"),
    "google_product_category": ("category", "product"),
    "cost": ("cost", "product"), "Cost": ("cost", "product"),
    "price": ("price", "product"), "Price": ("price", "product"),
    "mrp": ("mrp", "product"), "MRP": ("mrp", "product"),
    "is_active": ("is_active", "product"), "active": ("is_active", "product"),
    "stock_qty": ("stock_qty", "stock"), "Stock Qty": ("stock_qty", "stock"),
    "quantity": ("stock_qty", "stock"), "Quantity": ("stock_qty", "stock"),
    "image_url": ("image_url", "image"), "imageUrl": ("image_url", "image"),
    "image_link": ("image_url", "image"), "Image URL": ("image_url", "image"),
}


def _schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _number(value: Any) -> Any:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, bool):
        return value
    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return value
    if not number.is_finite():
        return value
    if number == number.to_integral_value():
        return int(number)
    converted = float(number)
    return converted if math.isfinite(converted) else value


def _blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def adapt_legacy_row(source_format: str, source: dict[str, Any], source_row: int) -> dict[str, Any]:
    """Map supported legacy columns while returning every unsupported value explicitly."""
    if source_format == "admin_template":
        columns = ADMIN_COLUMNS
    elif source_format == "operational":
        columns = OPERATIONAL_COLUMNS
    else:
        raise ValueError(f"unsupported source format: {source_format}")

    product: dict[str, Any] = {}
    stock: dict[str, Any] = {"mode": "none"}
    image: dict[str, Any] | None = None
    consumed: set[str] = set()
    for column, (field, target) in columns.items():
        if column not in source or column in consumed:
            continue
        consumed.add(column)
        value = source[column]
        if target == "product":
            if field in {"cost", "price", "mrp"}:
                value = _number(value)
            elif field == "is_active" and isinstance(value, str):
                normalized = value.strip().casefold()
                if normalized in {"true", "1", "yes", "active"}:
                    value = True
                elif normalized in {"false", "0", "no", "inactive"}:
                    value = False
            if not _blank(value):
                product[field] = value
        elif target == "stock":
            if not _blank(value):
                quantity = _number(value)
                if quantity is not None:
                    stock = {"mode": "set", "quantity": quantity}
        elif target == "image" and not _blank(value):
            image = {"kind": "url", "url": value}

    row: dict[str, Any] = {"source_row": source_row, "product": product, "stock": stock}
    if image is not None:
        row["image"] = image
    unsupported = [
        {"source_column": key, "value": value}
        for key, value in sorted(source.items())
        if key not in consumed and not _blank(value)
    ]
    return {"row": row, "source_values": dict(source), "unsupported_fields": unsupported}


def _safe_image_url(url: str) -> bool:
    try:
        parsed = urlsplit(url)
        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and parsed.username is None
            and parsed.password is None
            and parsed.port in (None, 443)
            and not parsed.query
            and not parsed.fragment
        )
    except ValueError:
        return False


def _validate_asset_path(path: str) -> bool:
    pure = PurePosixPath(path)
    return (
        path.startswith("data/catalog/images/")
        and "\\" not in path
        and "?" not in path
        and "#" not in path
        and not pure.is_absolute()
        and pure.as_posix() == path
        and all(part not in {"", ".", ".."} for part in pure.parts)
        and all(ord(char) >= 32 and ord(char) != 127 for char in path)
    )


def validate_batch(
    batch: dict[str, Any],
    *,
    catalog_rows: list[dict[str, Any]] | None = None,
    tenant_id: str | None = None,
) -> list[str]:
    """Return deterministic structural and tenant-scoped identifier errors.

    `tenant_id` is trusted caller context and is never read from the batch.
    This helper does not authorize writes or resolve store membership.
    """
    validator = Draft202012Validator(_schema(), format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(batch), key=lambda error: (list(error.absolute_path), error.message))
    messages = [f"{'.'.join(map(str, error.absolute_path))}: {error.message}" for error in errors]
    if errors:
        return messages

    seen: dict[str, dict[str, int]] = {"sku": {}, "barcode": {}}
    for index, row in enumerate(batch["rows"]):
        for field in seen:
            value = row["product"].get(field)
            if value is None or value == "":
                continue
            if value in seen[field]:
                messages.append(f"rows[{index}].product.{field}: duplicate {field} in batch (row {seen[field][value]})")
            else:
                seen[field][value] = row["source_row"]
        image = row.get("image")
        if image and image["kind"] == "url" and not _safe_image_url(image["url"]):
            messages.append(f"rows[{index}].image.url: unsafe or malformed HTTPS image URL")
        if image and image["kind"] == "asset" and not _validate_asset_path(image["path"]):
            messages.append(f"rows[{index}].image.path: asset must be inside data/catalog/images without traversal")

    if catalog_rows is not None and tenant_id is not None:
        for index, row in enumerate(batch["rows"]):
            matches_by_field: dict[str, list[dict[str, Any]]] = {}
            for field in ("sku", "barcode"):
                value = row["product"].get(field)
                if value:
                    matches_by_field[field] = [
                        current for current in catalog_rows
                        if current.get("tenant_id") == tenant_id and current.get(field) == value
                    ]
                    if len(matches_by_field[field]) > 1:
                        messages.append(f"rows[{index}].product.{field}: ambiguous {field} in authenticated tenant")
            sku_matches = matches_by_field.get("sku", [])
            barcode_matches = matches_by_field.get("barcode", [])
            if sku_matches and barcode_matches and sku_matches[0].get("id") != barcode_matches[0].get("id"):
                messages.append(f"rows[{index}].product: sku and barcode identify different items")

    return sorted(set(messages))
