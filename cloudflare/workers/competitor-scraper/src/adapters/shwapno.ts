import type { NormalizedProduct, PageBinding } from "../types.ts";

const BASE_URL = "https://www.shwapno.com";

export async function scrapeShwapnoPage(
  page: PageBinding,
  categoryName: string,
  categoryUrl: string,
): Promise<NormalizedProduct[]> {
  await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("img", { timeout: 20_000 });

  const products = await page.evaluate(
    (catName: string, baseUrl: string) => {
      const allDivs = document.querySelectorAll("div");
      const items: NormalizedProduct[] = [];
      const seen = new Set<string>();

      for (const div of allDivs) {
        try {
          const text = div.textContent || "";
          const hasImage = div.querySelector("img");
          const priceMatch = text.match(/৳\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/);
          if (!priceMatch || !priceMatch[1]) continue;

          const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          let name = "";
          for (const link of div.querySelectorAll('a[href^="/"]')) {
            const linkText = link.textContent?.trim() ?? "";
            const href = link.getAttribute("href") ?? "";
            if (
              href.length > 1 &&
              !href.includes("contact") &&
              !href.includes("about") &&
              !href.includes("deals") &&
              !href.includes("brands") &&
              linkText.length > 2 &&
              linkText.length < 200 &&
              !linkText.includes("Delivery") &&
              !linkText.includes("Per") &&
              !linkText.includes("Add to Bag") &&
              !linkText.includes("Min.")
            ) {
              name = linkText;
              break;
            }
          }

          if (!name) {
            for (const line of text
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l.length > 0)) {
              if (
                line.length > 2 &&
                line.length < 200 &&
                !line.includes("৳") &&
                !line.includes("Delivery") &&
                !line.includes("Per") &&
                !line.includes("Add to Bag") &&
                !line.includes("Min.") &&
                !line.includes("Sort By") &&
                !line.includes("Price Range") &&
                !line.includes("Express Delivery")
              ) {
                name = line;
                break;
              }
            }
          }

          if (!hasImage) continue;
          if (!name || name.length < 3) continue;

          const img = div.querySelector("img");
          let imageUrl =
            img?.getAttribute("src") ||
            img?.getAttribute("data-src") ||
            img?.getAttribute("data-lazy-src") ||
            "";
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
          }

          const productLink = div.querySelector('a[href^="/"]');
          const productPath = productLink?.getAttribute("href") ?? null;
          const competitorProductId = productPath ? `shwapno:${productPath.replace(/^\//, "")}` : null;
          const key = `${name}::${price}`;
          if (seen.has(key)) continue;
          seen.add(key);

          items.push({
            name,
            price,
            original_price: null,
            currency: "BDT",
            competitor_product_id: competitorProductId,
            competitor_product_url: productPath ? `${baseUrl}${productPath}` : null,
            package_quantity: null,
            package_unit: null,
            raw_data: {
              category: catName,
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
