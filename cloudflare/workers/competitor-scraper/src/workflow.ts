import puppeteer from "@cloudflare/puppeteer";
import type {
  BrowserBinding,
  CompetitorName,
  MatchableItem,
  NormalizedProduct,
  RunSummary,
  ScrapedObservation,
} from "./types.ts";
import { createLogger } from "./logger.ts";
import {
  buildObservation,
  deterministicRunKey,
  isSourceApproved,
  parseStoreAllowlist,
  workflowVersion,
} from "./keys.ts";
import { runChaldalAdapter, runShwapnoAdapter } from "./adapters/index.ts";
import { matchAll } from "./matcher.ts";
import { createSupabaseClient, loadMatchableInventory } from "./supabase-client.ts";
import { ingestObservations } from "./ingest.ts";
import { buildNoOpSummary, evaluateRunGate } from "./workflow-gates.ts";
import type { Env } from "./index.ts";
import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

export interface WorkflowParams {
  scheduledAt?: string;
}

type WorkflowScalar = string | number | boolean | null;

type WorkflowProduct = Omit<NormalizedProduct, "raw_data"> & {
  raw_data: Record<string, WorkflowScalar>;
};

interface StepResult {
  competitor: CompetitorName;
  products: WorkflowProduct[];
  error: string | null;
}

export class CompetitorScrapeWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  override async run(event: Readonly<WorkflowEvent<WorkflowParams>>, step: WorkflowStep): Promise<RunSummary> {
    const env = this.env;
    const log = createLogger();
    const version = workflowVersion(env.WORKFLOW_VERSION);
    const scheduledAt =
      event.payload.scheduledAt ??
      new Date(event.schedule?.scheduledTime ?? event.timestamp).toISOString();

    const gate = evaluateRunGate(env);
    if (gate) {
      log.info({ message: `${gate}; no-op` });
      return buildNoOpSummary(gate, scheduledAt, version);
    }

    const runKey = deterministicRunKey(scheduledAt, version);
    const storeIds = parseStoreAllowlist(env.STORE_ALLOWLIST);

    log.info({
      message: "workflow started",
      run_key: runKey,
      scheduled_at: scheduledAt,
      workflow_version: version,
      store_count: storeIds.length,
    });

    const adapters: { name: CompetitorName; run: typeof runChaldalAdapter }[] = [];
    if (isSourceApproved(env, "chaldal")) adapters.push({ name: "chaldal", run: runChaldalAdapter });
    if (isSourceApproved(env, "shwapno")) adapters.push({ name: "shwapno", run: runShwapnoAdapter });

    const perCompetitorResults = new Map<CompetitorName, StepResult>();
    const browser: BrowserBinding = {
      launch: async () =>
        (await puppeteer.launch(env.BROWSER)) as unknown as Awaited<
          ReturnType<BrowserBinding["launch"]>
        >,
    };

    for (const adapter of adapters) {
      const result = await step.do(
        `scrape-${adapter.name}`,
        { retries: { limit: 2, delay: "5 seconds" } },
        async () => {
          const scrapeLog = createLogger(runKey);
          const adapterResult = await adapter.run(browser, scrapeLog);
          return {
            competitor: adapterResult.competitor,
            error: adapterResult.error,
            products: adapterResult.products as WorkflowProduct[],
          } satisfies StepResult;
        },
      );
      perCompetitorResults.set(adapter.name, result);
    }

    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const summary = buildEmptySummary(runKey, scheduledAt, version);

    for (const [competitor, scrapeResult] of perCompetitorResults) {
      if (scrapeResult.error) {
        summary.failed += 1;
        summary.competitors[competitor].error = scrapeResult.error;
        summary.competitors[competitor].failed = 1;
        continue;
      }

      summary.competitors[competitor].found = scrapeResult.products.length;
      summary.found += scrapeResult.products.length;

      for (const storeId of storeIds) {
        try {
          const storeResult = await step.do(
            `match-and-ingest-${competitor}-store-${storeId}`,
            {
              retries: { limit: 3, delay: "3 seconds", backoff: "exponential" },
              timeout: "5 minutes",
            },
            async () => {
              const inventory = await loadMatchableInventory(supabase, storeId);
              const matched = matchAll(scrapeResult.products, inventory);
              const observations: ScrapedObservation[] = [];
              let matchedCount = 0;
              let unmatchedCount = 0;

              for (const { product, result } of matched) {
                const item = result.item_id
                  ? inventory.find((candidate: MatchableItem) => candidate.id === result.item_id) ?? null
                  : null;
                if (item) matchedCount += 1;
                else unmatchedCount += 1;

                observations.push(
                  buildObservation(
                    runKey,
                    storeId,
                    competitor,
                    product,
                    item,
                    result.confidence,
                    result.matcher_version,
                    scheduledAt,
                  ),
                );
              }

              const ingest = await ingestObservations(
                { supabase, log: createLogger(runKey) },
                runKey,
                scheduledAt,
                competitor,
                storeId,
                observations,
              );
              return { ...ingest, matched: matchedCount, unmatched: unmatchedCount };
            },
          );

          summary.competitors[competitor].matched += storeResult.matched;
          summary.competitors[competitor].unmatched += storeResult.unmatched;
          summary.competitors[competitor].inserted += storeResult.inserted;
          summary.competitors[competitor].duplicates += storeResult.duplicates;
          summary.competitors[competitor].rejected += storeResult.rejected;
          summary.matched += storeResult.matched;
          summary.unmatched += storeResult.unmatched;
          summary.inserted += storeResult.inserted;
          summary.duplicates += storeResult.duplicates;
          summary.rejected += storeResult.rejected;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          summary.failed += 1;
          summary.competitors[competitor].failed += 1;
          summary.competitors[competitor].error = message;
          log.error({
            message: "store ingestion failed",
            competitor,
            store_id: storeId,
            error: message,
          });
        }
      }
    }

    log.info({
      message: "workflow completed",
      run_key: runKey,
      summary,
    });

    return summary;
  }
}

function buildEmptySummary(runId: string, scheduledAt: string, version: string): RunSummary {
  return {
    run_id: runId,
    scheduled_at: scheduledAt,
    workflow_version: version,
    found: 0,
    matched: 0,
    unmatched: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    failed: 0,
    competitors: { chaldal: emptyCompetitor(), shwapno: emptyCompetitor() },
  };
}

function emptyCompetitor() {
  return { found: 0, matched: 0, unmatched: 0, inserted: 0, duplicates: 0, rejected: 0, failed: 0, error: null };
}
