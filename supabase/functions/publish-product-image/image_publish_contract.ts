import { isAllowedCatalogImageBase } from "../_shared/catalog-image-namespace.ts";
import {
  MAX_IMAGE_BYTES,
  sha256Hex,
  validateWebpStructure,
} from "../_shared/webp.ts";

export type ImagePublishRequest = {
  itemId: string;
  tenantId: string;
  actorStoreId: string | null;
  storeId: string;
  sourceImageKey: string | null;
  sourceImageVersion: number;
  newImageUrl: string | null;
  newImageChecksum: string | null;
  publicBaseUrl: string;
  allowPreviewImageHost?: boolean;
};

function previewImageHostEnabled(): boolean {
  try {
    return Deno.env.get("ALLOW_PREVIEW_CATALOG_IMAGE_HOST") === "true";
  } catch {
    return false;
  }
}

export function validateImagePublishRequest(request: ImagePublishRequest): string | null {
  if (!request.itemId || !request.storeId || !Number.isSafeInteger(request.sourceImageVersion) || request.sourceImageVersion < 0) return "Invalid image publish request";
  if (request.actorStoreId && request.storeId !== request.actorStoreId) return "Store is outside the authenticated user's store scope";
  if (request.sourceImageKey !== null && typeof request.sourceImageKey !== "string") return "Invalid source image key";
  if (!isAllowedCatalogImageBase(
    request.publicBaseUrl,
    request.tenantId,
    request.allowPreviewImageHost ?? previewImageHostEnabled(),
  )) {
    return "Image public URL does not match the configured catalog image namespace";
  }
  const base = new URL(request.publicBaseUrl);
  if (request.newImageUrl === null) return request.newImageChecksum === null ? null : "Checksum must be null when clearing an image";
  if (!/^[0-9a-f]{64}$/.test(request.newImageChecksum ?? "")) return "Image checksum must be a SHA-256 digest";
  try {
    const image = new URL(request.newImageUrl);
    const key = image.pathname.slice(1);
    if (image.origin !== base.origin || image.username || image.password || image.hash || !key.startsWith(`products/${request.tenantId}/`) || !key.endsWith(".webp") || key.includes("..")) {
      return "Image URL is outside the tenant image namespace";
    }
    if (image.search && !/^\?t=\d+$/.test(image.search)) return "Image URL has unsupported query parameters";
  } catch {
    return "Invalid image URL";
  }
  return null;
}

export async function verifyUploadedWebp(contentType: string | null, bytes: Uint8Array, expectedChecksum: string): Promise<string | null> {
  if (contentType?.split(";")[0].trim().toLowerCase() !== "image/webp" || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return "Uploaded object must be a WebP image no larger than 10 MiB";
  }
  const structure = validateWebpStructure(bytes);
  if (!structure.valid) {
    return structure.error;
  }
  const checksum = await sha256Hex(bytes);
  return checksum === expectedChecksum ? null : "Uploaded object SHA-256 does not match the publish request";
}
