import type { RunSummary } from "./types.ts";
import { isAutomationEnabled, isSourceApproved, parseStoreAllowlist } from "./keys.ts";

interface GateEnv {
  AUTOMATION_ENABLED: string;
  STORE_ALLOWLIST: string;
  CHALDAL_SOURCE_APPROVED: string;
  SHWAPNO_SOURCE_APPROVED: string;
}

export function evaluateRunGate(
  env: GateEnv,
): "automation-disabled" | "empty-allowlist" | "no-approved-sources" | null {
  if (!isAutomationEnabled(env)) return "automation-disabled";
  if (parseStoreAllowlist(env.STORE_ALLOWLIST).length === 0) return "empty-allowlist";
  if (!isSourceApproved(env, "chaldal") && !isSourceApproved(env, "shwapno")) {
    return "no-approved-sources";
  }
  return null;
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
    competitors: { chaldal: emptyCompetitor(), shwapno: emptyCompetitor() },
  };
}

function emptyCompetitor() {
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
