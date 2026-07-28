import { describe, expect, it } from "vitest";
import { runChaldalAdapter, runShwapnoAdapter } from "../../src/adapters/index.ts";
import { SHWAPNO_FIXTURE } from "../fixtures/pages.ts";
import { createFakeBrowser } from "../fakes/browser.ts";
import { createLogger } from "../../src/logger.ts";

describe("adapters source isolation", () => {
  it("failing first source does not prevent second source from running", async () => {
    const html = new Map([
      ["https://www.shwapno.com/eggs", SHWAPNO_FIXTURE],
    ]);
    const browser = createFakeBrowser(html);

    const chaldal = await runChaldalAdapter(browser, createLogger());
    const shwapno = await runShwapnoAdapter(browser, createLogger());

    expect(chaldal.error).not.toBeNull();
    expect(shwapno.error).toBeNull();
    expect(shwapno.products.length).toBeGreaterThan(0);
    expect(browser.state.pageClosed).toBe(true);
    expect(browser.state.browserClosed).toBe(true);
  });
});
