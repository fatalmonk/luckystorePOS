import type { NormalizedProduct, PageBinding } from "../types.ts";

const BASE_URL = "https://paimart.painest.com";

export async function scrapePaiMartPage(
  page: PageBinding,
  categoryName: string,
  categoryUrl: string,
): Promise<NormalizedProduct[]> {
  await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("div[class*='product'], a[href*='product'], img", { timeout: 20000 });

  const products = await page.evaluate(
    (catName: string, baseUrl: string) => {
      const items: NormalizedProduct[] = [];
      const seen = new Set<string>();

      const cards = Array.from(
        document.querySelectorAll("div[class*='product-card'], div[class*='productCard'], div[class*='ProductCard'], div.product, a[href*='/product/']"),
      );

      for (const card of cards) {
        try {
          const titleEl = card.querySelector("h2, h3, h4, .title, [class*='title'], [class*='name']");
          const name = titleEl?.textContent?.trim() || "";
          if (!name || name.length < 2) continue;

          const priceEl = card.querySelector("[class*='price'], [class*='Price'], span.price");
          let priceMatch: RegExpMatchArray | null = null;
          if (priceEl?.textContent) {
            priceMatch = priceEl.textContent.match(/(?:৳|Tk\.?|BDT)?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/i);
          } else if (card.textContent) {
            priceMatch = card.textContent.match(/(?:৳|Tk\.?|BDT)\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/i);
          }
          if (!priceMatch || !priceMatch[1]) continue;

          const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          const img = card.querySelector("img");
          let imageUrl = img?.getAttribute("src") || img?.getAttribute("data-src") || "";
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
          }

          const link = card.querySelector("a[href]")?.getAttribute("href") || "";
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const competitorProductId = `pai-mart:${slug}`;
          if (seen.has(competitorProductId)) continue;
          seen.add(competitorProductId);

          items.push({
            name,
            price,
            original_price: null,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: link.startsWith("http") ? link : `${baseUrl}${link}`,
            package_quantity: null,
            package_unit: null,
            raw_data: {
              category: catName,
              image_url: imageUrl,
            },
          });
        } catch {
          // swallow card error
        }
      }

      return items;
    },
    categoryName,
    BASE_URL,
  );

  return products;
}
