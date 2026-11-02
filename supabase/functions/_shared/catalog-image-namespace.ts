const PRODUCTION_IMAGE_HOST = "images.luckystore1947.com";
const PREVIEW_IMAGE_HOST =
  "lucky-store-images-preview.luckystore-1947.workers.dev";

export function isAllowedCatalogImageBase(
  value: string,
  tenantId: string,
  allowPreviewImageHost = false,
): boolean {
  try {
    const base = new URL(value);
    const allowedHost = base.hostname === PRODUCTION_IMAGE_HOST ||
      (base.hostname === PREVIEW_IMAGE_HOST &&
        allowPreviewImageHost && tenantId === "00000000-0000-0000-0000-000000000001");
    return base.protocol === "https:" && base.port === "" && allowedHost &&
      base.pathname === "/" &&
      !base.username && !base.password && !base.search && !base.hash &&
      !value.includes("?") && !value.includes("#");
  } catch {
    return false;
  }
}
