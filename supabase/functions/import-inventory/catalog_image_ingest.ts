import {
  MAX_IMAGE_BYTES,
  sha256Hex,
  validateWebpStructure,
} from "../_shared/webp.ts";

export type CatalogImageInput = {
  batch_id: string;
  idempotency_key: string;
  source_row: number;
  actor_id: string;
  tenant_id: string;
  store_id: string;
  item_id: string;
  sku: string;
  source_image_key: string | null;
  source_image_version: number;
  file: { name: string; type: string; size: number; bytes: Uint8Array; sha256?: string };
};

export type CatalogImageFile = CatalogImageInput["file"];

export type CatalogImageAdapter = {
  publicBaseUrl: string;
  issueTicket(request: { key: string; itemId: string; contentType: string; maxBytes: number }): Promise<string>;
  upload(request: { key: string; file: File; ticket: string }): Promise<{ key: string; url: string }>;
  publish(request: {
    itemId: string;
    storeId: string;
    sourceImageKey: string | null;
    sourceImageVersion: number;
    newImageKey: string;
    newImageUrl: string;
    newImageChecksum: string;
  }): Promise<void>;
  currentImageState(itemId: string, tenantId: string): Promise<{ key: string | null; version: number; checksum: string | null }>;
  isReferenced(key: string, tenantId: string): Promise<boolean>;
  delete(key: string): Promise<void>;
};

export type CatalogImageResult =
  | { published: true; key: string; url: string; checksum: string }
  | { published: false; key: string; checksum: string; orphaned_key: string | null; error: string };

function safeSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "_").slice(0, 120) || "ITEM";
}

async function stableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function checkedObjectUrl(value: string, baseValue: string, key: string): string {
  const base = new URL(baseValue);
  const url = new URL(value);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/" ||
    url.origin !== base.origin || url.pathname !== `/${key}` || url.search || url.hash || url.username || url.password) {
    throw new Error("Worker returned an image URL outside the configured public namespace");
  }
  return url.toString();
}

export async function publishCatalogAttachment(input: CatalogImageInput, adapter: CatalogImageAdapter): Promise<CatalogImageResult> {
  const file = input.file;
  if (!input.tenant_id || !input.store_id || !input.item_id || !input.idempotency_key || !Number.isInteger(input.source_row) || input.source_row < 1) {
    throw new Error("Image publication requires a verified tenant, store, item, and stable row identity");
  }
  const checksum = await validateCatalogImageFile(file);

  const uuid = await stableUuid(`${input.idempotency_key}:${input.batch_id}:${input.source_row}:${checksum}`);
  const key = `products/${input.tenant_id}/${safeSegment(input.sku)}-${uuid}.webp`;
  const current = await adapter.currentImageState(input.item_id, input.tenant_id);
  if (current.key === key && current.checksum === checksum) {
    const url = checkedObjectUrl(`${adapter.publicBaseUrl.replace(/\/$/, "")}/${key}`, adapter.publicBaseUrl, key);
    return { published: true, key, url, checksum };
  }
  if (current.key !== input.source_image_key || current.version !== input.source_image_version) {
    return { published: false, key, checksum, orphaned_key: null, error: "Product image changed after preview; no new upload was attempted" };
  }
  const ticket = await adapter.issueTicket({ key, itemId: input.item_id, contentType: "image/webp", maxBytes: file.size });

  let uploaded: { key: string; url: string };
  try {
    uploaded = await adapter.upload({
      key,
      ticket,
      file: new File([file.bytes.slice().buffer as ArrayBuffer], file.name || `${safeSegment(input.sku)}.webp`, { type: "image/webp" }),
    });
    if (uploaded.key !== key) throw new Error("Worker returned a different object key than the scoped upload ticket");
    const url = checkedObjectUrl(uploaded.url, adapter.publicBaseUrl, key);

    await adapter.publish({
      itemId: input.item_id,
      storeId: input.store_id,
      sourceImageKey: input.source_image_key,
      sourceImageVersion: input.source_image_version,
      newImageKey: key,
      newImageUrl: url,
      newImageChecksum: checksum,
    });
    return { published: true, key, url, checksum };
  } catch (error) {
    const stateAfterFailure = await adapter.currentImageState(input.item_id, input.tenant_id).catch(() => null);
    if (stateAfterFailure?.key === key && stateAfterFailure.checksum === checksum) {
      return { published: true, key, url: checkedObjectUrl(`${adapter.publicBaseUrl.replace(/\/$/, "")}/${key}`, adapter.publicBaseUrl, key), checksum };
    }
    // The immutable object is retained and reported. Cleanup requires a separate
    // verified reference check; a CAS conflict never authorizes deletion.
    const referenced = await adapter.isReferenced(key, input.tenant_id).catch(() => true);
    if (referenced) {
      return { published: false, key, checksum, orphaned_key: key, error: "Publication failed; uploaded object is retained because reference state is unknown or active" };
    }
    return {
      published: false,
      key,
      checksum,
      orphaned_key: key,
      error: error instanceof Error ? error.message : "Publication failed; uploaded object retained for reviewed cleanup",
    };
  }
}

export async function validateCatalogImageFile(file: CatalogImageFile): Promise<string> {
  if (file.type !== "image/webp" || file.size <= 0 || file.size > MAX_IMAGE_BYTES || file.size !== file.bytes.byteLength) {
    throw new Error("Image attachment must be a valid WebP file no larger than 10 MiB");
  }
  const structure = validateWebpStructure(file.bytes);
  if (!structure.valid) {
    throw new Error(`Image attachment must be a valid WebP file: ${structure.error}`);
  }
  const checksum = await sha256Hex(file.bytes);
  if (file.sha256 && file.sha256 !== checksum) throw new Error("Image attachment SHA-256 does not match the supplied checksum");
  return checksum;
}

export async function cleanupCatalogImageCandidate(
  key: string,
  tenantId: string,
  createdByBatch: ReadonlySet<string>,
  adapter: Pick<CatalogImageAdapter, "isReferenced" | "delete">,
): Promise<boolean> {
  if (!createdByBatch.has(key) || !key.startsWith(`products/${tenantId}/`) || !key.endsWith(".webp") || key.includes("..")) {
    throw new Error("Cleanup is limited to image objects created by this import batch");
  }
  if (await adapter.isReferenced(key, tenantId)) return false;
  await adapter.delete(key);
  return true;
}
