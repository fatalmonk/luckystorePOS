import { CompetitorScrapeWorkflow } from "./workflow.ts";
export { CompetitorScrapeWorkflow };

import type { WorkflowParams } from "./workflow.ts";

export interface Env {
  BROWSER: Fetcher;
  COMPETITOR_SCRAPE_WORKFLOW: Workflow<WorkflowParams>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AUTOMATION_ENABLED: string;
  WORKFLOW_VERSION: string;
  STORE_ALLOWLIST: string;
  CHALDAL_SOURCE_APPROVED: string;
  SHWAPNO_SOURCE_APPROVED: string;
}

// No public fetch handler. The Workflow is triggered only by its direct schedule.
export default {};
