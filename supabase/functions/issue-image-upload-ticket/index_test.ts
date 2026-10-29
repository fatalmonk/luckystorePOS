import { validateUploadTicketRequest, type UploadTicketRequest } from "./image_upload_ticket.ts";

const tenant = "tenant-a";
const store = "store-a";

function request(overrides: Partial<UploadTicketRequest> = {}): UploadTicketRequest {
  return {
    key: "products/tenant-a/SKU-1-12345678-1234-5678-9234-123456789abc.webp",
    itemId: "item-a",
    contentType: "image/webp",
    maxBytes: 1024,
    operation: "upload",
    ...overrides,
  };
}

Deno.test("product upload ticket binds tenant key, item, MIME, and bounded size", () => {
  if (validateUploadTicketRequest(request(), tenant, store) !== null) throw new Error("valid tenant product ticket was rejected");
  if (!validateUploadTicketRequest(request({ key: "products/tenant-b/a.webp" }), tenant, store)) throw new Error("cross-tenant product key was accepted");
  if (!validateUploadTicketRequest(request({ contentType: "application/octet-stream" }), tenant, store)) throw new Error("unsupported MIME was accepted");
  if (!validateUploadTicketRequest(request({ maxBytes: 10 * 1024 * 1024 + 1 }), tenant, store)) throw new Error("oversized ticket was accepted");
});

Deno.test("key traversal is rejected while legacy item deletion remains item-bound", () => {
  if (!validateUploadTicketRequest(request({ key: "products/tenant-a/../other.webp" }), tenant, store)) throw new Error("path traversal key was accepted");
  const deletion = request({ key: "item-images/legacy/item.webp", operation: "delete" });
  if (validateUploadTicketRequest(deletion, tenant, store) !== null) throw new Error("legacy item key was rejected before the later exact item-pointer check");
});
