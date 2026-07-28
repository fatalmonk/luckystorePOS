import type { MatchableItem, SupabaseClient } from "./types.ts";

export async function loadMatchableInventory(
  supabase: SupabaseClient,
  storeId: string,
): Promise<MatchableItem[]> {
  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .eq("id", storeId)
    .select("tenant_id");
  if (storeError) {
    throw new Error(`Failed to load store: ${storeError.message}`);
  }
  const storeRow = stores?.[0] as Record<string, unknown> | undefined;
  const tenantId = typeof storeRow?.tenant_id === "string" ? storeRow.tenant_id : null;
  if (!tenantId) {
    throw new Error(`Store ${storeId} is not allowlisted in the database`);
  }

  const { data, error } = await supabase
    .from("items")
    .eq("tenant_id", tenantId)
    .select("id, name, sku, barcode", {
      count: "exact",
    });
  if (error) {
    throw new Error(`Failed to load inventory: ${error.message}`);
  }
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: typeof r.id === "string" ? r.id : "",
      name: typeof r.name === "string" ? r.name : "",
      sku: typeof r.sku === "string" ? r.sku : null,
      barcode: typeof r.barcode === "string" ? r.barcode : null,
      package_quantity: null,
      package_unit: null,
    };
  });
}

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return {
    rpc: async (name, params) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
          Prefer: "return=representation",
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: new Error(`Supabase RPC ${name} ${response.status}: ${text}`) };
      }
      const json: unknown = await response.json();
      return { data: json, error: null };
    },
    from: (table) => ({
      select: async (columns, options) => {
        const params = new URLSearchParams();
        if (options?.head) params.set("head", "on");
        if (options?.count) params.set("count", options.count);
        const queryString = params.toString();
        const base = `${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
        const endpoint = queryString ? `${base}&${queryString}` : base;
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
          },
        });
        if (!response.ok) {
          const text = await response.text();
          return { data: null, error: new Error(`Supabase select ${table} ${response.status}: ${text}`), count: null };
        }
        const json: unknown[] = await response.json();
        const range = response.headers.get("content-range");
        const count = range ? Number.parseInt(range.split("/").pop() ?? "0", 10) : null;
        return { data: json, error: null, count };
      },
      eq: (column: string, value: unknown) => {
        const chain = {
          select: async (columns: string, opts?: { head?: boolean; count?: "exact" }) => {
            const params = new URLSearchParams();
            params.set(column, `eq.${String(value)}`);
            if (opts?.head) params.set("head", "on");
            if (opts?.count) params.set("count", opts.count);
            const queryString = params.toString();
            const base = `${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
            const endpoint = queryString ? `${base}&${queryString}` : base;
            const response = await fetch(endpoint, {
              headers: {
                Authorization: `Bearer ${key}`,
                apikey: key,
              },
            });
            if (!response.ok) {
              const text = await response.text();
              return { data: null, error: new Error(`Supabase select ${table} ${response.status}: ${text}`), count: null };
            }
            const json: unknown[] = await response.json();
            const range = response.headers.get("content-range");
            const count = range ? Number.parseInt(range.split("/").pop() ?? "0", 10) : null;
            return { data: json, error: null, count };
          },
        };
        return chain;
      },
    }),
  };
}
