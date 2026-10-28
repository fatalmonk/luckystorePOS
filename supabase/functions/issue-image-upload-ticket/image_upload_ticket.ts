export type UploadTicketRequest = {
  key: string;
  itemId: string | null;
  contentType: string;
  maxBytes: number;
  operation: "upload" | "delete";
};

const VALID_KEY = /^[-\w./]{1,512}$/;
const VALID_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateUploadTicketRequest(request: UploadTicketRequest, tenantId: string, storeId: string | null): string | null {
  if (!VALID_KEY.test(request.key) || request.key.split("/").some((part) => part === ".." || part === "." || part === "")) return "Invalid object key";
  if (!VALID_CONTENT_TYPES.has(request.contentType) || !Number.isSafeInteger(request.maxBytes) || request.maxBytes <= 0 || request.maxBytes > MAX_UPLOAD_BYTES) return "Invalid upload content type or size";
  if (request.operation === "delete" && !request.itemId) return "Item is required for image deletion";
  if (request.itemId && request.operation === "upload" && request.key.startsWith(`products/`) && request.contentType !== "image/webp") {
    return "Product uploads must be image/webp";
  }
  if (request.itemId && request.operation === "upload" && !request.key.startsWith(`products/${tenantId}/`)) return "Product upload scope mismatch";
  if (!request.itemId && request.operation === "upload" &&
    !request.key.startsWith(`products/${tenantId}/`) &&
    !(storeId && request.key.startsWith(`categories/${storeId}/`)) &&
    !request.key.startsWith(`${tenantId}/receipt_`)) return "Upload scope mismatch";
  return null;
}
