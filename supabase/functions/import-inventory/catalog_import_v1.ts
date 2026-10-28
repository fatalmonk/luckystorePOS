import { validateCatalogImageFile, type CatalogImageFile } from "./catalog_image_ingest.ts";

export type CatalogActor = {
  id: string;
  tenant_id: string;
  store_id: string | null;
  role: string;
};

export type CatalogBatchRow = {
  source_row: number;
  product: {
    sku: string;
    barcode?: string | null;
    name: string;
    brand?: string | null;
    category?: string | null;
    cost?: number | null;
    price?: number | null;
    mrp?: number | null;
    is_active?: boolean;
  };
  stock: { mode: "none" } | { mode: "set" | "delta"; quantity: number };
  image?: { kind: "url"; url: string } | { kind: "asset"; path: string; sha256: string };
};

export type CatalogImportBatch = {
  contract_version: 1;
  batch_id: string;
  source: string;
  requested_store_id?: string;
  rows: CatalogBatchRow[];
};

export type CatalogItemSnapshot = {
  id: string;
  tenant_id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  category_id: string | null;
  cost: number | null;
  price: number | null;
  mrp?: number | null;
  is_active?: boolean;
  image_url?: string | null;
  image_key?: string | null;
  image_version?: number | null;
};

export type CatalogSnapshot = {
  items: CatalogItemSnapshot[];
  categories: Array<{ id: string; tenant_id: string; name: string }>;
  stores: Array<{ id: string; tenant_id: string }>;
  stock: Array<{ store_id: string; item_id: string; qty: number }>;
};

export type PreviewRow = {
  source_row: number;
  item_id?: string;
  expected_item_snapshot?: Record<string, unknown>;
  item_version?: number | null;
  item_image_url?: string | null;
  expected_stock_qty?: number;
  outcome: "create" | "update" | "unchanged" | "ambiguous" | "invalid";
  field_diffs: Record<string, { before: unknown; after: unknown }>;
  warnings: string[];
  errors: string[];
};

export type ImportResult = {
  batch_id: string;
  preview_hash: string;
  counts: { create: number; update: number; unchanged: number; ambiguous: number; invalid: number };
  rows: PreviewRow[];
};

export type CatalogImportRepository = {
  readSnapshot(batch: CatalogImportBatch, actor: CatalogActor, storeId: string | null): Promise<CatalogSnapshot>;
  loadExistingBatch(actor: CatalogActor, idempotencyKey: string): Promise<{ batch_id: string; input_hash: string; preview_hash: string; preview_rows: PreviewRow[] } | null>;
  applyBatch(batch: CatalogImportBatch, actor: CatalogActor, storeId: string | null, idempotencyKey: string, inputHash: string, previewHash: string, previewRows: PreviewRow[], attachments?: Array<CatalogImageFile & { source_row: number }>): Promise<PreviewRow[]>;
};

