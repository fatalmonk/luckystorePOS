import { createSupabaseCatalogRepository } from "./supabase_catalog_repository.ts";
import type {
  CatalogActor,
  CatalogImportBatch,
  PreviewRow,
} from "./catalog_import_v1.ts";
import type { CatalogImageAdapter } from "./catalog_image_ingest.ts";

const webpBytes = new Uint8Array([
  82,
  73,
  70,
  70,
  60,
  0,
  0,
  0,
  87,
  69,
  66,
  80,
  86,
  80,
  56,
  32,
  48,
  0,
  0,
  0,
  208,
  1,
  0,
  157,
  1,
  42,
  10,
  0,
  10,
  0,
  1,
  64,
  38,
  37,
  160,
  2,
  116,
  186,
  1,
  248,
  0,
  3,
  176,
  0,
  254,
  242,
  235,
  127,
  252,
  216,
  21,
  205,
  115,
  239,
  247,
  255,
  210,
  224,
  253,
  46,
  15,
  210,
  224,
  255,
  210,
  144,
  0,
  0,
]);

Deno.test("image publication failure returns a partial row and finalizes the batch as partial", async () => {
  const actor: CatalogActor = {
    id: "actor-a",
    tenant_id: "tenant-a",
    store_id: "store-a",
    role: "admin",
  };
  const batch: CatalogImportBatch = {
    contract_version: 1,
    batch_id: "batch-a",
    source: "test",
    rows: [{
      source_row: 2,
      product: { sku: "SKU-1", name: "Example" },
      stock: { mode: "none" },
    }],
  };
  const previewRows: PreviewRow[] = [{
    source_row: 2,
    item_id: "item-a",
    expected_item_snapshot: { image_key: null, image_version: 0 },
    item_version: 0,
    item_image_url: null,
    outcome: "update",
    field_diffs: {},
    warnings: [],
    errors: [],
  }];
  const finishedStatuses: string[] = [];
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "catalog_import_batch_begin") {
        return {
          data: {
            id: "batch-row-a",
            input_hash: "input-a",
            preview_hash: "preview-a",
            preview_rows: previewRows,
          },
          error: null,
        };
      }
      if (name === "catalog_import_row_apply") {
        return {
          data: { item_id: "item-a", outcome: "update", field_diffs: {} },
          error: null,
        };
      }
      if (name === "catalog_import_batch_finish") {
        finishedStatuses.push(String(args.p_status));
        return { data: null, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
  const imageAdapter: CatalogImageAdapter = {
    publicBaseUrl: "https://images.example.test",
    async issueTicket() {
      throw new Error("image ticket service unavailable");
    },
    async upload() {
      throw new Error("upload must not start");
    },
    async publish() {
      throw new Error("publish must not start");
    },
    async currentImageState() {
      return { key: null, version: 0, checksum: null };
    },
    async isReferenced() {
      return false;
    },
    async delete() {
      throw new Error("cleanup must not start");
    },
  };

  const repository = createSupabaseCatalogRepository(client, imageAdapter);
  const rows = await repository.applyBatch(
    batch,
    actor,
    "store-a",
    "retry-a",
    "input-a",
    "preview-a",
    previewRows,
    [{
      source_row: 2,
      name: "example.webp",
      type: "image/webp",
      size: webpBytes.length,
      bytes: webpBytes,
    }],
  );

  if (rows[0]?.outcome !== "partial_success") {
    throw new Error("image failure was not returned as a partial success");
  }
  if (
    !rows[0].warnings.some((warning) =>
      warning.includes("image ticket service unavailable")
    )
  ) {
    throw new Error("image failure detail was not retained in the row result");
  }
  if (finishedStatuses.length !== 1 || finishedStatuses[0] !== "partial") {
    throw new Error("batch audit was not finalized with partial status");
  }
});
