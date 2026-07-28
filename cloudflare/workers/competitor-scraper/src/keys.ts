import type { CompetitorName, MatchableItem, NormalizedProduct, ScrapedObservation } from "./types.ts";

const WORKFLOW_VERSION = "competitor-scrape-v1";

export function workflowVersion(configuredVersion?: string): string {
  return configuredVersion?.trim() || WORKFLOW_VERSION;
}

export function deterministicRunKey(scheduledAt: string | Date, version = WORKFLOW_VERSION): string {
  const ts = typeof scheduledAt === "string" ? scheduledAt : scheduledAt.toISOString();
  // Truncate to minute so duplicate scheduled timestamps from Workflow retries produce the same key.
  const minute = ts.slice(0, 16);
  return `${version}::${minute}`;
}

export function deterministicObservationKey(
  runKey: string,
  competitor: CompetitorName,
  competitorProductId: string | null,
  productName: string,
  storeId: string,
): string {
  const idPart = competitorProductId ?? normalizeForKey(productName);
  return `${runKey}::${competitor}::${idPart}::${storeId}`;
}

export function normalizeForKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildObservation(
  runKey: string,
  storeId: string,
  competitor: CompetitorName,
  product: NormalizedProduct,
  item: MatchableItem | null,
  confidence: number | null,
  matcherVersion: string,
  scrapedAt?: string,
): ScrapedObservation {
  return {
    observation_key: deterministicObservationKey(
      runKey,
      competitor,
      product.competitor_product_id,
      product.name,
      storeId,
    ),
    competitor_product_id: product.competitor_product_id,
    competitor_product_url: product.competitor_product_url,
    product_name: product.name,
    competitor_price: product.price,
    competitor_original_price: product.original_price,
    currency: product.currency,
    scraped_at: scrapedAt ?? nowIso(),
    item_id: item?.id ?? null,
    match_confidence: confidence,
    matcher_version: matcherVersion,
    raw_data: product.raw_data,
  };
}

export function parseStoreAllowlist(input: string): string[] {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (value): value is string =>
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              value,
            ),
        ),
      ),
    ];
  } catch {
    return [];
  }
}

export function isAutomationEnabled(env: { AUTOMATION_ENABLED: string }): boolean {
  return env.AUTOMATION_ENABLED === "true";
}

type SourceApprovalEnv = { CHALDAL_SOURCE_APPROVED: string; SHWAPNO_SOURCE_APPROVED: string };

const SOURCE_APPROVED_KEYS: Record<CompetitorName, keyof SourceApprovalEnv> = {
  chaldal: "CHALDAL_SOURCE_APPROVED",
  shwapno: "SHWAPNO_SOURCE_APPROVED",
};

export function isSourceApproved(env: SourceApprovalEnv, competitor: CompetitorName): boolean {
  return env[SOURCE_APPROVED_KEYS[competitor]] === "true";
}
