import {
  runCatalogImportOperation,
  type CatalogActor,
  type CatalogImportBatch,
  type CatalogImportRepository,
  type CatalogSnapshot,
  type PreviewRow,
} from "./catalog_import_v1.ts";

const actor: CatalogActor = { id: "user-a", tenant_id: "tenant-a", store_id: null, role: "admin" };

function makeBatch(overrides: Partial<CatalogImportBatch> = {}): CatalogImportBatch {
  return {
    contract_version: 1,
    batch_id: "batch-1",
    source: "test",
    rows: [{ source_row: 2, product: { sku: "SKU-1", name: "Example" }, stock: { mode: "none" } }],
    ...overrides,
  };
}

function snapshot(overrides: Partial<CatalogSnapshot> = {}): CatalogSnapshot {
  return {
    items: [],
    categories: [],
    stores: [{ id: "store-a", tenant_id: "tenant-a" }],
    stock: [],
    ...overrides,
  };
}

function fakeRepository(state = snapshot()) {
  const calls = { reads: 0, mutations: 0, stockWrites: 0, storageUploads: 0, r2Uploads: 0 };
  const appliedKeys = new Map<string, { input_hash: string; preview_hash: string; preview_rows: PreviewRow[]; result: PreviewRow[] }>();
  let currentSnapshot = state;
  const repository: CatalogImportRepository = {
    async readSnapshot() {
      calls.reads++;
      return currentSnapshot;
    },
    async loadExistingBatch(_actor, key) {
      const existing = appliedKeys.get(key);
      return existing ? { batch_id: "batch-1", input_hash: existing.input_hash, preview_hash: existing.preview_hash, preview_rows: existing.preview_rows } : null;
    },
    async applyBatch(batch, _actor, _storeId, key, inputHash, previewHash, previewRows, attachments = []) {
      if (appliedKeys.has(key)) return appliedKeys.get(key)!.result;
      calls.mutations++;
      calls.stockWrites += batch.rows.filter((row) => row.stock.mode !== "none").length;
      calls.storageUploads += attachments.length;
      const result: PreviewRow[] = [{ source_row: 2, item_id: "item-new", outcome: "create", field_diffs: {}, warnings: [], errors: [] }];
      appliedKeys.set(key, { input_hash: inputHash, preview_hash: previewHash, preview_rows: previewRows, result });
      currentSnapshot = snapshot({ items: [{ id: "item-new", tenant_id: "tenant-a", sku: "SKU-1", barcode: null, name: "Example", brand: null, category_id: null, cost: null, price: null }] });
      return result;
    },
  };
  return { repository, calls, appliedKeys, setSnapshot: (next: CatalogSnapshot) => currentSnapshot = next };
}

Deno.test("preview validates image attachments in memory and performs no database, Storage, or R2 writes", async () => {
  const fake = fakeRepository();
  const result = await runCatalogImportOperation({
    operation: "preview",
    batch: makeBatch(),
    attachments: [{ source_row: 2, name: "example.webp", type: "image/webp", size: 68, bytes: new Uint8Array([82, 73, 70, 70, 60, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 48, 0, 0, 0, 208, 1, 0, 157, 1, 42, 10, 0, 10, 0, 1, 64, 38, 37, 160, 2, 116, 186, 1, 248, 0, 3, 176, 0, 254, 242, 235, 127, 252, 216, 21, 205, 115, 239, 247, 255, 210, 224, 253, 46, 15, 210, 224, 255, 210, 144, 0, 0]) }],
  }, { ...actor, store_id: "store-a" }, fake.repository);

  if (result.counts.create !== 1) throw new Error("expected one create candidate");
  if (!result.rows[0].warnings.some((warning) => warning.includes("does not upload"))) throw new Error("preview did not report attachment handling");
  if (fake.calls.mutations || fake.calls.storageUploads) throw new Error("preview performed a remote write");
});

