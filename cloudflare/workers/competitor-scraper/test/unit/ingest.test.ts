import { describe, expect, it } from "vitest";
import { ingestObservations, retryableIngest } from "../../src/ingest.ts";
import { createFakeSupabaseClient } from "../fakes/supabase.ts";
import { createLogger } from "../../src/logger.ts";
import type { IngestBatchResult, ScrapedObservation } from "../../src/types.ts";

const observations: ScrapedObservation[] = [
  {
    observation_key: "k1",
    competitor_product_id: "p1",
    competitor_product_url: null,
    product_name: "A",
    competitor_price: 10,
    competitor_original_price: null,
    currency: "BDT",
    scraped_at: "2026-07-29T00:00:00Z",
    item_id: "item-1",
    match_confidence: 0.95,
    matcher_version: "matcher-v1",
    raw_data: {},
  },
];

describe("ingest", () => {
  it("chunks observations and returns totals", async () => {
    const supabase = createFakeSupabaseClient();
    const result = await ingestObservations(
      { supabase, log: createLogger() },
      "run-1",
      "2026-07-29T00:00:00Z",
      "chaldal",
      "store-1",
      observations,
    );
    expect(result.inserted).toBe(1);
    expect(result.rejected).toBe(0);
  });

  it("returns rejected rows reported by the RPC", async () => {
    const supabase = createFakeSupabaseClient({
      ingestResult: { run_id: "database-run-id", inserted: 0, duplicates: 0, rejected: 1 },
    });
    const result = await ingestObservations(
      { supabase, log: createLogger() },
      "run-1",
      "2026-07-29T00:00:00Z",
      "chaldal",
      "store-1",
      observations,
    );
    expect(result.run_id).toBe("database-run-id");
    expect(result.rejected).toBe(1);
  });

  it("rejects response fields outside the frozen contract", async () => {
    const supabase = createFakeSupabaseClient({
      ingestResult: {
        run_id: "database-run-id",
        inserted: 1,
        duplicates: 0,
        rejected: 0,
        cleaned: 3,
      } as unknown as IngestBatchResult,
    });

    await expect(
      ingestObservations(
        { supabase, log: createLogger() },
        "run-1",
        "2026-07-29T00:00:00Z",
        "chaldal",
        "store-1",
        observations,
      ),
    ).rejects.toThrow("frozen four-field contract");
  });

  it("rejects non-numeric count fields", async () => {
    const supabase = createFakeSupabaseClient({
      ingestResult: {
        run_id: "database-run-id",
        inserted: "1",
        duplicates: 0,
        rejected: 0,
      } as unknown as IngestBatchResult,
    });

    await expect(
      ingestObservations(
        { supabase, log: createLogger() },
        "run-1",
        "2026-07-29T00:00:00Z",
        "chaldal",
        "store-1",
        observations,
      ),
    ).rejects.toThrow("invalid inserted count");
  });

  it("retryableIngest fails after three RPC errors", async () => {
    const supabase = createFakeSupabaseClient({ rpcFailuresBeforeSuccess: 3 });
    await expect(
      retryableIngest(
        { supabase, log: createLogger() },
        "run-1",
        "2026-07-29T00:00:00Z",
        "chaldal",
        "store-1",
        observations,
      ),
    ).rejects.toThrow("ingest chunk failed");
    expect(supabase.calls).toHaveLength(3);
  });

  it("retryableIngest succeeds when RPC recovers", async () => {
    const supabase = createFakeSupabaseClient({ rpcFailuresBeforeSuccess: 2 });
    const result = await retryableIngest(
      { supabase, log: createLogger() },
      "run-1",
      "2026-07-29T00:00:00Z",
      "chaldal",
      "store-1",
      observations,
    );
    expect(result.inserted).toBe(1);
    expect(supabase.calls).toHaveLength(3);
  });
});
