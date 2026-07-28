import { describe, expect, it } from "vitest";
import {
  buildObservation,
  deterministicObservationKey,
  deterministicRunKey,
  isAutomationEnabled,
  isSourceApproved,
  parseStoreAllowlist,
  workflowVersion,
} from "../../src/keys.ts";
import type { NormalizedProduct } from "../../src/types.ts";

describe("keys", () => {
  it("returns stable workflow version", () => {
    expect(workflowVersion()).toBe("competitor-scrape-v1");
  });

  it("derives the same run key for the same scheduled minute and version", () => {
    const key1 = deterministicRunKey("2026-07-29T21:00:00.000Z");
    const key2 = deterministicRunKey("2026-07-29T21:00:45.000Z");
    const key3 = deterministicRunKey("2026-07-29T21:01:00.000Z");
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it("includes version in run key", () => {
    const key = deterministicRunKey("2026-07-29T21:00:00.000Z", "custom-v2");
    expect(key).toContain("custom-v2");
  });

  it("parses store allowlist", () => {
    const storeA = "11111111-1111-4111-8111-111111111111";
    const storeB = "22222222-2222-4222-8222-222222222222";
    expect(parseStoreAllowlist("[]")).toEqual([]);
    expect(parseStoreAllowlist(JSON.stringify([storeA, "not-a-uuid", storeB, storeA]))).toEqual([
      storeA,
      storeB,
    ]);
    expect(parseStoreAllowlist("not-json")).toEqual([]);
    expect(parseStoreAllowlist('"abc"')).toEqual([]);
  });

  it("detects automation enabled only for exact true", () => {
    expect(isAutomationEnabled({ AUTOMATION_ENABLED: "true" })).toBe(true);
    expect(isAutomationEnabled({ AUTOMATION_ENABLED: "false" })).toBe(false);
    expect(isAutomationEnabled({ AUTOMATION_ENABLED: "1" })).toBe(false);
  });

  it("detects source approval per competitor", () => {
    const env = { CHALDAL_SOURCE_APPROVED: "true", SHWAPNO_SOURCE_APPROVED: "false" };
    expect(isSourceApproved(env, "chaldal")).toBe(true);
    expect(isSourceApproved(env, "shwapno")).toBe(false);
  });

  it("builds deterministic observation key", () => {
    const product: NormalizedProduct = {
      name: "Pran Potato Crackers 50 gm",
      price: 85,
      original_price: null,
      currency: "BDT",
      competitor_product_id: "chaldal:abc",
      competitor_product_url: null,
      package_quantity: null,
      package_unit: null,
      raw_data: {},
    };
    const obs1 = buildObservation("run-1", "store-1", "chaldal", product, null, null, "matcher-v1");
    const obs2 = buildObservation("run-1", "store-1", "chaldal", product, null, null, "matcher-v1");
    expect(obs1.observation_key).toBe(obs2.observation_key);
    expect(obs1.observation_key).toBe(deterministicObservationKey("run-1", "chaldal", "chaldal:abc", "Pran Potato Crackers 50 gm", "store-1"));
  });
});
