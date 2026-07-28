import { describe, expect, it } from "vitest";
import { findBestMatch, matchAll, parsePackageInfo, canonicalUnit } from "../../src/matcher.ts";
import type { MatchableItem, NormalizedProduct } from "../../src/types.ts";

describe("matcher", () => {
  const makeProduct = (overrides: Partial<NormalizedProduct> = {}): NormalizedProduct => ({
    name: "Pran Potato Crackers 50 gm",
    price: 85,
    original_price: null,
    currency: "BDT",
    competitor_product_id: null,
    competitor_product_url: null,
    package_quantity: null,
    package_unit: null,
    raw_data: {},
    ...overrides,
  });

  const makeItem = (overrides: Partial<MatchableItem> = {}): MatchableItem => ({
    id: "item-1",
    name: "Pran Potato Crackers 50 gm",
    sku: null,
    barcode: null,
    package_quantity: null,
    package_unit: null,
    ...overrides,
  });

  it("matches by exact barcode before size filter", () => {
    const product = makeProduct({ name: "Unknown Name 500 gm", competitor_product_id: "BAR123" });
    const item = makeItem({ name: "Totally Different", barcode: "BAR123", package_quantity: 50 });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
    expect(result.confidence).toBe(1);
  });

  it("matches by exact external SKU before fuzzy matching", () => {
    const product = makeProduct({
      name: "Unknown Name 500 gm",
      competitor_product_id: "EXTERNAL-123",
    });
    const item = makeItem({ name: "Different Product", sku: "EXTERNAL-123" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
    expect(result.confidence).toBe(1);
  });

  it("matches fuzzy when size compatible", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Pran Potato Crackers 50 gm" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
    expect(result.confidence).toBe(1);
  });

  it("rejects when package size mismatches", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Pran Potato Crackers 50 gm", package_quantity: 100 });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBeNull();
  });

  it("converts compatible units (1 kg vs 1000 g)", () => {
    const product = makeProduct({ name: "Rice 1 kg" });
    const item = makeItem({ name: "Rice 1 kg", package_unit: "1000 g" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
  });

  it("rejects when similarity below 0.92", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Some Other Crackers 50 gm" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBeNull();
  });

  it("rejects ambiguous match when runner-up is within 0.03", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const a = makeItem({ id: "a", name: "Pran Potato Crackers 50 gm" });
    const b = makeItem({ id: "b", name: "Pran Potato Crackers 50 gm" });
    const result = findBestMatch(product, [a, b]);
    expect(result.item_id).toBeNull();
  });

  it("returns null for unmatched products", () => {
    const product = makeProduct({ name: "Completely Unknown" });
    const result = findBestMatch(product, [makeItem()]);
    expect(result.item_id).toBeNull();
  });

  it("versions every result", () => {
    const result = findBestMatch(makeProduct(), [makeItem()]);
    expect(result.matcher_version).toBe("matcher-v1");
  });

  it("matches multiple products", () => {
    const products = [makeProduct(), makeProduct({ name: "Nestle Maggi 4 Pack" })];
    const items = [makeItem(), makeItem({ id: "item-2", name: "Nestle Maggi 4 Pack" })];
    const results = matchAll(products, items);
    expect(results.every((r) => r.result.item_id !== null)).toBe(true);
  });

  it("parses package info", () => {
    expect(parsePackageInfo("Rice 1 kg")).toEqual({ quantity: 1, unit: "kg" });
    expect(parsePackageInfo("Rice 1KG")).toEqual({ quantity: 1, unit: "kg" });
    expect(parsePackageInfo("Milk")).toEqual({ quantity: null, unit: null });
  });

  it("canonicalizes units", () => {
    expect(canonicalUnit("1 kg")).toEqual({ grams: 1000, milliliters: null });
    expect(canonicalUnit("500 ml")).toEqual({ grams: null, milliliters: 500 });
    expect(canonicalUnit("2 l")).toEqual({ grams: null, milliliters: 2000 });
  });
});
