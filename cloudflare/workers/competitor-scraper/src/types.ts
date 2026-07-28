/**
 * Frozen cross-agent contracts and internal domain types.
 * Do not modify shapes here without also updating Agent 1's database contract.
 */

export type CompetitorName = "chaldal" | "shwapno";

export type Currency = "BDT";

export interface ScrapedObservation {
  observation_key: string;
  competitor_product_id: string | null;
  competitor_product_url: string | null;
  product_name: string;
  competitor_price: number;
  competitor_original_price: number | null;
  currency: Currency;
  scraped_at: string;
  item_id: string | null;
  match_confidence: number | null;
  matcher_version: string;
  raw_data: Record<string, unknown>;
}

export interface IngestBatchResult {
  run_id: string;
  inserted: number;
  duplicates: number;
  rejected: number;
}

export interface MatchableItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  package_quantity: number | null;
  package_unit: string | null;
}

export interface NormalizedProduct {
  competitor_product_id: string | null;
  competitor_product_url: string | null;
  name: string;
  price: number;
  original_price: number | null;
  currency: Currency;
  package_quantity: number | null;
  package_unit: string | null;
  raw_data: Record<string, unknown>;
}

export interface MatchResult {
  item_id: string | null;
  confidence: number | null;
  matcher_version: string;
}

export interface RunSummary {
  run_id: string;
  scheduled_at: string;
  workflow_version: string;
  found: number;
  matched: number;
  unmatched: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  failed: number;
  competitors: Record<
    CompetitorName,
    {
      found: number;
      matched: number;
      unmatched: number;
      inserted: number;
      duplicates: number;
      rejected: number;
      failed: number;
      error: string | null;
    }
  >;
}

export interface ScrapeStepResult {
  competitor: CompetitorName;
  products: NormalizedProduct[];
  error: string | null;
}

export interface Adapter {
  name: CompetitorName;
  scrape(
    browserBinding: BrowserBinding,
    log: Logger,
  ): Promise<NormalizedProduct[]>;
}

export interface BrowserBinding {
  launch: (
    options?: Record<string, unknown>,
  ) => Promise<{
    close: () => Promise<void>;
    newPage: () => Promise<PageBinding>;
  }>;
}

export interface PageBinding {
  setViewport: (viewport: { width: number; height: number }) => Promise<void>;
  setUserAgent: (userAgent: string) => Promise<void>;
  setRequestInterception: (enabled: boolean) => Promise<void>;
  on: (event: string, handler: (req: RequestBinding) => void) => void;
  goto: (url: string, options?: Record<string, unknown>) => Promise<void | null>;
  waitForSelector: (
    selector: string,
    options?: { timeout?: number },
  ) => Promise<unknown>;
  evaluate: <T, A extends unknown[]>(fn: (...args: A) => T, ...args: A) => Promise<T>;
  close: () => Promise<void>;
}

export interface RequestBinding {
  resourceType: () => string;
  abort: (reason?: string) => Promise<void>;
  continue: () => Promise<void>;
  url: () => string;
}

export interface Logger {
  info: (msg: Record<string, unknown>) => void;
  error: (msg: Record<string, unknown>) => void;
  warn: (msg: Record<string, unknown>) => void;
}

export interface SupabaseClient {
  rpc: (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>;
  from: (table: string) => {
    select: (
      columns: string,
      options?: { head?: boolean; count?: "exact" },
    ) => Promise<{ data: unknown[] | null; error: Error | null; count: number | null }>;
    eq: (column: string, value: unknown) => {
      select: (
        columns: string,
        options?: { head?: boolean; count?: "exact" },
      ) => Promise<{ data: unknown[] | null; error: Error | null; count: number | null }>;
    };
  };
}
