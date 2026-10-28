import type {
  CatalogActor,
  CatalogImportBatch,
  CatalogImportRepository,
  CatalogSnapshot,
  PreviewRow,
} from "./catalog_import_v1.ts";
import { publishCatalogAttachment, type CatalogImageAdapter } from "./catalog_image_ingest.ts";
import type { CatalogImageFile } from "./catalog_image_ingest.ts";

type SupabaseClientLike = any;

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function chunks<T>(values: T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function requireNoError(error: unknown, message: string): void {
  if (error) throw new Error(message);
}

export function createSupabaseCatalogRepository(client: SupabaseClientLike, imageAdapter?: CatalogImageAdapter): CatalogImportRepository {
  return {
    async readSnapshot(batch: CatalogImportBatch, actor: CatalogActor, storeId: string | null): Promise<CatalogSnapshot> {
      const skus = unique(batch.rows.map((row) => row.product.sku));
      const barcodes = unique(batch.rows.map((row) => row.product.barcode));
      const categoryNames = unique(batch.rows.map((row) => row.product.category));
      const items = new Map<string, CatalogSnapshot["items"][number]>();
      const loadItems = async (field: "sku" | "barcode", values: string[]) => {
        for (const group of chunks(values)) {
          const { data, error } = await client.from("items")
            .select("id, tenant_id, sku, barcode, name, brand, category_id, cost, price, mrp, is_active, image_url, image_key, image_version")
            .eq("tenant_id", actor.tenant_id)
            .in(field, group);
          requireNoError(error, "Could not read tenant catalog for preview");
          for (const item of data ?? []) items.set(item.id, item);
        }
      };
      await loadItems("sku", skus);
      await loadItems("barcode", barcodes);

      const categories: CatalogSnapshot["categories"] = [];
      for (const group of chunks(categoryNames)) {
        const { data, error } = await client.from("categories")
          .select("id, tenant_id, name")
          .eq("tenant_id", actor.tenant_id)
          .in("name", group);
        requireNoError(error, "Could not read tenant categories for preview");
        categories.push(...(data ?? []));
      }

      const stores: CatalogSnapshot["stores"] = [];
      if (storeId) {
        const { data, error } = await client.from("stores")
          .select("id, tenant_id")
          .eq("tenant_id", actor.tenant_id)
          .eq("id", storeId);
        requireNoError(error, "Could not verify the requested tenant store");
        stores.push(...(data ?? []));
      }

      const stock: CatalogSnapshot["stock"] = [];
      const itemIds = [...items.keys()];
      const isStoreVerified = storeId && stores.some((s) => s.id === storeId && s.tenant_id === actor.tenant_id);
      if (isStoreVerified && itemIds.length) {
        for (const group of chunks(itemIds)) {
          const { data, error } = await client.from("stock_levels")
            .select("store_id, item_id, qty")
            .eq("store_id", storeId)
            .in("item_id", group);
          requireNoError(error, "Could not read store stock for preview");
          stock.push(...(data ?? []));
        }
      }
      return { items: [...items.values()], categories, stores, stock };
    },

    async loadExistingBatch(actor: CatalogActor, idempotencyKey: string) {
      const { data, error } = await client.from("catalog_import_batches")
        .select("batch_id, input_hash, preview_hash, preview_rows")
        .eq("actor_id", actor.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      requireNoError(error, "Could not check the idempotency key");
      return data ?? null;
    },

    async applyBatch(
      batch: CatalogImportBatch,
      actor: CatalogActor,
      storeId: string | null,
      idempotencyKey: string,
      inputHash: string,
      previewHash: string,
      previewRows: PreviewRow[],
      attachments?: Array<CatalogImageFile & { source_row: number }>,
    ): Promise<PreviewRow[]> {
      const { data: batchRun, error: beginError } = await client.rpc("catalog_import_batch_begin", {
        p_actor_id: actor.id,
        p_tenant_id: actor.tenant_id,
        p_idempotency_key: idempotencyKey,
        p_batch_id: batch.batch_id,
        p_input_hash: inputHash,
        p_preview_hash: previewHash,
        p_preview_rows: previewRows,
      });
      requireNoError(beginError, "Could not reserve catalog import batch");
      if (!batchRun?.id || batchRun.preview_hash !== previewHash || batchRun.input_hash !== inputHash) {
        throw new Error("idempotency_key was already used for a different or unapproved batch");
      }
      const approvedRows = (batchRun.preview_rows ?? previewRows) as PreviewRow[];
      const approvedBySourceRow = new Map(approvedRows.map((row) => [row.source_row, row]));
      const attachmentsBySourceRow = new Map((attachments ?? []).map((file) => [file.source_row, file]));
      const results: PreviewRow[] = [];

      for (const row of batch.rows) {
        const approved = approvedBySourceRow.get(row.source_row);
        if (!approved || approved.errors.length || approved.outcome === "ambiguous" || approved.outcome === "invalid") {
          results.push(approved ?? {
            source_row: row.source_row,
            outcome: "invalid",
            field_diffs: {},
            warnings: [],
            errors: ["Row was not present in the approved preview"],
          });
          continue;
        }
        if (row.image?.kind === "asset") {
          results.push({ ...approved, outcome: "invalid", errors: ["Local asset publication is not enabled until the image ingest task"] });
          continue;
        }

        const attachment = attachmentsBySourceRow.get(row.source_row);
        if (attachment && (!imageAdapter || !storeId)) {
          results.push({ ...approved, outcome: "invalid", errors: ["R2 image publisher or verified store is unavailable"] });
          continue;
        }

        let appliedData: any;
        try {
          const { data, error } = await client.rpc("catalog_import_row_apply", {
            p_batch_row_id: batchRun.id,
            p_actor_id: actor.id,
            p_tenant_id: actor.tenant_id,
            p_store_id: storeId,
            p_source_row: row.source_row,
            p_expected_item_id: approved.item_id ?? null,
            p_expected_image_version: approved.item_version ?? null,
            p_expected_image_url: approved.item_image_url ?? null,
            p_expected_item_snapshot: approved.expected_item_snapshot ?? null,
            p_expected_stock_qty: approved.expected_stock_qty ?? null,
            p_product: row.product,
            p_stock: row.stock,
            p_image_url: row.image?.kind === "url" ? row.image.url : null,
            p_has_image: row.image?.kind === "url",
          });
          if (error) {
            results.push({ ...approved, outcome: "invalid", errors: ["Row could not be applied; correct the data or preview again"] });
            continue;
          }
          appliedData = data;
        } catch (err) {
          results.push({ ...approved, outcome: "invalid", errors: [err instanceof Error ? err.message : "Row mutation failed"] });
          continue;
        }

        const applied = typeof appliedData === "string" ? JSON.parse(appliedData) : appliedData;
        let result: PreviewRow = { ...approved, item_id: applied.item_id, outcome: applied.outcome, field_diffs: applied.field_diffs ?? approved.field_diffs };
        if (attachment) {
          const imageState = approved.expected_item_snapshot ?? {};
          try {
            const published = await publishCatalogAttachment({
              batch_id: batch.batch_id,
              idempotency_key: idempotencyKey,
              source_row: row.source_row,
              actor_id: actor.id,
              tenant_id: actor.tenant_id,
              store_id: storeId!,
              item_id: applied.item_id,
              sku: row.product.sku,
              source_image_key: typeof imageState.image_key === "string" ? imageState.image_key : null,
              source_image_version: typeof imageState.image_version === "number" ? imageState.image_version : 0,
              file: attachment,
            }, imageAdapter!);
            if (!published.published) {
              const warningMsg = published.orphaned_key
                ? `Uploaded image candidate retained for review: ${published.orphaned_key}`
                : "Image publication failed before upload; no remote object was retained";
              result = {
                ...result,
                warnings: [...result.warnings, warningMsg, `Product was updated but image publication failed: ${published.error}`],
              };
            }
          } catch (pubErr) {
            result = {
              ...result,
              warnings: [...result.warnings, `Product was updated but image publication threw an exception: ${pubErr instanceof Error ? pubErr.message : "Unknown publication error"}`],
            };
          }
        }
        results.push(result);
      }

      const status = results.some((row) => row.errors.length) ? "partial" : "completed";
      const { error: finishError } = await client.rpc("catalog_import_batch_finish", {
        p_batch_row_id: batchRun.id,
        p_status: status,
        p_result: { batch_id: batch.batch_id, preview_hash: previewHash, rows: results },
      });
      requireNoError(finishError, "Catalog import rows were processed but the audit summary could not be saved");
      return results;
    },
  };
}
