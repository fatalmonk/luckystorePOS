import type { NormalizedProduct, PageBinding } from "../types.ts";

const BASE_URL = "https://chaldal.com";

export interface ChaldalScrapeResult {
  products: NormalizedProduct[];
  error: string | null;
}

export async function scrapeChaldalPage(
  page: PageBinding,
  categoryName: string,
  categoryUrl: string,
): Promise<NormalizedProduct[]> {
  await page.goto(categoryUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await waitForCards(page, "div.productV2Catalog", 20_000);

  const products = await page.evaluate(
    (catName: string, baseUrl: string) => {
      const cards = document.querySelectorAll("div.productV2Catalog");
      const items: NormalizedProduct[] = [];
      for (const card of cards) {
        try {
          const nameEl = card.querySelector("div.pvName p.nameTextWithEllipsis") || card.querySelector("div.pvName");
          const discountedPriceEl = card.querySelector("div.productV2discountedPrice");
          const regularPriceEl = card.querySelector("div.textWrapper > div.price");
          const subTextEl = card.querySelector("div.subText");
          const imgEl = card.querySelector("div.imageWrapperWrapper > img") || card.querySelector("img");

          if (!nameEl) continue;
          const name = (nameEl.textContent || "").trim();

          let unit = "";
          if (subTextEl) {
            const firstSpan = subTextEl.querySelector("span");
          const firstNode = subTextEl.childNodes[0];
          const firstText = firstNode?.textContent ?? "";
          unit = (firstSpan?.textContent ?? firstText).trim();
            if (unit.length > 25) unit = "";
          }
          const fullName = unit && !name.toLowerCase().includes(unit.toLowerCase()) ? `${name} (${unit})` : name;

          const priceText = discountedPriceEl?.textContent || regularPriceEl?.textContent || "";
          const priceMatch = priceText.match(/(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/);
          if (!priceMatch) continue;
          const price = Number.parseFloat(priceMatch[1]!.replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          let originalPrice: number | null = null;
          if (discountedPriceEl) {
            const originalMatches = discountedPriceEl.textContent?.match(/(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g);
            if (originalMatches && originalMatches.length > 1) {
              const candidate = Number.parseFloat(originalMatches.at(-1)!.replace(/,/g, ""));
              if (candidate > price) originalPrice = candidate;
            }
          }

          let imageUrl = "";
          if (imgEl) {
            const src = imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "";
            imageUrl = src;
            try {
              const u = new URL(src);
              const querySrc = u.searchParams.get("src");
              if (querySrc) imageUrl = decodeURIComponent(querySrc);
            } catch {
              // leave imageUrl as-is
            }
          }

          const linkEl = card.querySelector("a[href^='/']");
          const productPath = linkEl?.getAttribute("href") ?? null;
          const competitorProductId = productPath ? `chaldal:${productPath.replace(/^\//, "")}` : null;

          items.push({
            name: fullName,
            price,
            original_price: originalPrice,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: productPath ? `${baseUrl}${productPath}` : null,
            package_quantity: null,
            package_unit: null,
            raw_data: {
              category: catName,
              display_name: name,
              unit_text: unit,
              image_url: imageUrl,
            },
          });
        } catch {
          // swallow per-card errors
        }
      }
      return items;
    },
    categoryName,
    BASE_URL,
  );

  return products;
}

async function waitForCards(page: PageBinding, selector: string, timeoutMs: number): Promise<void> {
  await page.waitForSelector(selector, { timeout: timeoutMs });
}

export async function discoverChaldalSubcategories(page: PageBinding): Promise<{ name: string; url: string }[]> {
  await page.goto(`${BASE_URL}/fresh-vegetable`, { waitUntil: "networkidle2", timeout: 60000 });
  await waitForCards(page, "div.topMenu.vertical ul li div.name a", 15_000);

  const links = await page.evaluate((baseUrl: string) => {
    return Array.from(document.querySelectorAll("div.topMenu.vertical ul li div.name a"))
      .map((a) => ({ name: (a.textContent || "").trim(), url: (a as HTMLAnchorElement).href }))
      .filter(
        (item) =>
          item.url.startsWith(`${baseUrl}/`) &&
          !item.url.includes("/invest") &&
          !item.url.includes("/pharmacy") &&
          !item.url.includes("/refer") &&
          !item.url.includes("/daily-deals") &&
          !item.url.includes("/egg-club"),
      );
  }, BASE_URL);

  const seen = new Set<string>();
  return links.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
