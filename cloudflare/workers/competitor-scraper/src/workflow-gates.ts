import type { CompetitorName, RunSummary } from "./types.ts";
import { isAutomationEnabled, isSourceApproved, parseStoreAllowlist, type SourceApprovalEnv } from "./keys.ts";

export type GateEnv = SourceApprovalEnv & {
  AUTOMATION_ENABLED: string;
  STORE_ALLOWLIST: string;
};

export const ALL_COMPETITORS: CompetitorName[] = [
  "chaldal",
  "shwapno",
  "khulshi-mart",
  "the-basket",
  "pai-mart",
];

export function evaluateRunGate(
  env: GateEnv,
): "automation-disabled" | "empty-allowlist" | "no-approved-sources" | null {
  if (!isAutomationEnabled(env)) return "automation-disabled";
  if (parseStoreAllowlist(env.STORE_ALLOWLIST).length === 0) return "empty-allowlist";
  const hasApprovedSource = ALL_COMPETITORS.some((comp) => isSourceApproved(env, comp));
  if (!hasApprovedSource) {
    return "no-approved-sources";
  }
  return null;
}

export function emptyCompetitorSummary() {
  return {
    found: 0,
    matched: 0,
    unmatched: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    failed: 0,
    error: null,
  };
}

export function buildEmptyCompetitorsMap(): Record<CompetitorName, ReturnType<typeof emptyCompetitorSummary>> {
  return ALL_COMPETITORS.reduce((acc, name) => {
    acc[name] = emptyCompetitorSummary();
    return acc;
  }, {} as Record<CompetitorName, ReturnType<typeof emptyCompetitorSummary>>);
}

export function buildNoOpSummary(
  reason: string,
  scheduledAt: string,
  version: string,
): RunSummary {
  return {
    run_id: `noop-${reason}`,
    scheduled_at: scheduledAt,
    workflow_version: version,
    found: 0,
    matched: 0,
    unmatched: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    failed: 0,
    competitors: buildEmptyCompetitorsMap(),
  };
}
