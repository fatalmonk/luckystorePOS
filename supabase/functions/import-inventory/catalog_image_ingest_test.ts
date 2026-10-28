import {
  publishCatalogAttachment,
  cleanupCatalogImageCandidate,
  type CatalogImageAdapter,
  type CatalogImageInput,
} from "./catalog_image_ingest.ts";

const webpBytes = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);

function makeInput(overrides: Partial<CatalogImageInput> = {}): CatalogImageInput {
  return {
    batch_id: "batch-a",
    idempotency_key: "retry-a",
    source_row: 2,
    actor_id: "actor-a",
    tenant_id: "tenant-a",
    store_id: "store-a",
    item_id: "item-a",
    sku: "sku/one",
    source_image_key: null,
    source_image_version: 0,
    file: { name: "item.webp", type: "image/webp", size: webpBytes.length, bytes: webpBytes },
    ...overrides,
  };
}

function fakeAdapter(overrides: Partial<CatalogImageAdapter> = {}) {
  const calls = { ticket: 0, upload: 0, publish: 0, deletes: 0 };
  const keys: string[] = [];
  const ticketRequests: Array<{ key: string; itemId: string; contentType: string; maxBytes: number }> = [];
  const adapter: CatalogImageAdapter = {
    publicBaseUrl: "https://images.example.test",
    async issueTicket(request) { calls.ticket++; ticketRequests.push(request); return `ticket:${request.key}`; },
    async upload(request) { calls.upload++; keys.push(request.key); return { key: request.key, url: `${this.publicBaseUrl}/${request.key}` }; },
    async publish() { calls.publish++; },
    async currentImageState() { return { key: null, version: 0, checksum: null }; },
    async isReferenced() { return false; },
    async delete() { calls.deletes++; },
    ...overrides,
  };
  return { adapter, calls, keys, ticketRequests };
}

Deno.test("catalog image uses a tenant-scoped unique WebP key and ticketed upload", async () => {
  const fake = fakeAdapter();
  const result = await publishCatalogAttachment(makeInput(), fake.adapter);
  if (!result.published || !result.key.startsWith("products/tenant-a/SKU_ONE-") || !result.key.endsWith(".webp")) throw new Error("image key was not tenant scoped or SKU based");
  if (fake.calls.ticket !== 1 || fake.calls.upload !== 1 || fake.calls.publish !== 1) throw new Error("ticket, upload, and CAS publication were not called exactly once");
  if (fake.ticketRequests[0].itemId !== "item-a" || fake.ticketRequests[0].contentType !== "image/webp" || fake.ticketRequests[0].maxBytes !== webpBytes.length) throw new Error("ticket scope did not bind the item, content type, and size");
  if (result.checksum.length !== 64) throw new Error("SHA-256 checksum was not returned");
});

Deno.test("unsupported MIME, oversized files, and mismatched checksums fail before remote calls", async () => {
  const fake = fakeAdapter();
  const cases = [
    makeInput({ file: { name: "bad.png", type: "image/png", size: webpBytes.length, bytes: webpBytes } }),
    makeInput({ file: { name: "large.webp", type: "image/webp", size: 10 * 1024 * 1024 + 1, bytes: webpBytes } }),
    makeInput({ file: { name: "wrong.webp", type: "image/webp", size: webpBytes.length, bytes: webpBytes, sha256: "0".repeat(64) } }),
  ];
  for (const input of cases) {
    let rejected = false;
    try { await publishCatalogAttachment(input, fake.adapter); } catch { rejected = true; }
    if (!rejected) throw new Error("invalid image was accepted");
  }
  if (fake.calls.ticket || fake.calls.upload || fake.calls.publish) throw new Error("invalid image reached remote services");
});

Deno.test("upload checksum and returned URL/key must match the configured Worker namespace", async () => {
  const badKey = fakeAdapter({ async upload(request) { return { key: `products/tenant-b/${request.key.split("/").at(-1)}`, url: `${this.publicBaseUrl}/products/tenant-b/wrong.webp` }; } });
  let rejected = false;
  try { await publishCatalogAttachment(makeInput(), badKey.adapter); } catch { rejected = true; }
  if (!rejected || badKey.calls.publish) throw new Error("mismatched Worker result was published");
});

Deno.test("CAS conflict reports the new unreferenced key and does not delete it", async () => {
  const fake = fakeAdapter({ async publish() { throw new Error("IMAGE_VERSION_CONFLICT"); } });
  const result = await publishCatalogAttachment(makeInput(), fake.adapter);
  if (result.published || result.orphaned_key !== fake.keys[0]) throw new Error("CAS conflict did not report the uploaded candidate");
  if (fake.calls.deletes) throw new Error("CAS conflict deleted an object without a separate reference check");
});

Deno.test("changed source image state fails before uploading a new object", async () => {
  const fake = fakeAdapter({ async currentImageState() { return { key: "products/tenant-a/other.webp", version: 3, checksum: "other" }; } });
  const result = await publishCatalogAttachment(makeInput(), fake.adapter);
  if (result.published || fake.calls.ticket || fake.calls.upload) throw new Error("stale image preview reached the Worker");
});

Deno.test("retry uses the same content-addressed key and reissues a one-use ticket", async () => {
  let failOnce = true;
  const fake = fakeAdapter({ async publish() { if (failOnce) { failOnce = false; throw new Error("temporary CAS request failure"); } } });
  const input = makeInput();
  const first = await publishCatalogAttachment(input, fake.adapter);
  const second = await publishCatalogAttachment(input, fake.adapter);
  if (first.published || !second.published || fake.keys[0] !== fake.keys[1]) throw new Error("retry did not reuse the idempotent object key");
  if (fake.calls.ticket !== 2 || fake.calls.deletes) throw new Error("retry did not get a fresh ticket or attempted unsafe cleanup");
});

Deno.test("cleanup deletes only a newly created, unreferenced tenant product object", async () => {
  const key = "products/tenant-a/SKU-1-12345678-1234-5678-9234-123456789abc.webp";
  const fake = fakeAdapter();
  const created = new Set([key]);
  const removed = await cleanupCatalogImageCandidate(key, "tenant-a", created, fake.adapter);
  if (!removed || fake.calls.deletes !== 1) throw new Error("unreferenced batch-created object was not deleted");

  const referenced = fakeAdapter({ async isReferenced() { return true; } });
  if (await cleanupCatalogImageCandidate(key, "tenant-a", created, referenced.adapter) || referenced.calls.deletes) {
    throw new Error("referenced object was deleted");
  }

  let rejected = false;
  try { await cleanupCatalogImageCandidate("products/tenant-a/legacy.webp", "tenant-a", created, fake.adapter); } catch { rejected = true; }
  if (!rejected) throw new Error("object outside this batch's created-key set was eligible for cleanup");
});