Deno.test("malformed batches and duplicate tenant identifiers fail before repository reads", async () => {
  const fake = fakeRepository();
  const missingSku = makeBatch({ rows: [{ source_row: 2, product: { sku: "", name: "Example" }, stock: { mode: "none" } }] });
  const invalid = await runCatalogImportOperation({ operation: "preview", batch: missingSku }, actor, fake.repository);
  if (invalid.counts.invalid !== 1 || fake.calls.reads !== 0) throw new Error("malformed batch reached repository");

  const duplicate = makeBatch({ rows: [
    { source_row: 2, product: { sku: "DUP", name: "One" }, stock: { mode: "none" } },
    { source_row: 3, product: { sku: "DUP", name: "Two" }, stock: { mode: "none" } },
  ] });
  const duplicateResult = await runCatalogImportOperation({ operation: "preview", batch: duplicate }, actor, fake.repository);
  if (duplicateResult.counts.invalid !== 2 || fake.calls.reads !== 0) throw new Error("duplicate SKU was not rejected before repository reads");
});

Deno.test("wrong tenant store is rejected and apply is never called", async () => {
  const fake = fakeRepository(snapshot({ stores: [{ id: "store-other", tenant_id: "tenant-b" }] }));
  const batch = makeBatch({ requested_store_id: "store-other", rows: [{ source_row: 2, product: { sku: "SKU-1", name: "Example" }, stock: { mode: "set", quantity: 0 } }] });
  const result = await runCatalogImportOperation({ operation: "preview", batch }, actor, fake.repository);

  if (result.counts.invalid !== 1 || !result.rows[0].errors.some((error) => error.includes("tenant"))) throw new Error("cross-tenant store was not rejected");
  if (fake.calls.mutations) throw new Error("invalid store reached apply");
});

Deno.test("requested store outside the actor's store scope fails closed", async () => {
  const storeActor = { ...actor, store_id: "store-owned" };
  const fake = fakeRepository(snapshot({ stores: [{ id: "store-other", tenant_id: "tenant-a" }] }));
  const batch = makeBatch({ requested_store_id: "store-other", rows: [{ source_row: 2, product: { sku: "SKU-1", name: "Example" }, stock: { mode: "set", quantity: 0 } }] });
  const result = await runCatalogImportOperation({ operation: "preview", batch }, storeActor, fake.repository);

  if (result.counts.invalid !== 1 || !result.rows[0].errors.some((error) => error.includes("store scope"))) throw new Error("actor store boundary was not enforced");
  if (fake.calls.mutations) throw new Error("out-of-scope store reached apply");
});

Deno.test("apply rejects a stale preview hash before mutation", async () => {
  const fake = fakeRepository();
  const batch = makeBatch();
  const preview = await runCatalogImportOperation({ operation: "preview", batch }, actor, fake.repository);
  fake.repository.readSnapshot = async () => snapshot({ items: [{
    id: "item-existing", tenant_id: "tenant-a", sku: "SKU-1", barcode: null, name: "Old", brand: null,
    category_id: null, cost: null, price: null,
  }] });
  let rejected = false;
  try {
    await runCatalogImportOperation({ operation: "apply", batch, idempotency_key: "retry-1", approved_preview_hash: preview.preview_hash }, actor, fake.repository);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("stale");
  }
  if (!rejected || fake.calls.mutations) throw new Error("stale preview was applied");
});

Deno.test("preview binds image version and rejects a changed image before apply", async () => {
  const initial = snapshot({ items: [{
    id: "item-existing", tenant_id: "tenant-a", sku: "SKU-1", barcode: null, name: "Example", brand: null,
    category_id: null, cost: null, price: null, image_version: 1,
  }] });
  const fake = fakeRepository(initial);
  const batch = makeBatch({ rows: [{ source_row: 2, product: { sku: "SKU-1", name: "Example" }, stock: { mode: "none" }, image: { kind: "url", url: "https://images.example.test/a.webp" } }] });
  const preview = await runCatalogImportOperation({ operation: "preview", batch }, actor, fake.repository);
  fake.setSnapshot(snapshot({ items: [{
    id: "item-existing", tenant_id: "tenant-a", sku: "SKU-1", barcode: null, name: "Example", brand: null,
    category_id: null, cost: null, price: null, image_version: 2,
  }] }));
  let rejected = false;
  try {
    await runCatalogImportOperation({ operation: "apply", batch, idempotency_key: "image-version", approved_preview_hash: preview.preview_hash }, actor, fake.repository);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("stale");
  }
  if (!rejected || fake.calls.mutations) throw new Error("changed image version was applied");
});

