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
      const items: NormalizedProduct[] = [];
      const seen = new Set<string>();

      const isProductLink = (link: Element): link is HTMLAnchorElement => {
        const href = link.getAttribute("href") ?? "";
        const text = link.textContent?.trim() ?? "";
        return (
          href.startsWith("/") &&
          href.length > 1 &&
          !href.includes("contact") &&
          !href.includes("about") &&
          !href.includes("deals") &&
          !href.includes("brands") &&
          text.length > 2 &&
          text.length < 200 &&
          !text.includes("Delivery") &&
          !text.includes("Per") &&
          !text.includes("Add to Bag") &&
          !text.includes("Min.")
        );
      };

      const links = Array.from(document.querySelectorAll('a[href^="/"]')).filter(isProductLink);

      for (const productLink of links) {
        try {
          const name = productLink.textContent?.trim() ?? "";
          const productPath = productLink.getAttribute("href");
          if (!productPath) continue;

          let candidate: HTMLElement | null = productLink.parentElement;
          let card: HTMLElement | null = null;
          for (let depth = 0; candidate && depth < 8; depth += 1) {
            const cardProductLinks = Array.from(candidate.querySelectorAll('a[href^="/"]')).filter(isProductLink);
            const hasOnlyThisProduct =
              cardProductLinks.length === 1 &&
              cardProductLinks[0]?.getAttribute("href") === productPath;
            if (hasOnlyThisProduct && candidate.querySelector("img") && candidate.textContent?.includes("৳")) {
              card = candidate;
              break;
            }
            candidate = candidate.parentElement;
          }
          if (!card) continue;

          const text = card.textContent || "";
          const priceMatch = text.match(/৳\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/);
          if (!priceMatch || !priceMatch[1]) continue;

          const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""));
          if (!Number.isFinite(price) || price <= 0) continue;

          const img = card.querySelector("img");
          let imageUrl =
            img?.getAttribute("src") ||
            img?.getAttribute("data-src") ||
            img?.getAttribute("data-lazy-src") ||
            "";
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
          }

          const competitorProductId = `shwapno:${productPath.replace(/^\//, "")}`;
          const key = competitorProductId;
          if (seen.has(key)) continue;
          seen.add(key);

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
