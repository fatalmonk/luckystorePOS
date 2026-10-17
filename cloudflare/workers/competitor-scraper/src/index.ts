import { CompetitorScrapeWorkflow } from "./workflow.ts";
export { CompetitorScrapeWorkflow };

import type { WorkflowParams } from "./workflow.ts";
import type { SupabaseClient } from "./types.ts";

export interface Env {
  BROWSER: Fetcher;
  COMPETITOR_SCRAPE_WORKFLOW: Workflow<WorkflowParams>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_CLIENT?: SupabaseClient;
  AUTOMATION_ENABLED: string;
  WORKFLOW_VERSION: string;
  STORE_ALLOWLIST: string;
  CHALDAL_SOURCE_APPROVED: string;
  SHWAPNO_SOURCE_APPROVED: string;
  KHULSHI_MART_SOURCE_APPROVED?: string;
  THE_BASKET_SOURCE_APPROVED?: string;
  PAI_MART_SOURCE_APPROVED?: string;
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const scheduledAt = new Date(controller.scheduledTime).toISOString();
    const runKey = `competitor-scrape-v1::${scheduledAt.slice(0, 16)}`;
    await env.COMPETITOR_SCRAPE_WORKFLOW.create({
      id: runKey,
      params: { scheduledAt },
    });
  },
};
