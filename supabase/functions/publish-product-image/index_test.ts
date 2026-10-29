import { validateImagePublishRequest, verifyUploadedWebp, type ImagePublishRequest } from "./image_publish_contract.ts";

const checksum = "a".repeat(64);

function request(overrides: Partial<ImagePublishRequest> = {}): ImagePublishRequest {
  return {
    itemId: "item-a",
    tenantId: "tenant-a",
    actorStoreId: "store-a",
    storeId: "store-a",
    sourceImageKey: null,
    sourceImageVersion: 0,
    newImageUrl: `https://images.luckystore1947.com/products/tenant-a/SKU-1-12345678-1234-5678-9234-123456789abc.webp`,
    newImageChecksum: checksum,
    publicBaseUrl: "https://images.luckystore1947.com",
    ...overrides,
  };
}

Deno.test("publication contract accepts tenant object and rejects cross-tenant key or store", () => {
  if (validateImagePublishRequest(request()) !== null) throw new Error("valid tenant image publication was rejected");
  if (!validateImagePublishRequest(request({ newImageUrl: "https://images.luckystore1947.com/products/tenant-b/image.webp" }))) throw new Error("cross-tenant image URL was accepted");
  if (!validateImagePublishRequest(request({ actorStoreId: "store-a", storeId: "store-b" }))) throw new Error("cross-store publication was accepted");
});

Deno.test("publication contract binds checksum, URL namespace, and source image version", () => {
  if (!validateImagePublishRequest(request({ newImageChecksum: "bad" }))) throw new Error("invalid checksum was accepted");
  if (!validateImagePublishRequest(request({ sourceImageVersion: -1 }))) throw new Error("negative image version was accepted");
  if (!validateImagePublishRequest(request({ newImageUrl: "https://other.example/image.webp" }))) throw new Error("foreign image host was accepted");
  if (!validateImagePublishRequest(request({ newImageUrl: "https://images.luckystore1947.com/products/tenant-a/a.webp?redirect=https://evil.example" }))) throw new Error("unsupported image URL query was accepted");
});

Deno.test("preview Worker namespace is accepted when explicitly configured", () => {
  const base = "https://lucky-store-images-preview.luckystore-1947.workers.dev";
  const result = validateImagePublishRequest(request({
    publicBaseUrl: base,
    newImageUrl: `${base}/products/tenant-a/SKU-1-12345678-1234-5678-9234-123456789abc.webp`,
  }));
  if (result !== null) throw new Error(`preview image namespace was rejected: ${result}`);
  if (!validateImagePublishRequest(request({ publicBaseUrl: "https://untrusted.example" }))) throw new Error("untrusted image namespace was accepted");
});

Deno.test("tenant admin may select an owned store and clear an image without a checksum", () => {
  if (validateImagePublishRequest(request({ actorStoreId: null, storeId: "store-b", newImageUrl: null, newImageChecksum: null })) !== null) {
    throw new Error("tenant admin store selection or image clear was rejected");
  }
});

Deno.test("uploaded object verification binds WebP bytes and MIME to the requested checksum", async () => {
  const bytes = new Uint8Array([
    82, 73, 70, 70, 60, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 48, 0, 0, 0,
    208, 1, 0, 157, 1, 42, 10, 0, 10, 0, 1, 64, 38, 37, 160, 2, 116, 186, 1,
    248, 0, 3, 176, 0, 254, 242, 235, 127, 252, 216, 21, 205, 115, 239, 247,
    255, 210, 224, 253, 46, 15, 210, 224, 255, 210, 144, 0, 0
  ]);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const checksum = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (await verifyUploadedWebp("image/webp", bytes, checksum) !== null) throw new Error("matching uploaded WebP was rejected");
  if (!await verifyUploadedWebp("image/png", bytes, checksum)) throw new Error("wrong content type was accepted");
  if (!await verifyUploadedWebp("image/webp", bytes, "b".repeat(64))) throw new Error("wrong checksum was accepted");
});