Deno.test("same idempotency key replays the stored result without duplicate stock or image effects", async () => {
  const fake = fakeRepository();
  const batch = makeBatch();
  const preview = await runCatalogImportOperation({ operation: "preview", batch }, actor, fake.repository);
  const operation = { operation: "apply" as const, batch, idempotency_key: "retry-1", approved_preview_hash: preview.preview_hash };
  await runCatalogImportOperation(operation, actor, fake.repository);
  const readsAfterFirstApply = fake.calls.reads;
  await runCatalogImportOperation(operation, actor, fake.repository);

  if (fake.calls.mutations !== 1 || fake.calls.stockWrites || fake.calls.storageUploads || fake.calls.r2Uploads || fake.calls.reads !== readsAfterFirstApply) throw new Error("retry duplicated effects or changed stock for a product-only batch");
});

Deno.test("apply counts image publication failures as partial successes", async () => {
  const fake = fakeRepository();
  const batch = makeBatch();
  const preview = await runCatalogImportOperation({ operation: "preview", batch }, actor, fake.repository);
  fake.repository.applyBatch = async (_batch, _actor, _storeId, _key, _inputHash, _previewHash, rows) => [
    { ...rows[0], outcome: "partial_success", warnings: ["Product saved but image publication failed"] },
  ];

  const result = await runCatalogImportOperation({
    operation: "apply",
    batch,
    idempotency_key: "image-publication-failed",
    approved_preview_hash: preview.preview_hash,
  }, actor, fake.repository);

  if (result.counts.partial_success !== 1 || result.counts.invalid !== 0) {
    throw new Error("partial image publication was not represented in the batch counts");
  }
});

Deno.test("retry rejects changed attachment bytes under the same approved preview and idempotency key", async () => {
  const fake = fakeRepository();
  const batch = makeBatch();
  const bytes = new Uint8Array([82, 73, 70, 70, 60, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 48, 0, 0, 0, 208, 1, 0, 157, 1, 42, 10, 0, 10, 0, 1, 64, 38, 37, 160, 2, 116, 186, 1, 248, 0, 3, 176, 0, 254, 242, 235, 127, 252, 216, 21, 205, 115, 239, 247, 255, 210, 224, 253, 46, 15, 210, 224, 255, 210, 144, 0, 0]);
  const attachments = [{ source_row: 2, name: "item.webp", type: "image/webp", size: bytes.length, bytes }];
  const preview = await runCatalogImportOperation({ operation: "preview", batch, attachments }, { ...actor, store_id: "store-a" }, fake.repository);
  const operation = { operation: "apply" as const, batch, attachments, idempotency_key: "image-retry", approved_preview_hash: preview.preview_hash };
  await runCatalogImportOperation(operation, { ...actor, store_id: "store-a" }, fake.repository);

  const changedBytes = new Uint8Array([82, 73, 70, 70, 60, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 48, 0, 0, 0, 208, 1, 0, 157, 1, 42, 10, 0, 10, 0, 1, 64, 38, 37, 160, 2, 116, 186, 1, 248, 0, 3, 176, 0, 254, 242, 235, 127, 252, 216, 21, 205, 115, 239, 247, 255, 210, 224, 253, 46, 15, 210, 224, 255, 210, 144, 0, 1]);
  let rejected = false;
  try {
    await runCatalogImportOperation({ ...operation, attachments: [{ ...attachments[0], bytes: changedBytes }] }, { ...actor, store_id: "store-a" }, fake.repository);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("different or unapproved");
  }
  if (!rejected || fake.calls.mutations !== 1) throw new Error("retry accepted different image bytes or repeated row effects");
});
