import type { NormalizedProduct, PageBinding } from "../types.ts";

const BASE_URL = "https://www.thebasketbd.com";

export async function scrapeTheBasketPage(
  page: PageBinding,
  categoryName: string,
  categoryUrl: string,
): Promise<NormalizedProduct[]> {
  await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".product-item", { timeout: 20000 });

  const products = await page.evaluate(
    (catName: string, baseUrl: string) => {
      const items: NormalizedProduct[] = [];
      const seen = new Set<string>();

      const cards = Array.from(document.querySelectorAll(".item.product-item, .product-item-info"));

      for (const card of cards) {
        try {
          const link = card.querySelector("a.product-item-link, .product-item-name a");
          const name = link?.textContent?.trim() || "";
          const productUrl = link?.getAttribute("href") || "";
          if (!name || name.length < 2) continue;

          const priceEl = card.querySelector(".price-box .price, .special-price .price, span.price");
          let priceMatch: RegExpMatchArray | null = null;
          if (priceEl?.textContent) {
            priceMatch = priceEl.textContent.match(/(?:৳|Tk\.?|BDT)?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/i);
          } else if (card.textContent) {
            priceMatch = card.textContent.match(/(?:৳|Tk\.?|BDT)\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/i);
          }
          if (!priceMatch || !priceMatch[1]) continue;

          const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          const img = card.querySelector("img.product-image-photo, img");
          const imageUrl = img?.getAttribute("src") || img?.getAttribute("data-src") || "";

          const urlMatch = productUrl.match(/\/([^/]+)\.html/);
          const slug = urlMatch ? urlMatch[1] : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const competitorProductId = `the-basket:${slug}`;
          if (seen.has(competitorProductId)) continue;
          seen.add(competitorProductId);

          items.push({
            name,
            price,
            original_price: null,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: productUrl.startsWith("http") ? productUrl : `${baseUrl}${productUrl}`,
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