export type CatalogImportOperation = {
  operation: "preview" | "apply";
  batch: CatalogImportBatch;
  idempotency_key?: string;
  approved_preview_hash?: string;
  attachments?: Array<CatalogImageFile & { source_row: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function safeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 0 && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

function validAssetPath(path: string): boolean {
  return path.startsWith("data/catalog/images/") && !path.includes("\\") && !path.includes("?") && !path.includes("#") &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

export function validateCatalogImportBatch(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["batch must be an object"];
  if (!exactKeys(value, ["contract_version", "batch_id", "source", "requested_store_id", "rows"])) errors.push("batch has unsupported fields");
  if (value.contract_version !== 1) errors.push("contract_version must be 1");
  if (typeof value.batch_id !== "string" || !value.batch_id.trim()) errors.push("batch_id is required");
  if (typeof value.source !== "string" || !value.source.trim()) errors.push("source is required");
  if (value.requested_store_id !== undefined && (typeof value.requested_store_id !== "string" || !value.requested_store_id.trim())) errors.push("requested_store_id must be a non-empty string");
  if (!Array.isArray(value.rows) || value.rows.length === 0) return [...errors, "rows must be a non-empty array"];

  const sourceRows = new Set<number>();
  const seenSkus = new Set<string>();
  const seenBarcodes = new Set<string>();
  value.rows.forEach((row: unknown, index: number) => {
    const prefix = `rows[${index}]`;
    if (!isRecord(row) || !exactKeys(row, ["source_row", "product", "stock", "image"])) {
      errors.push(`${prefix} must contain only source_row, product, stock, and image`);
      return;
    }
    if (!Number.isInteger(row.source_row) || Number(row.source_row) < 1) errors.push(`${prefix}.source_row must be a positive integer`);
    else if (sourceRows.has(Number(row.source_row))) errors.push(`${prefix}.source_row is duplicated`);
    else sourceRows.add(Number(row.source_row));

    const product = row.product;
    if (!isRecord(product) || !exactKeys(product, ["sku", "barcode", "name", "brand", "category", "cost", "price", "mrp", "is_active"])) {
      errors.push(`${prefix}.product has unsupported fields or is missing`);
    } else {
      if (typeof product.sku !== "string" || !product.sku.trim()) errors.push(`${prefix}.product.sku is required`);
      else if (seenSkus.has(product.sku)) errors.push(`${prefix}.product.sku is duplicated in this tenant batch`);
      else seenSkus.add(product.sku);
      if (typeof product.name !== "string" || !product.name.trim()) errors.push(`${prefix}.product.name is required`);
      if (product.barcode !== undefined && product.barcode !== null && typeof product.barcode !== "string") errors.push(`${prefix}.product.barcode must be a string or null`);
      if (typeof product.barcode === "string" && product.barcode !== "") {
        if (seenBarcodes.has(product.barcode)) errors.push(`${prefix}.product.barcode is duplicated in this tenant batch`);
        else seenBarcodes.add(product.barcode);
      }
      for (const key of ["brand", "category"] as const) {
        if (product[key] !== undefined && product[key] !== null && typeof product[key] !== "string") errors.push(`${prefix}.product.${key} must be a string or null`);
      }
      for (const key of ["cost", "price", "mrp"] as const) {
        const number = product[key];
        if (number !== undefined && number !== null && (typeof number !== "number" || !Number.isFinite(number) || number < 0)) errors.push(`${prefix}.product.${key} must be a non-negative number or null`);
      }
      if (product.is_active !== undefined && typeof product.is_active !== "boolean") errors.push(`${prefix}.product.is_active must be boolean`);
    }

    const stock = row.stock;
    if (!isRecord(stock) || !exactKeys(stock, ["mode", "quantity"])) errors.push(`${prefix}.stock has unsupported fields or is missing`);
    else if (stock.mode === "none") {
      if ("quantity" in stock) errors.push(`${prefix}.stock none mode must not include quantity`);
    } else if (stock.mode === "set" || stock.mode === "delta") {
      if (!Number.isInteger(stock.quantity) || !Number.isFinite(stock.quantity)) errors.push(`${prefix}.stock.quantity must be an integer`);
      else if (stock.mode === "set" && Number(stock.quantity) < 0) errors.push(`${prefix}.stock.quantity set must be non-negative`);
    } else errors.push(`${prefix}.stock.mode must be none, set, or delta`);

    if (row.image !== undefined) {
      const image = row.image;
      if (!isRecord(image)) errors.push(`${prefix}.image must be an object`);
      else if (image.kind === "url") {
        if (!exactKeys(image, ["kind", "url"]) || typeof image.url !== "string" || !safeImageUrl(image.url)) errors.push(`${prefix}.image.url must be a safe HTTPS URL without credentials, query, or fragment`);
      } else if (image.kind === "asset") {
        if (!exactKeys(image, ["kind", "path", "sha256"]) || typeof image.path !== "string" || !validAssetPath(image.path) || typeof image.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(image.sha256)) errors.push(`${prefix}.image asset requires a catalog image path and SHA-256`);
      } else errors.push(`${prefix}.image.kind must be url or asset`);
    }
  });
  return errors;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

async function hashPreview(batch: CatalogImportBatch, rows: PreviewRow[], attachments: Array<CatalogImageFile & { source_row: number }> = []): Promise<string> {
  const attachmentHashes = await Promise.all(attachments.map(async (file) => {
    try { return { source_row: file.source_row, checksum: await validateCatalogImageFile(file) }; }
    catch (error) { return { source_row: file.source_row, invalid: error instanceof Error ? error.message : "invalid" }; }
  }));
  const bytes = new TextEncoder().encode(stable({ batch, rows, attachments: attachmentHashes.sort((a, b) => a.source_row - b.source_row) }));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashBatch(batch: CatalogImportBatch): Promise<string> {
  const bytes = new TextEncoder().encode(stable(batch));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rowPreview(batchRow: CatalogBatchRow, snapshot: CatalogSnapshot, storeId: string | null, tenantId: string): PreviewRow {
  const { product, stock } = batchRow;
  const bySku = product.sku ? snapshot.items.filter((item) => item.tenant_id === tenantId && item.sku === product.sku) : [];
  const byBarcode = product.barcode ? snapshot.items.filter((item) => item.tenant_id === tenantId && item.barcode === product.barcode) : [];
  const ambiguous = bySku.length > 1 || byBarcode.length > 1 || (bySku[0] && byBarcode[0] && bySku[0].id !== byBarcode[0].id);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (ambiguous) errors.push("SKU/barcode matches are ambiguous or identify different items");
  const item = bySku[0] ?? byBarcode[0];
  const category = product.category ? snapshot.categories.find((candidate) => candidate.tenant_id === tenantId && candidate.name === product.category) : undefined;
  if (product.category && !category) errors.push("Category does not exist in the authenticated tenant");
  const storeAllowed = storeId === null || snapshot.stores.some((store) => store.id === storeId && store.tenant_id === tenantId);
  if (stock.mode !== "none" && (!storeId || !storeAllowed)) errors.push("Stock intent requires a verified tenant-owned store");
  if (batchRow.image?.kind === "asset") warnings.push("Local image assets require the image publication step before apply");
  const expectedItemSnapshot = item ? {
    id: item.id, sku: item.sku, barcode: item.barcode, name: item.name, brand: item.brand,
    category_id: item.category_id, cost: item.cost, price: item.price, mrp: item.mrp ?? null,
    is_active: item.is_active ?? null, image_url: item.image_url ?? null, image_key: item.image_key ?? null, image_version: item.image_version ?? null,
  } : undefined;
  if (errors.length) return { source_row: batchRow.source_row, ...(item ? { item_id: item.id, expected_item_snapshot: expectedItemSnapshot, item_version: item.image_version ?? null, item_image_url: item.image_url ?? null } : {}), outcome: ambiguous ? "ambiguous" : "invalid", field_diffs: {}, warnings, errors };
  const proposed: Record<string, unknown> = {
    name: product.name,
    sku: product.sku,
    ...(product.barcode !== undefined ? { barcode: product.barcode } : {}),
    ...(product.brand !== undefined ? { brand: product.brand } : {}),
    ...(product.category !== undefined ? { category_id: category?.id ?? null } : {}),
    ...(product.cost !== undefined ? { cost: product.cost } : {}),
    ...(product.price !== undefined ? { price: product.price } : {}),
    ...(product.mrp !== undefined ? { mrp: product.mrp } : {}),
    ...(product.is_active !== undefined ? { is_active: product.is_active } : {}),
    ...(batchRow.image?.kind === "url" ? { image_url: batchRow.image.url } : {}),
  };
  const fieldDiffs: Record<string, { before: unknown; after: unknown }> = {};
  if (item) {
    for (const [field, after] of Object.entries(proposed)) {
      const before = field === "category_id" ? item.category_id : (item as unknown as Record<string, unknown>)[field];
      if (before !== after) fieldDiffs[field] = { before, after };
    }
  }
  const stockKey = storeId && item ? snapshot.stock.find((entry) => entry.store_id === storeId && entry.item_id === item.id)?.qty ?? 0 : null;
  if (stock.mode === "set" && stockKey !== null && stock.quantity !== stockKey) fieldDiffs.stock = { before: stockKey, after: stock.quantity };
  if (stock.mode === "delta" && stock.quantity !== 0) fieldDiffs.stock = { before: stockKey, after: stockKey === null ? null : stockKey + stock.quantity };
  const outcome = !item ? "create" : Object.keys(fieldDiffs).length ? "update" : "unchanged";
  return { source_row: batchRow.source_row, ...(item ? { item_id: item.id, expected_item_snapshot: expectedItemSnapshot, item_version: item.image_version ?? null, item_image_url: item.image_url ?? null } : {}), ...(stock.mode !== "none" ? { expected_stock_qty: stockKey ?? 0 } : {}), outcome, field_diffs: fieldDiffs, warnings, errors };
}

function counts(rows: PreviewRow[]): ImportResult["counts"] {
  return {
    create: rows.filter((row) => row.outcome === "create").length,
    update: rows.filter((row) => row.outcome === "update").length,
    unchanged: rows.filter((row) => row.outcome === "unchanged").length,
    ambiguous: rows.filter((row) => row.outcome === "ambiguous").length,
    invalid: rows.filter((row) => row.outcome === "invalid").length,
  };
}

export async function runCatalogImportOperation(
  operation: CatalogImportOperation,
  actor: CatalogActor,
  repository: CatalogImportRepository,
): Promise<ImportResult> {
  const validationErrors = validateCatalogImportBatch(operation.batch);
  if (validationErrors.length) {
    const rows = operation.batch && Array.isArray(operation.batch.rows)
      ? operation.batch.rows.map((row) => ({ source_row: row.source_row, outcome: "invalid" as const, field_diffs: {}, warnings: [], errors: validationErrors.filter((error) => error.startsWith(`rows[${operation.batch.rows.indexOf(row)}]`)) }))
      : [];
    return { batch_id: operation.batch?.batch_id ?? "", preview_hash: "", counts: counts(rows), rows };
  }
  if (operation.operation !== "preview" && operation.operation !== "apply") throw new Error("operation must be preview or apply");
  const batch = operation.batch;
  const attachmentRows = new Set<number>();
  const attachmentErrors = new Map<number, string>();
  for (const file of operation.attachments ?? []) {
    if (attachmentRows.has(file.source_row)) attachmentErrors.set(file.source_row, "Only one image attachment is allowed per source row");
    attachmentRows.add(file.source_row);
    if (!batch.rows.some((row) => row.source_row === file.source_row)) attachmentErrors.set(file.source_row, "Image attachment source_row is not present in the batch");
    try { await validateCatalogImageFile(file); } catch (error) {
      attachmentErrors.set(file.source_row, error instanceof Error ? error.message : "Invalid image attachment");
    }
    if (batch.rows.find((row) => row.source_row === file.source_row)?.image) attachmentErrors.set(file.source_row, "A row cannot contain both an image URL and an image attachment");
  }
  const stockNeeded = batch.rows.some((row) => row.stock.mode !== "none");
  const storeRequired = stockNeeded || (operation.attachments?.length ?? 0) > 0;
  const storeId = batch.requested_store_id ?? actor.store_id;
  if ((operation.attachments?.length ?? 0) > 0 && !storeId) {
    for (const file of operation.attachments ?? []) attachmentErrors.set(file.source_row, "Image publication requires a selected tenant store");
  }
  if (storeId && actor.store_id && actor.store_id !== storeId && (operation.attachments?.length ?? 0) > 0) {
    for (const file of operation.attachments ?? []) attachmentErrors.set(file.source_row, "Requested store is outside the authenticated user's store scope");
  }
  if (storeId && actor.store_id && actor.store_id !== storeId) {
    const rows = batch.rows.map((row) => ({ source_row: row.source_row, outcome: "invalid" as const, field_diffs: {}, warnings: [], errors: ["Requested store is outside the authenticated user's store scope"] }));
    return { batch_id: batch.batch_id, preview_hash: await hashPreview(batch, rows, operation.attachments), counts: counts(rows), rows };
  }
  const inputHash = await hashBatch(batch);
  if (operation.operation === "apply" && !operation.idempotency_key?.trim()) throw new Error("idempotency_key is required for apply");

  let rows: PreviewRow[];
  let previewHash: string;
  if (operation.operation === "apply") {
    const existing = await repository.loadExistingBatch(actor, operation.idempotency_key!);
    if (existing) {
      const replayPreviewHash = await hashPreview(batch, existing.preview_rows, operation.attachments);
      if (existing.batch_id !== batch.batch_id || existing.input_hash !== inputHash || existing.preview_hash !== operation.approved_preview_hash || existing.preview_hash !== replayPreviewHash) {
        throw new Error("idempotency_key was already used for a different or unapproved batch");
      }
      rows = existing.preview_rows;
      previewHash = existing.preview_hash;
    } else {
      const snapshot = await repository.readSnapshot(batch, actor, storeRequired ? storeId : null);
      rows = batch.rows.map((row) => rowPreview(row, snapshot, stockNeeded ? storeId : null, actor.tenant_id));
      if (storeRequired && !snapshot.stores.some((store) => store.id === storeId && store.tenant_id === actor.tenant_id)) {
        for (const row of rows) {
          const intent = batch.rows.find((candidate) => candidate.source_row === row.source_row)?.stock;
          if (intent?.mode !== "none") {
            row.outcome = "invalid";
            row.errors.push("Requested store does not belong to the authenticated tenant");
          }
        }
      }
      previewHash = await hashPreview(batch, rows, operation.attachments);
      if (operation.approved_preview_hash !== previewHash) throw new Error("approved_preview_hash is stale or does not match this batch preview");
    }
  } else {
    const snapshot = await repository.readSnapshot(batch, actor, storeRequired ? storeId : null);
    rows = batch.rows.map((row) => rowPreview(row, snapshot, stockNeeded ? storeId : null, actor.tenant_id));
    if (storeRequired && !snapshot.stores.some((store) => store.id === storeId && store.tenant_id === actor.tenant_id)) {
      for (const row of rows) {
        const intent = batch.rows.find((candidate) => candidate.source_row === row.source_row)?.stock;
        if (intent?.mode !== "none") {
          row.outcome = "invalid";
          row.errors.push("Requested store does not belong to the authenticated tenant");
        }
      }
    }
    previewHash = await hashPreview(batch, rows, operation.attachments);
  }
  for (const row of rows) {
    const attachmentError = attachmentErrors.get(row.source_row);
    if (attachmentError) {
      row.outcome = "invalid";
      row.errors.push(attachmentError);
    }
  }
  if (attachmentErrors.size) previewHash = await hashPreview(batch, rows, operation.attachments);
  if (operation.operation === "preview") {
    for (const row of rows) {
      if (attachmentRows.has(row.source_row)) {
        row.warnings.push("Image attachment validated in memory; preview does not upload image bytes");
      }
    }
    return { batch_id: batch.batch_id, preview_hash: previewHash, counts: counts(rows), rows };
  }
  if (rows.some((row) => row.outcome === "ambiguous" || row.outcome === "invalid" || row.errors.length)) return { batch_id: batch.batch_id, preview_hash: previewHash, counts: counts(rows), rows };
  const appliedRows = await repository.applyBatch(batch, actor, storeRequired ? storeId : null, operation.idempotency_key!, inputHash, previewHash, rows, operation.attachments);
  return { batch_id: batch.batch_id, preview_hash: previewHash, counts: counts(appliedRows), rows: appliedRows };
}
