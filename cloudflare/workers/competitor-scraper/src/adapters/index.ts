import type { BrowserBinding, CompetitorName, Logger, NormalizedProduct, PageBinding, RequestBinding } from "../types.ts";
import { scrapeChaldalPage } from "./chaldal.ts";
import { scrapeShwapnoPage } from "./shwapno.ts";
import { scrapeKhulshiMartPage } from "./khulshi-mart.ts";
import { scrapeTheBasketPage } from "./the-basket.ts";
import { scrapePaiMartPage } from "./pai-mart.ts";

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
  { name: "Home Deals", url: "https://www.shwapno.com" },
  { name: "Eggs", url: "https://www.shwapno.com/eggs" },
];

export const KHULSHI_MART_CATEGORIES = [
  { name: "Food", url: "https://www.khulshimart.com/shop/food" },
  { name: "Baby Essentials", url: "https://www.khulshimart.com/shop/baby-essentials" },
  { name: "Beauty & Health", url: "https://www.khulshimart.com/shop/beauty-and-health" },
  { name: "Home & Cleaning", url: "https://www.khulshimart.com/shop/home-and-cleaning" },
];

export const THE_BASKET_CATEGORIES = [
  { name: "Food Basket", url: "https://www.thebasketbd.com/food-basket.html" },
  { name: "Bakery", url: "https://www.thebasketbd.com/bakery.html" },
  { name: "Super Saver Deals", url: "https://www.thebasketbd.com/offer-promo/supersaverdeals.html" },
];

export const PAI_MART_CATEGORIES = [
  { name: "Groceries", url: "https://paimart.painest.com/" },
];

export interface AdapterResult {
  competitor: CompetitorName;
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

export async function runKhulshiMartAdapter(
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

    for (const category of KHULSHI_MART_CATEGORIES) {
      try {
        const products = await scrapeKhulshiMartPage(page, category.name, category.url);
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
        log.warn({ message: "khulshi-mart category failed", category: category.name, error: message });
      }
    }

    if (result.length === 0) {
      const error =
        successfulCategories === 0
          ? `all categories failed: ${categoryFailures[0] ?? "unknown source failure"}`
          : "empty catalog";
      return { competitor: "khulshi-mart", products: [], error };
    }
    return { competitor: "khulshi-mart", products: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ message: "khulshi-mart adapter failed", error: message });
    return { competitor: "khulshi-mart", products: [], error: message };
  } finally {
    await page?.close().catch(() => undefined);
    await browserHandle?.close().catch(() => undefined);
  }
}

export async function runTheBasketAdapter(
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

    for (const category of THE_BASKET_CATEGORIES) {
      try {
        const products = await scrapeTheBasketPage(page, category.name, category.url);
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
        log.warn({ message: "the-basket category failed", category: category.name, error: message });
      }
    }

    if (result.length === 0) {
      const error =
        successfulCategories === 0
          ? `all categories failed: ${categoryFailures[0] ?? "unknown source failure"}`
          : "empty catalog";
      return { competitor: "the-basket", products: [], error };
    }
    return { competitor: "the-basket", products: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ message: "the-basket adapter failed", error: message });
    return { competitor: "the-basket", products: [], error: message };
  } finally {
    await page?.close().catch(() => undefined);
    await browserHandle?.close().catch(() => undefined);
  }
}

export async function runPaiMartAdapter(
  browser: BrowserBinding,
  log: Logger,
): Promise<AdapterResult> {
  const result: NormalizedProduct[] = [];
  const seen = new Set<string>();

  // 1. Try Pai Mart REST API first (fast, reliable, zero browser quota consumed)
  try {
    const apiRes = await fetch("https://backapi.paikaree.com.bd/api/wild/products");
    if (apiRes.ok) {
      const sections: Array<{
        category?: { name: string };
        products?: {
          data?: Array<{
            id: number;
            name: string;
            unit_price: number | string;
            discount?: number | string;
            slug?: string;
          }>;
        };
      }> = await apiRes.json();
      for (const section of sections) {
        const categoryName = section.category?.name || "Groceries";
        for (const item of section.products?.data || []) {
          const rawPrice = Number(item.unit_price);
          const discount = Number(item.discount || 0);
          const price = rawPrice > 0 ? (discount > 0 && discount < rawPrice ? rawPrice - discount : rawPrice) : 0;
          if (!item.name || !Number.isFinite(price) || price <= 0) continue;
          const competitorProductId = `pai-mart:${item.slug || item.id}`;
          const key = `${item.name.trim()}::${price}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({
            name: item.name.trim(),
            price,
            original_price: rawPrice || null,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: item.slug
              ? `https://paimart.painest.com/product/${item.slug}`
              : "https://paimart.painest.com/",
            package_quantity: null,
            package_unit: null,
            raw_data: {
              category: categoryName,
              id: item.id,
            },
          });
        }
      }
      if (result.length > 0) {
        return { competitor: "pai-mart", products: result, error: null };
      }
    }
  } catch (apiErr) {
    const message = apiErr instanceof Error ? apiErr.message : String(apiErr);
    log.warn({ message: "pai-mart API error, falling back to browser", error: message });
  }

  // 2. Fallback to browser rendering if API did not return items
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

    for (const category of PAI_MART_CATEGORIES) {
      try {
        const products = await scrapePaiMartPage(page, category.name, category.url);
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
        log.warn({ message: "pai-mart category failed", category: category.name, error: message });
      }
    }

    if (result.length === 0) {
      const error =
        successfulCategories === 0
          ? `all categories failed: ${categoryFailures[0] ?? "unknown source failure"}`
          : "empty catalog";
      return { competitor: "pai-mart", products: [], error };
    }
    return { competitor: "pai-mart", products: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ message: "pai-mart adapter failed", error: message });
    return { competitor: "pai-mart", products: [], error: message };
  } finally {
    await page?.close().catch(() => undefined);
    await browserHandle?.close().catch(() => undefined);
  }
}
