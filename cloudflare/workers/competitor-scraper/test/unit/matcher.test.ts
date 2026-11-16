import { describe, expect, it } from "vitest";
import { findBestMatch, matchAll, parsePackageInfo, canonicalUnit, parseCountableQuantity, extractQuantity } from "../../src/matcher.ts";
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

  it("matches a separately declared, checksum-valid GTIN when package size agrees", () => {
    const product = makeProduct({ name: "Unknown Name 50 gm", competitor_product_id: "retailer:sku-22", raw_data: { barcode: "8901030866203" } });
    const item = makeItem({ name: "Different Product 50 gm", barcode: "8901030866203" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
    expect(result.confidence).toBe(1);
  });

  it("does not conflate external retailer product ID with barcode or local SKU", () => {
    const product = makeProduct({ name: "Unknown Name 500 gm", competitor_product_id: "EXTERNAL-123" });
    const item = makeItem({ name: "Different Product 500 gm", sku: "EXTERNAL-123", barcode: "EXTERNAL-123" });
    expect(findBestMatch(product, [item]).item_id).toBeNull();
  });

  it("rejects a barcode match with the wrong package size", () => {
    const product = makeProduct({ name: "Oil 500 ml", raw_data: { barcode: "8901030866203" } });
    const item = makeItem({ name: "Oil 1 l", barcode: "8901030866203" });
    expect(findBestMatch(product, [item]).item_id).toBeNull();
  });

  it("rejects invalid or ambiguous barcode data", () => {
    const product = makeProduct({ name: "Unknown 100 g", raw_data: { barcode: "8901030866202" } });
    const item = makeItem({ name: "Different 100 g", barcode: "8901030866202" });
    expect(findBestMatch(product, [item]).item_id).toBeNull();
  });

  it("normalizes 1 kg and 1000 g as the same package size", () => {
    const product=makeProduct({name:"PRAN Chinigura Rice 1 kg"});
    const local=makeItem({name:"PRAN Chinigura Rice 1000 g"});
    expect(findBestMatch(product,[local]).item_id).toBe('item-1');
  });

  it("normalizes 2 L and 2000 ml as the same package size", () => {
    const product=makeProduct({name:"Fortune Rice Bran Oil 2 L"});
    const local=makeItem({name:"Fortune Rice Bran Oil 2000 ml"});
    expect(findBestMatch(product,[local]).item_id).toBe('item-1');
  });

  it("matches fuzzy when size compatible", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Pran Potato Crackers 50 gm" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
    expect(result.confidence).toBe(1);
  });

  it("rejects when package size mismatches", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm", package_quantity: 50, package_unit: "g" });
    const item = makeItem({ name: "Pran Potato Crackers 50 gm", package_quantity: 100, package_unit: "g" });
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
    expect(result.matcher_version).toBe("matcher-v2");
  });

  it("matches multiple products", () => {
    const products = [makeProduct(), makeProduct({ name: "Nestle Maggi 4 Pack" })];
    const items = [makeItem(), makeItem({ id: "item-2", name: "Nestle Maggi 4 Pack" })];
    const results = matchAll(products, items);
    expect(results.every((r) => r.result.item_id !== null)).toBe(true);
  });

  it("matches pack-compatible items", () => {
    const product = makeProduct({ name: "Nestle Maggi Noodles 4 Pack" });
    const item = makeItem({ name: "Nestle Maggi Noodles 4 Pack" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBe("item-1");
  });

  it("rejects pack quantity mismatch", () => {
    const product = makeProduct({ name: "Nestle Maggi Noodles 4 Pack" });
    const item = makeItem({ name: "Nestle Maggi Noodles 12 Pack" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBeNull();
  });

  it("does not match an 8-pack of 62 g noodles to a single 62 g product", () => {
    const product=makeProduct({name:"Doodles Noodles 62 g (8 Pack)"});
    const local=makeItem({name:"Doodles Noodles 62 g"});
    expect(findBestMatch(product,[local]).item_id).toBeNull();
  });

  it("matches identical weight and count only when both are compatible", () => {
    const product=makeProduct({name:"Doodles Noodles 62 g (8 Pack)"});
    const local=makeItem({name:"Doodles Noodles 62 g (8 Pack)"});
    expect(findBestMatch(product,[local]).item_id).toBe('item-1');
    expect(findBestMatch({...product,name:"Doodles Noodles 62 g (6 Pack)"},[local]).item_id).toBeNull();
  });

  it("rejects weight vs count family mismatch", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Pran Potato Crackers 4 Pack" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBeNull();
  });

  it("rejects missing size on one side", () => {
    const product = makeProduct({ name: "Pran Potato Crackers 50 gm" });
    const item = makeItem({ name: "Pran Potato Crackers" });
    const result = findBestMatch(product, [item]);
    expect(result.item_id).toBeNull();
  });

  it("parses package info", () => {
    expect(parsePackageInfo("Rice 1 kg")).toEqual({ quantity: 1, unit: "kg" });
    expect(parsePackageInfo("Rice 1KG")).toEqual({ quantity: 1, unit: "kg" });
    expect(parsePackageInfo("Milk")).toEqual({ quantity: null, unit: null });
  });

  it("parses countable quantities", () => {
    expect(parseCountableQuantity("4 Pack")).toBe(4);
    expect(parseCountableQuantity("6 bottles")).toBe(6);
    expect(parseCountableQuantity("Milk")).toBeNull();
  });

  it("extracts any quantity", () => {
    expect(extractQuantity("Rice 1 kg")).toBe(1);
    expect(extractQuantity("4 Pack")).toBe(4);
    expect(extractQuantity("Milk")).toBeNull();
  });

  it("canonicalizes units", () => {
    expect(canonicalUnit("1 kg")).toEqual({ grams: 1000, milliliters: null });
    expect(canonicalUnit("500 ml")).toEqual({ grams: null, milliliters: 500 });
    expect(canonicalUnit("2 l")).toEqual({ grams: null, milliliters: 2000 });
  });
});
