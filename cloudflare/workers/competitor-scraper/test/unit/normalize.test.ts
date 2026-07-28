import { describe, expect, it } from "vitest";
import {
  buildRawData,
  extractBdtPrice,
  observationKeysEqual,
  stripBdtCurrency,
} from "../../src/normalize.ts";
import type { NormalizedProduct, ScrapedObservation } from "../../src/types.ts";

describe("normalization helpers", () => {
  it("extracts BDT prices with grouping and decimals", () => {
    expect(extractBdtPrice("৳ 1,250.50")).toBe(1250.5);
    expect(extractBdtPrice("price unavailable")).toBeNull();
  });

  it("removes BDT currency markers", () => {
    expect(stripBdtCurrency(" ৳ 85 ")).toBe("85");
  });

  it("preserves adapter raw data", () => {
    const product: NormalizedProduct = {
      competitor_product_id: null,
      competitor_product_url: null,
      name: "Example",
      price: 85,
      original_price: null,
      currency: "BDT",
      package_quantity: null,
      package_unit: null,
      raw_data: { category: "Snacks" },
    };
    expect(buildRawData(product)).toEqual({ category: "Snacks" });
  });

  it("compares observations by deterministic key", () => {
    const observation = { observation_key: "same" } as ScrapedObservation;
    expect(observationKeysEqual(observation, { ...observation })).toBe(true);
    expect(observationKeysEqual(observation, { ...observation, observation_key: "other" })).toBe(
      false,
    );
  });
});
