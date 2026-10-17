import type { NormalizedProduct, PageBinding } from "../types.ts";

const BASE_URL = "https://www.khulshimart.com";

export async function scrapeKhulshiMartPage(
  page: PageBinding,
  categoryName: string,
  categoryUrl: string,
): Promise<NormalizedProduct[]> {
  await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('a[href^="/product/"]', { timeout: 20000 });

  const products = await page.evaluate(
    (catName: string, baseUrl: string) => {
      const items: NormalizedProduct[] = [];
      const seen = new Set<string>();

      const cards = Array.from(document.querySelectorAll('a[href^="/product/"]'));

      for (const card of cards) {
        try {
          const productPath = card.getAttribute("href");
          if (!productPath) continue;

          const titleEl = card.querySelector("h3");
          const name = titleEl?.textContent?.trim() || "";
          if (!name || name.length < 2) continue;

          const text = card.textContent || "";
          const priceMatch = text.match(/৳\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/);
          if (!priceMatch || !priceMatch[1]) continue;

          const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          const img = card.querySelector("img");
          let imageUrl =
            img?.getAttribute("src") ||
            img?.getAttribute("data-src") ||
            "";
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
          }

          const slug = productPath.replace(/^\/product\//, "");
          const competitorProductId = `khulshi-mart:${slug}`;
          if (seen.has(competitorProductId)) continue;
          seen.add(competitorProductId);

          items.push({
            name,
            price,
            original_price: null,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: `${baseUrl}${productPath}`,
            package_quantity: null,
            package_unit: null,
            raw_data: {
              category: catName,
              image_url: imageUrl,
            },
          });
        } catch {
          // swallow per-card parsing error
        }
      }

      return items;
    },
    categoryName,
    BASE_URL,
  );

  return products;
}
