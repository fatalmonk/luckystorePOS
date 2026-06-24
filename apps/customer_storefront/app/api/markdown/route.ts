import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts, fetchProductById, fetchCategories } from '../../lib/products';
import { CATEGORY_GROUPS } from '../../lib/types';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://luckystore1947.com';

/**
 * Markdown for Agents — content negotiation endpoint.
 *
 * When an AI agent sends Accept: text/markdown, the middleware rewrites
 * the request here. We render a markdown representation of the page
 * and return it with Content-Type: text/markdown.
 *
 * https://llmstxt.org/
 * https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 */

/** Rough token estimate: ~4 chars per token for English text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function mdHeader(title: string, subtitle?: string): string {
  let md = `# ${title}\n\n`;
  if (subtitle) {
    md += `> ${subtitle}\n\n`;
  }
  md += `[← Back to Lucky Store](${BASE_URL})\n\n---\n\n`;
  return md;
}

function mdProduct(p: any): string {
  let md = `### ${p.emoji || '📦'} ${p.name}\n\n`;
  const lines: string[] = [];
  if (p.price != null) {
    lines.push(`- **Price:** ৳${p.price}`);
  }
  if (p.originalPrice && p.originalPrice > p.price) {
    lines.push(`- **Was:** ৳${p.originalPrice} (sale!)`);
  }
  if (p.badge) {
    lines.push(`- **Badge:** ${p.badge}`);
  }
  if (p.unit) {
    lines.push(`- **Unit:** ${p.unit}`);
  }
  if (p.category) {
    lines.push(`- **Category:** [${p.category}](${BASE_URL}/category/${p.slug || ''})`);
  }
  lines.push(`- **View:** [Product page](${BASE_URL}/product/${p.id})`);
  md += lines.join('\n') + '\n\n';
  return md;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '/';

  let markdown = '';

  try {
    if (path === '/' || path === '') {
      // Homepage
      const [{ products }, categories] = await Promise.all([
        fetchProducts(undefined, undefined, undefined, 0, 12),
        fetchCategories(),
      ]);

      markdown = mdHeader(
        'Lucky Store — Your Neighborhood Grocery',
        'Fresh products, fair prices, same-day delivery in Chittagong, Bangladesh.'
      );

      markdown += `## Categories\n\n`;
      for (const cat of categories.slice(0, 12)) {
        markdown += `- ${cat.emoji || '📦'} [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
      }
      markdown += `\n## Featured Products\n\n`;
      for (const p of products.slice(0, 12)) {
        markdown += mdProduct(p);
      }
      markdown += `\n---\n\n*Browse all products at ${BASE_URL}/search*\n`;
    } else if (path.startsWith('/category/')) {
      const slug = path.replace('/category/', '');

      // Check if it's a category group
      const group = CATEGORY_GROUPS.find((g) => g.slug === slug);
      const categories = await fetchCategories();
      const cat = categories.find((c) => c.slug === slug);

      if (cat) {
        const { products } = await fetchProducts(undefined, cat.id, undefined, 0, 24);
        markdown = mdHeader(
          `${cat.emoji || '📦'} ${cat.name}`,
          `${products.length} products available`
        );
        for (const p of products) {
          markdown += mdProduct(p);
        }
      } else if (group) {
        markdown = mdHeader(group.label, 'Category group');
        markdown += `*This is a category group page. Browse individual categories:*\n\n`;
        for (const c of categories) {
          markdown += `- [${c.name}](${BASE_URL}/category/${c.slug})\n`;
        }
      } else {
        markdown = mdHeader('Category Not Found');
        markdown += `No category found for slug: ${slug}\n\n[Browse all categories](${BASE_URL}/category)\n`;
      }
    } else if (path.startsWith('/product/')) {
      const id = path.replace('/product/', '');
      const product = await fetchProductById(id);

      if (product) {
        markdown = mdHeader(`${product.emoji || '📦'} ${product.name}`);
        markdown += mdProduct(product);
        if (product.description) {
          markdown += `## Description\n\n${product.description}\n\n`;
        }
        markdown += `---\n\n[Add to cart](${BASE_URL}/product/${product.id}) | [Continue shopping](${BASE_URL})\n`;
      } else {
        markdown = mdHeader('Product Not Found');
        markdown += `No product found for ID: ${id}\n\n[Browse products](${BASE_URL})\n`;
      }
    } else if (path === '/search') {
      const q = searchParams.get('q') || '';
      if (q) {
        const { products } = await fetchProducts(q, undefined, undefined, 0, 20);
        markdown = mdHeader(`Search: "${q}"`, `${products.length} results`);
        for (const p of products) {
          markdown += mdProduct(p);
        }
      } else {
        markdown = mdHeader('Search Lucky Store');
        markdown += `Search our product catalog. Visit ${BASE_URL}/search to use the web search.\n\n`;
        markdown += `Available categories:\n\n`;
        const categories = await fetchCategories();
        for (const cat of categories) {
          markdown += `- [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
        }
      }
    } else if (path === '/category') {
      const categories = await fetchCategories();
      markdown = mdHeader('All Categories', `${categories.length} categories`);
      for (const cat of categories) {
        markdown += `- ${cat.emoji || '📦'} [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
      }
      markdown += '\n';
      for (const group of CATEGORY_GROUPS) {
        markdown += `- **${group.label}** — [Browse](${BASE_URL}/category/${group.slug})\n`;
      }
    } else {
      // Generic fallback
      markdown = mdHeader('Lucky Store');
      markdown += `*This page doesn't have a markdown representation yet.*\n\n`;
      markdown += `Visit [${path}](${BASE_URL}${path}) in your browser.\n\n`;
      markdown += `## Quick Links\n\n`;
      markdown += `- [Home](${BASE_URL})\n`;
      markdown += `- [Categories](${BASE_URL}/category)\n`;
      markdown += `- [Search](${BASE_URL}/search)\n`;
    }
  } catch (e: any) {
    markdown = mdHeader('Lucky Store');
    markdown += `*Error generating markdown: ${e?.message || 'unknown error'}*\n\n`;
    markdown += `Visit [${BASE_URL}](${BASE_URL}) in your browser.\n`;
  }

  const tokens = estimateTokens(markdown);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'x-markdown-tokens': String(tokens),
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      Vary: 'Accept',
    },
  });
}