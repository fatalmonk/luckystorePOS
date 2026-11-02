export const PREVIEW_IMAGE_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const PRODUCTION_IMAGE_HOST = "images.luckystore1947.com";
const PREVIEW_IMAGE_HOST =
  "lucky-store-images-preview.luckystore-1947.workers.dev";

export function isAllowedCatalogImageBase(
  value: string,
  tenantId: string,
): boolean {
  try {
    const base = new URL(value);
    const allowedHost = base.hostname === PRODUCTION_IMAGE_HOST ||
      (base.hostname === PREVIEW_IMAGE_HOST &&
        tenantId === PREVIEW_IMAGE_TENANT_ID);
    return base.protocol === "https:" && base.port === "" && allowedHost &&
      base.pathname === "/" &&
      !base.username && !base.password && !base.search && !base.hash;
  } catch {
    return false;
  }
}
