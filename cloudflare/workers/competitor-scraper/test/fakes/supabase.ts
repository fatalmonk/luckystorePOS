import type { IngestBatchResult, SupabaseClient } from "../../src/types.ts";

export interface FakeSupabaseClient extends SupabaseClient {
  calls: Array<{ name: string; params: Record<string, unknown> }>;
}

interface FakeOptions {
  inventory?: Array<{
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
  }>;
  ingestResult?: IngestBatchResult;
  rpcFailuresBeforeSuccess?: number;
  storeTenantId?: string | null;
}

export function createFakeSupabaseClient(options: FakeOptions = {}): FakeSupabaseClient {
  const calls: FakeSupabaseClient["calls"] = [];
  let remainingFailures = options.rpcFailuresBeforeSuccess ?? 0;

  return {
    calls,
    rpc: async (name: string, params: Record<string, unknown>) => {
      calls.push({ name, params });
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        return { data: null, error: new Error("RPC failed") };
      }
      const observations = Array.isArray(params.p_observations) ? params.p_observations : [];
      return {
        data: options.ingestResult ?? {
          run_id: typeof params.p_run_key === "string" ? params.p_run_key : "",
          inserted: observations.length,
          duplicates: 0,
          rejected: 0,
        },
        error: null,
      };
    },
    from: (table: string) => ({
      select: async (columns: string) => {
        if (table === "items") {
          return {
            data: options.inventory ?? [],
            error: null,
            count: options.inventory?.length ?? 0,
          };
        }
        return {
          data: null,
          error: new Error(`Unknown unfiltered table ${table} ${columns}`),
          count: null,
        };
      },
      eq: (column: string, value: unknown) => ({
        select: async (columns: string) => {
          void column;
          void value;
          void columns;
          if (table === "stores") {
            const tenantId =
              options.storeTenantId === undefined ? "tenant-1" : options.storeTenantId;
            return {
              data: tenantId ? [{ tenant_id: tenantId }] : [],
              error: null,
              count: tenantId ? 1 : 0,
            };
          }
          if (table === "items") {
            return {
              data: options.inventory ?? [],
              error: null,
              count: options.inventory?.length ?? 0,
            };
          }
          return {
            data: null,
            error: new Error(`Unknown table ${table}`),
            count: null,
          };
        },
      }),
    }),
  };
}
