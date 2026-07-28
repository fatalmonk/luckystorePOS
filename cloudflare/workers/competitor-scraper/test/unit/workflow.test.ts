import { describe, expect, it } from "vitest";
import { buildNoOpSummary, evaluateRunGate } from "../../src/workflow-gates.ts";

const enabledEnv = {
  AUTOMATION_ENABLED: "true",
  STORE_ALLOWLIST: '["11111111-1111-4111-8111-111111111111"]',
  CHALDAL_SOURCE_APPROVED: "true",
  SHWAPNO_SOURCE_APPROVED: "false",
};

describe("workflow safety gates", () => {
  it("keeps committed automation disabled", () => {
    expect(evaluateRunGate({ ...enabledEnv, AUTOMATION_ENABLED: "false" })).toBe(
      "automation-disabled",
    );
  });

  it("requires an explicit valid store allowlist", () => {
    expect(evaluateRunGate({ ...enabledEnv, STORE_ALLOWLIST: "[]" })).toBe("empty-allowlist");
    expect(evaluateRunGate({ ...enabledEnv, STORE_ALLOWLIST: '["invalid"]' })).toBe(
      "empty-allowlist",
    );
  });

  it("requires legal approval for at least one adapter", () => {
    expect(
      evaluateRunGate({
        ...enabledEnv,
        CHALDAL_SOURCE_APPROVED: "false",
        SHWAPNO_SOURCE_APPROVED: "false",
      }),
    ).toBe("no-approved-sources");
  });

  it("permits an enabled, allowlisted, approved run", () => {
    expect(evaluateRunGate(enabledEnv)).toBeNull();
  });

  it("builds deterministic disabled summaries", () => {
    const first = buildNoOpSummary(
      "automation-disabled",
      "2026-07-29T21:00:00.000Z",
      "competitor-scrape-v1",
    );
    const second = buildNoOpSummary(
      "automation-disabled",
      "2026-07-29T21:00:00.000Z",
      "competitor-scrape-v1",
    );
    expect(first).toEqual(second);
    expect(first.found).toBe(0);
  });
});
