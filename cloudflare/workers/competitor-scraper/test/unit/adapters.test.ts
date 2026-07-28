import { describe, expect, it } from "vitest";
import { CHALDAL_FIXTURE, SHWAPNO_FIXTURE } from "../fixtures/pages.ts";
import { createFakeBrowser } from "../fakes/browser.ts";
import { runChaldalAdapter, runShwapnoAdapter } from "../../src/adapters/index.ts";
import { createLogger } from "../../src/logger.ts";

describe("adapters", () => {
  it("parses Chaldal fixture", async () => {
    const html = new Map([["https://chaldal.com/fresh-vegetable", CHALDAL_FIXTURE]]);
    const result = await runChaldalAdapter(createFakeBrowser(html), createLogger());
    expect(result.competitor).toBe("chaldal");
    expect(result.error).toBeNull();
    expect(result.products.length).toBeGreaterThan(0);
    const first = result.products[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("expected Chaldal fixture product");
    expect(first.name).toContain("Pran Potato Crackers");
    expect(first.price).toBe(85);
  });

  it("parses Shwapno fixture", async () => {
    const html = new Map([["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE]]);
    const result = await runShwapnoAdapter(createFakeBrowser(html), createLogger());
    expect(result.competitor).toBe("shwapno");
    expect(result.error).toBeNull();
    expect(result.products.length).toBeGreaterThan(0);
    const first = result.products.find((p) => p.name.includes("Pran Potato Crackers"));
    expect(first).toBeDefined();
    expect(first?.price).toBe(88);
  });

  it("treats empty fixture as source failure", async () => {
    const html = new Map([["https://chaldal.com/fresh-vegetable", '<div class="productV2Catalog"></div>']]);
    const browser = createFakeBrowser(html);
    const result = await runChaldalAdapter(browser, createLogger());
    expect(result.error).toBe("empty catalog");
    expect(browser.state.pageClosed).toBe(true);
    expect(browser.state.browserClosed).toBe(true);
  });

  it("reports selector failures when every category fails", async () => {
    const browser = createFakeBrowser(new Map());
    const result = await runShwapnoAdapter(browser, createLogger());
    expect(result.error).toContain("all categories failed");
    expect(result.error).toContain("selector timeout");
    expect(browser.state.pageClosed).toBe(true);
    expect(browser.state.browserClosed).toBe(true);
  });

  it("closes browser after a successful scrape", async () => {
    const html = new Map([["https://chaldal.com/fresh-vegetable", CHALDAL_FIXTURE]]);
    const browser = createFakeBrowser(html);
    const result = await runChaldalAdapter(browser, createLogger());
    expect(result.error).toBeNull();
    expect(browser.state.pageClosed).toBe(true);
    expect(browser.state.browserClosed).toBe(true);
    expect(browser.state.pagesClosed).toBe(browser.state.pagesOpened);
    expect(browser.state.browsersClosed).toBe(browser.state.browsersLaunched);
  });

  it("closes browser after a failed scrape", async () => {
    const html = new Map([["https://chaldal.com/fresh-vegetable", '<div class="productV2Catalog"></div>']]);
    const browser = createFakeBrowser(html);
    const result = await runChaldalAdapter(browser, createLogger());
    expect(result.error).not.toBeNull();
    expect(browser.state.pageClosed).toBe(true);
    expect(browser.state.browserClosed).toBe(true);
    expect(browser.state.pagesClosed).toBe(browser.state.pagesOpened);
    expect(browser.state.browsersClosed).toBe(browser.state.browsersLaunched);
  });
});
