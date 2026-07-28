import type { IngestBatchResult, Logger, ScrapedObservation, SupabaseClient } from "./types.ts";

export const INGEST_CHUNK_SIZE = 100;
export const INGEST_RPC_NAME = "ingest_competitor_scrape_batch";

export interface IngestDependencies {
  supabase: SupabaseClient;
  log: Logger;
}

export async function ingestObservations(
  deps: IngestDependencies,
  runId: string,
  scheduledAt: string,
  competitor: string,
  storeId: string,
  observations: ScrapedObservation[],
): Promise<IngestBatchResult> {
  const totals: IngestBatchResult = { run_id: "", inserted: 0, duplicates: 0, rejected: 0 };

  for (let i = 0; i < observations.length; i += INGEST_CHUNK_SIZE) {
    const chunk = observations.slice(i, i + INGEST_CHUNK_SIZE);
    const summary = {
      chunk_index: i / INGEST_CHUNK_SIZE,
      chunk_size: chunk.length,
      run_id: runId,
    };

    const { data, error } = await deps.supabase.rpc(INGEST_RPC_NAME, {
      p_run_key: runId,
      p_scheduled_at: scheduledAt,
      p_competitor: competitor,
      p_store_id: storeId,
      p_observations: chunk,
      p_summary: summary,
    });

    if (error) {
      throw new Error(`ingest chunk failed: ${error.message}`);
    }

    const parsed = parseResult(data);
    if (totals.run_id && totals.run_id !== parsed.run_id) {
      throw new Error("ingest chunks returned inconsistent run_id values");
    }
    totals.run_id = parsed.run_id;
    totals.inserted += parsed.inserted;
    totals.duplicates += parsed.duplicates;
    totals.rejected += parsed.rejected;
  }

  return totals;
}

function parseResult(data: unknown): IngestBatchResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("ingest RPC returned a non-object response");
  }

  const obj = data as Record<string, unknown>;
  const expectedKeys = ["duplicates", "inserted", "rejected", "run_id"];
  const actualKeys = Object.keys(obj).sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error("ingest RPC response does not match the frozen four-field contract");
  }

  if (typeof obj.run_id !== "string" || obj.run_id.length === 0) {
    throw new Error("ingest RPC returned an invalid run_id");
  }

  const inserted = parseCount(obj.inserted, "inserted");
  const duplicates = parseCount(obj.duplicates, "duplicates");
  const rejected = parseCount(obj.rejected, "rejected");

  return { run_id: obj.run_id, inserted, duplicates, rejected };
}

function parseCount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`ingest RPC returned an invalid ${field} count`);
  }
  return value;
}

export async function retryableIngest(
  deps: IngestDependencies,
  runId: string,
  scheduledAt: string,
  competitor: string,
  storeId: string,
  observations: ScrapedObservation[],
): Promise<IngestBatchResult> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await ingestObservations(deps, runId, scheduledAt, competitor, storeId, observations);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        deps.log.warn({
          message: "ingest attempt failed, retrying",
          competitor,
          store_id: storeId,
          attempt,
          error: lastError.message,
        });
      }
    }
  }
  throw lastError ?? new Error("ingest failed after retries");
}
