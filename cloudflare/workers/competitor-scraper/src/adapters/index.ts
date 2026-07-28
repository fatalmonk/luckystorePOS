import type { BrowserBinding, Logger, NormalizedProduct, PageBinding, RequestBinding } from "../types.ts";
import { scrapeChaldalPage } from "./chaldal.ts";
import { scrapeShwapnoPage } from "./shwapno.ts";

export const CHALDAL_CATEGORIES = [
  { name: "Fresh Vegetables", url: "https://chaldal.com/fresh-vegetable" },
  { name: "Fresh Fruits", url: "https://chaldal.com/fresh-fruit" },
  { name: "Fish", url: "https://chaldal.com/fish" },
  { name: "Rice", url: "https://chaldal.com/rices" },
  { name: "Oil", url: "https://chaldal.com/oil" },
  { name: "Tea", url: "https://chaldal.com/beverages-tea" },
  { name: "Coffee", url: "https://chaldal.com/coffees" },
  { name: "Soft Drinks", url: "https://chaldal.com/soft-drinks" },
];

export const SHWAPNO_CATEGORIES = [
  { name: "Eggs", url: "https://www.shwapno.com/eggs" },
  { name: "Ice Cream", url: "https://www.shwapno.com/ice-cream" },
  { name: "Candy & Chocolate", url: "https://www.shwapno.com/candy-chocolate" },
  { name: "Cooking", url: "https://www.shwapno.com/cooking" },
  { name: "Dairy", url: "https://www.shwapno.com/dairy" },
  { name: "Drinks", url: "https://www.shwapno.com/beverages" },
  { name: "Snacks", url: "https://www.shwapno.com/snacks" },
];

export interface AdapterResult {
  competitor: "chaldal" | "shwapno";
  products: NormalizedProduct[];
  error: string | null;
}

function configurePageInterception(page: PageBinding) {
  page.on("request", (req: RequestBinding) => {
    const type = req.resourceType();
    if (["image", "font", "media", "stylesheet"].includes(type)) {
      void req.abort("aborted");
    } else {
      void req.continue();
    }
  });
}

export async function runChaldalAdapter(
  browser: BrowserBinding,
  log: Logger,
): Promise<AdapterResult> {
  const result: NormalizedProduct[] = [];
  const seen = new Set<string>();
  let browserHandle: Awaited<ReturnType<BrowserBinding["launch"]>> | null = null;
  let page: PageBinding | null = null;
  let successfulCategories = 0;
  const categoryFailures: string[] = [];

  try {
    browserHandle = await browser.launch({ headless: true });
    page = await browserHandle.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setRequestInterception(true);
    configurePageInterception(page);

    for (const category of CHALDAL_CATEGORIES) {
      try {
        const products = await scrapeChaldalPage(page, category.name, category.url);
        successfulCategories += 1;
        for (const p of products) {
          const key = `${p.name}::${p.price}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(p);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        categoryFailures.push(`${category.name}: ${message}`);
        log.warn({ message: "chaldal category failed", category: category.name, error: message });
      }
    }

    if (result.length === 0) {
      const error =
        successfulCategories === 0
          ? `all categories failed: ${categoryFailures[0] ?? "unknown source failure"}`
          : "empty catalog";
      return { competitor: "chaldal", products: [], error };
    }
    return { competitor: "chaldal", products: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ message: "chaldal adapter failed", error: message });
    return { competitor: "chaldal", products: [], error: message };
  } finally {
    await page?.close().catch(() => undefined);
    await browserHandle?.close().catch(() => undefined);
  }
}

export async function runShwapnoAdapter(
  browser: BrowserBinding,
  log: Logger,
): Promise<AdapterResult> {
  const result: NormalizedProduct[] = [];
  const seen = new Set<string>();
  let browserHandle: Awaited<ReturnType<BrowserBinding["launch"]>> | null = null;
  let page: PageBinding | null = null;
  let successfulCategories = 0;
  const categoryFailures: string[] = [];

  try {
    browserHandle = await browser.launch({ headless: true });
    page = await browserHandle.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setRequestInterception(true);
    configurePageInterception(page);

    for (const category of SHWAPNO_CATEGORIES) {
      try {
        const products = await scrapeShwapnoPage(page, category.name, category.url);
        successfulCategories += 1;
        for (const p of products) {
          const key = `${p.name}::${p.price}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(p);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        categoryFailures.push(`${category.name}: ${message}`);
        log.warn({ message: "shwapno category failed", category: category.name, error: message });
      }
    }

    if (result.length === 0) {
      const error =
        successfulCategories === 0
          ? `all categories failed: ${categoryFailures[0] ?? "unknown source failure"}`
          : "empty catalog";
      return { competitor: "shwapno", products: [], error };
    }
    return { competitor: "shwapno", products: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ message: "shwapno adapter failed", error: message });
    return { competitor: "shwapno", products: [], error: message };
  } finally {
    await page?.close().catch(() => undefined);
    await browserHandle?.close().catch(() => undefined);
  }
}
