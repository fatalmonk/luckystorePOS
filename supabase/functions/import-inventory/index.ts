import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Simple CSV parser - handles basic CSV with quoted fields
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers: string[] = [];
  const rows: Record<string, string>[] = [];
  
  // Parse header line
  const headerLine = lines[0];
  let currentField = '';
  let inQuotes = false;
  const headerFields: string[] = [];
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      headerFields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  headerFields.push(currentField.trim());
  
  // Parse data rows
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;
    
    const fields: string[] = [];
    currentField = '';
    inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    // Create row object
    const row: Record<string, string> = {};
    headerFields.forEach((header, idx) => {
      row[header] = fields[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserRole = "admin" | "manager" | "cashier" | "stock";

interface ImportError {
  row: number;
  code: string;
  error: string;
}

interface ParsedRow {
  rowNumber: number;
  name: string;
  barcode: string | null;
  sku: string | null;
  shortCode: string | null;
  brand: string | null;
  groupTag: string | null;
  categoryName: string | null;
  description: string | null;
  supplier: string | null;
  batchCode: string | null;
  expiryDate: string | null;
  imageUrl: string | null;
  cost: number;
  price: number;
  stockQty: number;
  storeCode: string | null;
}

interface ImportSummary {
  import_run_id: string | null;
  rows_total: number;
  rows_valid: number;
  rows_processed: number;
  rows_succeeded: number;
  rows_failed: number;
  parse_errors: number;
  row_errors: number;
  system_errors: number;
  items_inserted: number;
  items_updated: number;
  batches_created: number;
  stock_created: number;
  stock_updated: number;
  stock_movements: number;
  barcodes_generated: number;
  images_uploaded: number;
  next_row_index?: number;
  processing_complete?: boolean;
  can_resume?: boolean;
  is_dry_run?: boolean;
  import_file_name?: string;
  errors: ImportError[];
}

const ALLOWED_IMPORT_ROLES: UserRole[] = ["admin", "manager"];
const DEFAULT_CHUNK_SIZE = 300;
const MAX_CHUNK_SIZE = 1000;

function chunkArray<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNonNegativeNumber(value: unknown, fieldName: string): number {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  
  // Strip out currency symbols, commas, and letters (e.g. "95 BDT" -> "95", "1,000.50" -> "1000.50")
  let cleanValue = String(value).replace(/[^0-9.-]/g, '');
  if (cleanValue === "") return 0;

  const parsed = Number(cleanValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  const parsed = parseNonNegativeNumber(value, fieldName);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
}

function parseExpiryDate(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  // CSV dates are parsed as strings - handle various formats
  const dateStr = String(value).trim();
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

function generateEAN13(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(base[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return base + checksum.toString();
}

function clampChunkSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CHUNK_SIZE;
  }
  return Math.min(Math.floor(parsed), MAX_CHUNK_SIZE);
}

function createEmptySummary(): ImportSummary {
  return {
    import_run_id: null,
    rows_total: 0,
    rows_valid: 0,
    rows_processed: 0,
    rows_succeeded: 0,
    rows_failed: 0,
    parse_errors: 0,
    row_errors: 0,
    system_errors: 0,
    items_inserted: 0,
    items_updated: 0,
    batches_created: 0,
    stock_created: 0,
    stock_updated: 0,
    stock_movements: 0,
    barcodes_generated: 0,
    images_uploaded: 0,
    next_row_index: 0,
    processing_complete: false,
    can_resume: false,
    import_file_name: undefined,
    errors: [],
  };
}

async function uploadImageToStorage(
  supabaseClient: ReturnType<typeof createClient>,
  file: File,
  itemName: string,
): Promise<string> {
  const bucket = "item-images";
  const ext = file.name.split(".").pop() || "jpg";
  const sanitizedName = itemName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .substring(0, 50);
  const storagePath = `items/${sanitizedName}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type || `image/${ext}`,
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let importRunId: string | null = null;
  const startTime = Date.now();
  const contentType = req.headers.get("content-type") ?? "";
  const summary: ImportSummary = createEmptySummary();

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let actorProfile: { id: string; role: UserRole } | null = null;
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const token = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Authorization token missing" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid JWT token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile, error: actorError } = await supabaseClient
        .from("users")
        .select("id, role")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (actorError || !profile || !ALLOWED_IMPORT_ROLES.includes(profile.role as UserRole)) {
        return new Response(JSON.stringify({ error: "Only admin/manager can run inventory import" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actorProfile = { id: profile.id, role: profile.role as UserRole };
    } catch {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!actorProfile) {
      return new Response(JSON.stringify({ error: "Only admin/manager can run inventory import" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const requestedImportRunId = normalizeText(form.get("import_run_id"));
    const chunkSize = clampChunkSize(form.get("max_rows"));
    const isDryRun = form.get("dry_run") === "true";
    const mappingsRaw = normalizeText(form.get("mappings"));
    const mappings = mappingsRaw ? JSON.parse(mappingsRaw) : null;

    const file = form.get("file") as File | null;
    if (!file && !requestedImportRunId) {
      return new Response(JSON.stringify({ error: "File missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    summary.is_dry_run = isDryRun;

    let existingRunSummary: ImportSummary | null = null;
    if (requestedImportRunId) {
      const { data: existingRun, error: existingRunError } = await supabaseClient
        .from("import_runs")
        .select("id, initiated_by, summary, status")
        .eq("id", requestedImportRunId)
        .maybeSingle();
      if (existingRunError || !existingRun) {
        return new Response(JSON.stringify({ error: "import_run_id not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existingRun.initiated_by && existingRun.initiated_by !== actorProfile.id) {
        return new Response(JSON.stringify({ error: "You are not allowed to resume this import run" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      importRunId = existingRun.id;
      existingRunSummary = (existingRun.summary as ImportSummary | null) ?? null;
      Object.assign(summary, createEmptySummary(), existingRunSummary ?? {});
      summary.import_run_id = importRunId;
      summary.errors = Array.isArray(existingRunSummary?.errors) ? existingRunSummary!.errors : [];
      summary.processing_complete = false;
      summary.can_resume = true;
    } else if (file) {
      const { data: importRun, error: importRunError } = await supabaseClient
        .from("import_runs")
        .insert({
          file_name: file.name,
          initiated_by: actorProfile.id,
          status: "running",
        })
        .select("id")
        .maybeSingle();
      if (!importRunError && importRun?.id) {
        importRunId = importRun.id;
        summary.import_run_id = importRunId;
      }
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Resume requests must include the same source file", import_run_id: importRunId }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    summary.import_file_name = file.name;

    const imageFiles = new Map<string, File>();
    for (const [key, value] of form.entries()) {
      if (key.startsWith("image_") && value instanceof File) {
        imageFiles.set(key.replace("image_", ""), value);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileText = new TextDecoder().decode(arrayBuffer);
    const rawRows: Record<string, string>[] = parseCSV(fileText);
    
    if (rawRows.length === 0) {
      return new Response(JSON.stringify({ error: "No data rows found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    summary.rows_total = rawRows.length;
    const resumeStartIndex = Math.max(0, Number(summary.next_row_index ?? 0));
    const collectParseErrors = resumeStartIndex === 0;

    const parsedRows: ParsedRow[] = [];
    const seenBarcodes = new Map<string, number>();
    const seenSkus = new Map<string, number>();

    // Helper to get value from row based on mapping or fallback
    const getValue = (row: Record<string, unknown>, internalField: string, fallbacks: string[]) => {
      if (mappings && mappings[internalField]) {
        return row[mappings[internalField]];
      }
      for (const fallback of fallbacks) {
        if (row[fallback] !== undefined) return row[fallback];
      }
      return undefined;
    };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2;

      try {
        const name = normalizeText(getValue(row, "name", ["name", "Name", "title", "Title"]));
        if (!name) {
          throw new Error("Missing name/title column");
        }

        let barcode = normalizeText(getValue(row, "barcode", ["barcode", "Barcode", "gtin", "GTIN", "EAN"]));
        if (!barcode) {
          barcode = generateEAN13();
          if (collectParseErrors) {
            summary.barcodes_generated++;
          }
        }

        const sku = normalizeText(getValue(row, "sku", ["sku", "SKU", "id", "ID"]));
        const shortCode = normalizeText(getValue(row, "short_code", ["short_code", "shortCode", "Short Code"]));
        const brand = normalizeText(getValue(row, "brand", ["brand", "Brand"]));
        const groupTag = normalizeText(getValue(row, "group_tag", ["group_tag", "groupTag", "item_group_id", "Group Tag"]));
        const categoryName = normalizeText(getValue(row, "category", ["category", "Category", "google_product_category"]));
        const description = normalizeText(getValue(row, "description", ["description", "Description"]));
        
        const supplier = normalizeText(getValue(row, "supplier", ["supplier", "Supplier"]));
        const batchCode = normalizeText(getValue(row, "batch_code", ["batch_code", "Batch Code"]));
        const expiryDate = parseExpiryDate(getValue(row, "expiry_date", ["expiry_date", "Expiry Date"]));
        const imageUrl = normalizeText(getValue(row, "image_url", ["image_url", "imageUrl", "image_link", "Image URL"]));
        
        const cost = parseNonNegativeNumber(getValue(row, "cost", ["cost", "Cost"]), "cost");
        const price = parseNonNegativeNumber(getValue(row, "price", ["price", "Price"]), "price");
        const stockQty = parseNonNegativeInteger(getValue(row, "stock_qty", ["stock_qty", "Stock Qty", "quantity", "Quantity"]), "stock_qty");
        const storeCode = normalizeText(getValue(row, "store_code", ["store_code", "Store Code"]));

        // If stock_qty is supplied but store_code is absent, skip the stock movement
        // rather than hard-failing the row. The item will still be upserted correctly.
        const effectiveStockQty = (stockQty > 0 && !storeCode) ? 0 : stockQty;

        if (barcode) {
          const seenAt = seenBarcodes.get(barcode);
          if (seenAt) {
            throw new Error(`Duplicate barcode in file (already used in row ${seenAt})`);
          }
          seenBarcodes.set(barcode, rowNumber);
        }

        if (sku) {
          const seenAt = seenSkus.get(sku);
          if (seenAt) {
            throw new Error(`Duplicate sku in file (already used in row ${seenAt})`);
          }
          seenSkus.set(sku, rowNumber);
        }

        parsedRows.push({
          rowNumber,
          name,
          barcode,
          sku,
          shortCode,
          brand,
          groupTag,
          categoryName,
          description,
          supplier,
          batchCode,
          expiryDate,
          imageUrl,
          cost,
          price,
          stockQty: effectiveStockQty,
          storeCode,
        });
      } catch (err: unknown) {
        if (collectParseErrors) {
          summary.errors.push({
            row: rowNumber,
            code: "VALIDATION_ERROR",
            error: err instanceof Error ? err.message : "Invalid row",
          });
          summary.parse_errors++;
        }
      }
    }

    summary.rows_valid = parsedRows.length;
    const startRowIndex = resumeStartIndex;
    const processRows = parsedRows.slice(startRowIndex, startRowIndex + chunkSize);

    const categoryNames = [...new Set(parsedRows.map((r) => r.categoryName).filter(Boolean) as string[])];
    const storeCodes = [...new Set(parsedRows.map((r) => r.storeCode).filter(Boolean) as string[])];
    const barcodes = [...new Set(parsedRows.map((r) => r.barcode).filter(Boolean) as string[])];
    const skus = [...new Set(parsedRows.map((r) => r.sku).filter(Boolean) as string[])];

    const categoryMap = new Map<string, string>();
    for (const chunk of chunkArray(categoryNames, 100)) {
      const { data, error } = await supabaseClient.from("categories").select("id, name").in("name", chunk);
      if (error) throw error;
      for (const row of data ?? []) {
        categoryMap.set(row.name, row.id);
      }
    }

    const missingCategoryNames = categoryNames.filter((name) => !categoryMap.has(name));
    if (missingCategoryNames.length > 0) {
      const { error } = await supabaseClient.from("categories").upsert(
        missingCategoryNames.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: false },
      );
      if (error) {
        summary.errors.push({
          row: 0,
          code: "CATEGORY_CREATE_FAILED",
          error: `Could not ensure categories: ${error.message}`,
        });
        summary.system_errors++;
      }
      const { data: refreshedCategories, error: refreshCategoryError } = await supabaseClient
        .from("categories")
        .select("id, name")
        .in("name", missingCategoryNames);
      if (refreshCategoryError) throw refreshCategoryError;
      for (const row of refreshedCategories ?? []) {
        categoryMap.set(row.name, row.id);
      }
    }

    const storeMap = new Map<string, string>();
    for (const chunk of chunkArray(storeCodes, 100)) {
      const { data, error } = await supabaseClient.from("stores").select("id, code").in("code", chunk);
      if (error) throw error;
      for (const row of data ?? []) {
        storeMap.set(row.code, row.id);
      }
    }

    const itemByBarcode = new Map<string, { id: string; barcode: string | null; sku: string | null }>();
    const itemBySku = new Map<string, { id: string; barcode: string | null; sku: string | null }>();

    for (const chunk of chunkArray(barcodes, 100)) {
      const { data, error } = await supabaseClient
        .from("items")
        .select("id, barcode, sku")
        .in("barcode", chunk);
      if (error) throw error;
      for (const item of data ?? []) {
        if (item.barcode) itemByBarcode.set(item.barcode, item);
        if (item.sku) itemBySku.set(item.sku, item);
      }
    }

    for (const chunk of chunkArray(skus, 100)) {
      const { data, error } = await supabaseClient
        .from("items")
        .select("id, barcode, sku")
        .in("sku", chunk);
      if (error) throw error;
      for (const item of data ?? []) {
        if (item.barcode) itemByBarcode.set(item.barcode, item);
        if (item.sku) itemBySku.set(item.sku, item);
      }
    }

    for (const row of processRows) {
      summary.rows_processed++;

      try {
        if (row.storeCode && !storeMap.has(row.storeCode)) {
          throw new Error(`Store code '${row.storeCode}' not found`);
        }

        const categoryId = row.categoryName ? categoryMap.get(row.categoryName) ?? null : null;
        let existingByBarcode = row.barcode ? itemByBarcode.get(row.barcode) ?? null : null;
        let existingBySku = row.sku ? itemBySku.get(row.sku) ?? null : null;

        if (existingByBarcode && existingBySku && existingByBarcode.id !== existingBySku.id) {
          throw new Error("Barcode and SKU match different existing items");
        }

        const existingItem = existingByBarcode ?? existingBySku;
        let imageUrl = row.imageUrl;

        if (imageFiles.has(row.name)) {
          try {
            imageUrl = await uploadImageToStorage(supabaseClient, imageFiles.get(row.name)!, row.name);
            summary.images_uploaded++;
          } catch (err: unknown) {
            console.error(`Image upload failed for ${row.name}:`, err);
          }
        }

        let itemId: string;
        if (existingItem) {
          itemId = existingItem.id;
          if (!isDryRun) {
            const { data: updatedItem, error: updateError } = await supabaseClient
              .from("items")
              .update({
                name: row.name,
                barcode: row.barcode,
                sku: row.sku,
                short_code: row.shortCode,
                brand: row.brand,
                group_tag: row.groupTag,
                category_id: categoryId,
                description: row.description,
                cost: row.cost,
                price: row.price,
                image_url: imageUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", itemId)
              .select("id, barcode, sku")
              .single();
            if (updateError) throw updateError;
            if (updatedItem.barcode) itemByBarcode.set(updatedItem.barcode, updatedItem);
            if (updatedItem.sku) itemBySku.set(updatedItem.sku, updatedItem);
          }
          summary.items_updated++;
        } else {
          if (!isDryRun) {
            const { data: insertedItem, error: insertError } = await supabaseClient
              .from("items")
              .insert({
                name: row.name,
                barcode: row.barcode,
                sku: row.sku,
                short_code: row.shortCode,
                brand: row.brand,
                group_tag: row.groupTag,
                category_id: categoryId,
                description: row.description,
                cost: row.cost,
                price: row.price,
                image_url: imageUrl,
              })
              .select("id, barcode, sku")
              .single();
            if (insertError) throw insertError;
            itemId = insertedItem.id;
            if (insertedItem.barcode) itemByBarcode.set(insertedItem.barcode, insertedItem);
            if (insertedItem.sku) itemBySku.set(insertedItem.sku, insertedItem);
          } else {
            itemId = crypto.randomUUID(); // Mock ID for dry run
          }
          summary.items_inserted++;
        }

        let batchId: string | null = null;
        if (row.batchCode || row.expiryDate || row.supplier) {
          if (!isDryRun) {
            const { data: batch, error: batchError } = await supabaseClient
              .from("batches")
              .insert({
                item_id: itemId,
                batch_code: row.batchCode,
                supplier: row.supplier,
                expiry_date: row.expiryDate,
                qty: row.stockQty > 0 ? row.stockQty : 0,
              })
              .select("id")
              .single();
            if (batchError) throw batchError;
            batchId = batch.id;
          }
          summary.batches_created++;
        }

        if (row.stockQty > 0 && row.storeCode) {
          const storeId = storeMap.get(row.storeCode)!;
          if (!isDryRun) {
            const { data: wasCreated, error: stockApplyError } = await supabaseClient.rpc(
              "import_apply_stock_delta",
              {
                p_store_id: storeId,
                p_item_id: itemId,
                p_delta: row.stockQty,
              },
            );
            if (stockApplyError) throw stockApplyError;
            if (wasCreated) {
              summary.stock_created++;
            } else {
              summary.stock_updated++;
            }

            const { error: movementError } = await supabaseClient.from("stock_movements").insert({
              store_id: storeId,
              item_id: itemId,
              batch_id: batchId,
              delta: row.stockQty,
              reason: "import",
              meta: { source: "inventory-import", row: row.rowNumber },
              performed_by: actorProfile?.id ?? null,
            });
            if (movementError) throw movementError;
          } else {
            summary.stock_updated++;
          }
          summary.stock_movements++;
        }

        summary.rows_succeeded++;
      } catch (err: unknown) {
        summary.errors.push({
          row: row.rowNumber,
          code: "ROW_PROCESSING_ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        summary.row_errors++;
      }
    }

    const finishedAllRows = startRowIndex + processRows.length >= parsedRows.length;
    summary.next_row_index = finishedAllRows ? parsedRows.length : startRowIndex + processRows.length;
    summary.processing_complete = finishedAllRows;
    summary.can_resume = !finishedAllRows;
    summary.rows_failed = summary.parse_errors + summary.row_errors + summary.system_errors;

    if (importRunId) {
      await supabaseClient
        .from("import_runs")
        .update({
          status: finishedAllRows ? "completed" : "running",
          row_count: summary.rows_total,
          rows_succeeded: summary.rows_succeeded,
          rows_failed: summary.rows_failed,
          duration_ms: Date.now() - startTime,
          error_count: summary.rows_failed,
          summary,
          finished_at: finishedAllRows ? new Date().toISOString() : null,
        })
        .eq("id", importRunId);
    }

    return new Response(
      JSON.stringify({
        ...summary,
        chunk_rows_processed: processRows.length,
        chunk_size: chunkSize,
      }),
      {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    try {
      if (importRunId) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await supabaseClient
          .from("import_runs")
          .update({
            status: "failed",
            row_count: summary.rows_total,
            rows_succeeded: summary.rows_succeeded,
            rows_failed: summary.parse_errors + summary.row_errors + summary.system_errors,
            duration_ms: Date.now() - startTime,
            error_count: summary.parse_errors + summary.row_errors + summary.system_errors,
            summary: { ...summary, fatal_error: errorMessage },
            finished_at: new Date().toISOString(),
          })
          .eq("id", importRunId);
      }
    } catch {
      // noop
    }

    return new Response(JSON.stringify({ error: errorMessage, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

