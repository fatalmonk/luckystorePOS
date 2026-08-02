import { NextRequest, NextResponse } from 'next/server';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS } from '../../lib/types';
import { toProductSlug, extractIdFromSlug, isBareUuid } from '../../lib/products/slugify';

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
  lines.push(`- **View:** [Product page](${BASE_URL}/product/${toProductSlug(p.name, p.id)})`);
  md += lines.join('\n') + '\n\n';
  return md;
}

/** Static site-map entries for fallback navigation. */
const SITE_MAP = [
  { path: '/', label: 'Home', desc: 'Online groceries, deals, and categories' },
  { path: '/category', label: 'All Categories', desc: 'Browse all product categories' },
  { path: '/category/oil-and-ghee', label: 'Oil & Ghee', desc: 'Cooking oil, mustard oil, and pure ghee' },
  { path: '/category/rice-and-grain', label: 'Rice & Grains', desc: 'Aromatic rice, basmati, and atta' },
  { path: '/category/dairy-and-eggs', label: 'Dairy & Eggs', desc: 'Fresh milk, eggs, butter, and cheese' },
  { path: '/category/snacks', label: 'Snacks', desc: 'Chanachur, chips, biscuits, and dry snacks' },
  { path: '/category/cold-beverages', label: 'Cold Beverages', desc: 'Juices, soft drinks, and energy boosters' },
  { path: '/category/personal-care', label: 'Personal Care', desc: 'Soaps, shampoo, toothpaste, and skincare' },
  { path: '/search', label: 'Search', desc: 'Search the product catalog' },
  { path: '/contact', label: 'Contact Us', desc: 'Address, phone, email, WhatsApp' },
  { path: '/privacy', label: 'Privacy Policy', desc: 'How we handle your data' },
  { path: '/terms', label: 'Terms of Service', desc: 'Usage terms and conditions' },
  { path: '/data-deletion', label: 'Data Deletion', desc: 'Request deletion of your data' },
  { path: '/security-policy', label: 'Security Policy', desc: 'Our security practices' },
  { path: '/login', label: 'Login', desc: 'Sign in to your account' },
  { path: '/signup', label: 'Sign Up', desc: 'Create a new account' },
  { path: '/auth.md', label: 'Agent Auth (auth.md)', desc: 'Agent authentication protocol' },
] as const;

/** Business context block — injected into the homepage markdown. */
function mdBusinessContext(): string {
  let md = `## About This Store\n\n`;

  md += `**Lucky Store** is a neighborhood grocery store in Chittagong, Bangladesh — `;
  md += `operating since 1947. Fresh products, fair prices, same-day delivery.\n\n`;

  md += `### 📍 Location & Contact\n\n`;
  md += `- **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong 4203, Bangladesh\n`;
  md += `- **Phone:** [+880 1731-944544](tel:+8801731944544)\n`;
  md += `- **Email:** [hello@luckystore1947.com](mailto:hello@luckystore1947.com)\n`;
  md += `- **WhatsApp:** [wa.me/8801731944544](https://wa.me/8801731944544)\n`;
  md += `- **Google Maps:** [View on Maps](https://maps.app.goo.gl/tfiRABoc1WsKEt619)\n`;
  md += `- **Coordinates:** 22.3550°N, 91.8363°E\n\n`;

  md += `### 🕐 Operating Hours\n\n`;
  md += `| Day | Hours |\n`;
  md += `| --- | --- |\n`;
  md += `| Monday – Saturday | 08:00 – 22:00 |\n`;
  md += `| Sunday | 09:00 – 21:00 |\n\n`;

  md += `### 💳 Payment Methods\n\n`;
  md += `Cash, bKash, Nagad, Card (Visa / Mastercard)\n\n`;
  md += `**Currency:** BDT (৳)\n\n`;

  md += `### 🎨 Brand Identity\n\n`;
  md += `- **Primary / Deep Night:** \`#0B0B0D\` (RGB 11, 11, 13)\n`;
  md += `- **Brand Accent / Saffron:** \`#f0c444\` (RGB 240, 196, 68)\n`;
  md += `- **Hero Banners:** 16:9 or 21:9 panoramic aspect ratios with left-third dark scrim\n\n`;

  md += `### 🌐 Social & Verification\n\n`;
  md += `- [Facebook](https://facebook.com/luckystore1947)\n`;
  md += `- [Instagram](https://instagram.com/luckystore1947)\n`;
  md += `- [WhatsApp](https://wa.me/8801731944544)\n`;
  md += `- **Google Merchant Center ID:** 5762702080\n`;
  md += `- **Schema.org type:** GroceryStore\n\n`;

  md += `### 🤖 For AI Agents\n\n`;
  md += `- **Agent Auth:** [/auth.md](${BASE_URL}/auth.md) — authentication protocol for programmatic access\n`;
  md += `- **OAuth Discovery:** [/.well-known/oauth-protected-resource](${BASE_URL}/.well-known/oauth-protected-resource)\n`;
  md += `- **API Catalog:** [/.well-known/api-catalog](${BASE_URL}/.well-known/api-catalog)\n`;
  md += `- **Content Negotiation:** Send \`Accept: text/markdown\` to any page URL\n`;
  md += `- **Stack:** Next.js 15, React 19, Supabase (Postgres + Auth), Cloudflare R2 CDN\n\n`;

  return md;
}

/** Render a full site map section. */
function mdSiteMap(): string {
  let md = `## Site Map\n\n`;
  for (const entry of SITE_MAP) {
    md += `- [${entry.label}](${BASE_URL}${entry.path}) — ${entry.desc}\n`;
  }
  md += `\n`;
  return md;
}

// ---------------------------------------------------------------------------
// Static page markdown renderers
// ---------------------------------------------------------------------------

function mdContactPage(): string {
  let md = mdHeader('Contact Us', 'Get in touch with Lucky Store 1947 in Chittagong.');

  md += `## How to Reach Us\n\n`;
  md += `- **Phone:** [+880 1731-944544](tel:+8801731944544)\n`;
  md += `- **Email:** [hello@luckystore1947.com](mailto:hello@luckystore1947.com)\n`;
  md += `- **WhatsApp:** [wa.me/8801731944544](https://wa.me/8801731944544)\n\n`;

  md += `## Visit Our Store\n\n`;
  md += `**Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong 4203, Bangladesh\n\n`;
  md += `[View on Google Maps](https://maps.app.goo.gl/tfiRABoc1WsKEt619)\n\n`;

  md += `## Operating Hours\n\n`;
  md += `| Day | Hours |\n`;
  md += `| --- | --- |\n`;
  md += `| Monday – Saturday | 08:00 – 22:00 |\n`;
  md += `| Sunday | 09:00 – 21:00 |\n\n`;

  md += `## Send a Message\n\n`;
  md += `Visit [${BASE_URL}/contact](${BASE_URL}/contact) to use the contact form.\n`;
  return md;
}

function mdPrivacyPage(): string {
  let md = mdHeader('Privacy Policy', 'How Lucky Store collects, uses, stores, and protects your data.');
  md += `*Effective date: May 6, 2024*\n\n`;

  md += `## 📋 Information We Collect\n\n`;
  md += `**Personal Information**\n`;
  md += `- Name and contact information (email, phone number)\n`;
  md += `- Business/store information\n`;
  md += `- Payment information (processed securely through third-party providers)\n`;
  md += `- Login credentials\n\n`;
  md += `**Business Data**\n`;
  md += `- Sales transactions and receipts\n`;
  md += `- Inventory and product information\n`;
  md += `- Customer data (as entered by you)\n`;
  md += `- Business analytics and reports\n\n`;
  md += `**Device Information**\n`;
  md += `- Device type and operating system\n`;
  md += `- App usage statistics\n`;
  md += `- Error logs for troubleshooting\n\n`;

  md += `## 🎯 How We Use Your Information\n\n`;
  md += `- To provide and maintain the App's functionality\n`;
  md += `- To process your transactions and generate receipts\n`;
  md += `- To sync data across your devices\n`;
  md += `- To send you important updates and notifications\n`;
  md += `- To improve our services and user experience\n`;
  md += `- To provide customer support\n`;
  md += `- To comply with legal obligations\n\n`;

  md += `## 🛡️ Data Storage and Security\n\n`;
  md += `We use Supabase for secure data storage. All data is encrypted in transit and at rest. `;
  md += `We implement industry-standard security measures to protect your information. `;
  md += `Your data is stored in secure data centers with restricted access.\n\n`;

  md += `## 🤝 Data Sharing\n\n`;
  md += `We do not sell your personal information. We may share data with:\n`;
  md += `- Service providers (payment processors, cloud hosting)\n`;
  md += `- Law enforcement when required by law\n`;
  md += `- Business partners (with your consent)\n\n`;

  md += `## ✅ Your Rights\n\n`;
  md += `You have the right to:\n`;
  md += `- Access your personal information\n`;
  md += `- Correct inaccurate data\n`;
  md += `- Request deletion of your data\n`;
  md += `- Export your data\n`;
  md += `- Opt-out of marketing communications\n\n`;

  md += `## 👶 Children's Privacy\n\n`;
  md += `Our App is not intended for use by children under 13. `;
  md += `We do not knowingly collect personal information from children under 13.\n\n`;

  md += `## 📝 Changes to This Policy\n\n`;
  md += `We may update this Privacy Policy from time to time. We will notify you of any changes `;
  md += `by posting the new policy on this page and updating the effective date.\n\n`;

  md += `## 📞 Contact Us\n\n`;
  md += `If you have any questions about this Privacy Policy:\n`;
  md += `- **Email:** [luckystore.1947@gmail.com](mailto:luckystore.1947@gmail.com)\n`;
  md += `- **Phone:** [01731944544](tel:+8801731944544)\n`;
  md += `- **Google Maps:** [View location](https://maps.app.goo.gl/tfiRABoc1WsKEt619)\n`;
  md += `- **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh\n`;
  return md;
}

function mdTermsPage(): string {
  let md = mdHeader('Terms of Service', 'Terms and conditions for using Lucky Store.');
  md += `*Effective date: May 6, 2024*\n\n`;

  md += `## ✍️ Acceptance of Terms\n\n`;
  md += `By accessing or using Lucky Store POS, you agree to be bound by these Terms and all applicable `;
  md += `laws and regulations. If you do not agree with any part of these terms, you may not use our service.\n\n`;

  md += `## 🛒 Description of Service\n\n`;
  md += `Lucky Store POS provides point-of-sale and inventory management tools for retail businesses, `;
  md += `plus an online storefront for customers to place orders. Features include sales processing, `;
  md += `inventory tracking, customer management, and reporting.\n\n`;

  md += `## 👤 User Accounts\n\n`;
  md += `- You must provide accurate and complete information when creating an account\n`;
  md += `- You are responsible for maintaining the security of your account credentials\n`;
  md += `- You are responsible for all activities under your account\n`;
  md += `- Notify us immediately of any unauthorized use\n\n`;

  md += `## 💳 Payment Terms\n\n`;
  md += `Some features may require payment. You agree to pay all fees associated with your subscription `;
  md += `plan. All payments are non-refundable unless otherwise stated. Online orders use Cash on Delivery (COD) by default.\n\n`;

  md += `## 📊 Data and Content\n\n`;
  md += `You retain ownership of your business data. By using our service, you grant us a license to `;
  md += `store and process your data for the purpose of providing our services.\n\n`;

  md += `## ⚠️ Limitation of Liability\n\n`;
  md += `Lucky Store shall not be liable for any indirect, incidental, special, consequential, or `;
  md += `punitive damages resulting from your use of the service.\n\n`;

  md += `## 🚪 Termination\n\n`;
  md += `We may terminate or suspend your account at any time for violations of these terms. `;
  md += `You may also terminate your account at any time by contacting us.\n\n`;

  md += `## ⚖️ Governing Law\n\n`;
  md += `These Terms shall be governed by the laws of Bangladesh.\n\n`;

  md += `## 📞 Contact Information\n\n`;
  md += `For questions about these Terms:\n`;
  md += `- **Email:** [luckystore.1947@gmail.com](mailto:luckystore.1947@gmail.com)\n`;
  md += `- **Phone:** [01731944544](tel:+8801731944544)\n`;
  md += `- **Google Maps:** [View location](https://maps.app.goo.gl/tfiRABoc1WsKEt619)\n`;
  md += `- **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh\n`;
  return md;
}

function mdDataDeletionPage(): string {
  let md = mdHeader('Data Deletion', 'Request deletion of your personal data.');

  md += `## How to Request Data Deletion\n\n`;
  md += `Lucky Store respects your right to have your personal data deleted. `;
  md += `You can request deletion of your account and associated data.\n\n`;

  md += `### Methods\n\n`;
  md += `1. **Email:** Send a deletion request to [luckystore.1947@gmail.com](mailto:luckystore.1947@gmail.com) with the subject "Data Deletion Request"\n`;
  md += `2. **In-App:** Navigate to Profile → Settings → Delete Account\n`;
  md += `3. **Contact Form:** Use the [contact form](${BASE_URL}/contact) and select "Data Deletion"\n\n`;

  md += `### What Gets Deleted\n\n`;
  md += `- Your account and login credentials\n`;
  md += `- Personal information (name, email, phone)\n`;
  md += `- Order history and preferences\n`;
  md += `- Saved addresses and payment preferences\n\n`;

  md += `### What We May Retain\n\n`;
  md += `- Transaction records required by law (tax/accounting purposes)\n`;
  md += `- Anonymized analytics data\n\n`;

  md += `### Timeline\n\n`;
  md += `Deletion requests are processed within 30 days. `;
  md += `You will receive a confirmation email once your data has been deleted.\n\n`;

  md += `---\n\nSee also: [Privacy Policy](${BASE_URL}/privacy)\n`;
  return md;
}

function mdSecurityPolicyPage(): string {
  let md = mdHeader('Security Policy', 'How Lucky Store protects your data and systems.');

  md += `## Our Security Practices\n\n`;
  md += `- **Encryption:** All data is encrypted in transit (TLS 1.3) and at rest\n`;
  md += `- **Authentication:** Supabase Auth with Row Level Security (RLS) on all tables\n`;
  md += `- **Infrastructure:** Hosted on Vercel (storefront) and Cloudflare (edge workers, R2 CDN)\n`;
  md += `- **Database:** Supabase Postgres with automated backups and point-in-time recovery\n`;
  md += `- **Secret Management:** Environment-level secrets, never committed to source control\n`;
  md += `- **Monitoring:** Google Analytics, Cloudflare analytics, and Supabase dashboards\n\n`;

  md += `## Vulnerability Reporting\n\n`;
  md += `If you discover a security vulnerability, please report it responsibly:\n\n`;
  md += `- **Email:** [luckystore.1947@gmail.com](mailto:luckystore.1947@gmail.com)\n`;
  md += `- Include steps to reproduce, impact assessment, and any relevant logs\n`;
  md += `- We aim to acknowledge reports within 48 hours\n\n`;

  md += `## Agent & API Security\n\n`;
  md += `- Agent authentication follows the [auth.md](${BASE_URL}/auth.md) protocol\n`;
  md += `- OAuth 2.1 discovery at [/.well-known/oauth-authorization-server](${BASE_URL}/.well-known/oauth-authorization-server)\n`;
  md += `- API keys and tokens are scoped to specific permissions\n`;
  md += `- Rate limiting applies per credential\n\n`;

  md += `---\n\nSee also: [Privacy Policy](${BASE_URL}/privacy) | [Terms of Service](${BASE_URL}/terms)\n`;
  return md;
}

function mdAuthPage(variant: 'login' | 'signup'): string {
  const title = variant === 'login' ? 'Login' : 'Sign Up';
  const action = variant === 'login' ? 'sign in to your' : 'create a new';

  let md = mdHeader(title, `${title} to Lucky Store.`);

  md += `## For Humans\n\n`;
  md += `Visit [${BASE_URL}/${variant}](${BASE_URL}/${variant}) in your browser to ${action} account.\n\n`;

  md += `## For AI Agents\n\n`;
  md += `Agents should use the **auth.md** protocol instead of the browser login flow:\n\n`;
  md += `1. Read [/auth.md](${BASE_URL}/auth.md) for the full agent authentication spec\n`;
  md += `2. Discover OAuth endpoints at [/.well-known/oauth-authorization-server](${BASE_URL}/.well-known/oauth-authorization-server)\n`;
  md += `3. Register via the \`register_uri\` endpoint\n`;
  md += `4. Exchange credentials for access tokens\n\n`;

  md += `### Supported Scopes\n\n`;
  md += `- \`read:products\` — Browse products, categories, prices\n`;
  md += `- \`read:orders\` — View order history\n`;
  md += `- \`write:orders\` — Create orders, submit purchases\n`;
  md += `- \`read:profile\` — Read user profile data\n`;
  md += `- \`write:profile\` — Update user preferences\n`;
  return md;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '/';

  let markdown = '';
  const { repo } = createProductRepository(supabase);

  try {
    if (path === '/' || path === '') {
      // Homepage — enriched with business context
      const [{ products }, categories] = await Promise.all([
        repo.search({ limit: 12 }),
        repo.getCategories(),
      ]);

      markdown = mdHeader(
        'Lucky Store — Your Neighborhood Grocery',
        'Fresh products, fair prices, same-day delivery in Chittagong, Bangladesh.'
      );

      markdown += mdBusinessContext();

      markdown += `## Categories\n\n`;
      for (const cat of categories.slice(0, 12)) {
        markdown += `- ${cat.emoji || '📦'} [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
      }
      markdown += `\n## Featured Products\n\n`;
      for (const p of products.slice(0, 12)) {
        markdown += mdProduct(p);
      }

      markdown += `\n`;
      markdown += mdSiteMap();
      markdown += `---\n\n*Browse all products at ${BASE_URL}/search*\n`;
    } else if (path.startsWith('/category/')) {
      const slug = path.replace('/category/', '');

      const group = CATEGORY_GROUPS.find((g) => g.slug === slug);
      const categories = await repo.getCategories();
      const cat = categories.find((c) => c.slug === slug);

      if (cat) {
        const { products } = await repo.search({ categoryId: cat.id, limit: 24 });
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
      const rawSlug = path.replace('/product/', '');
      // Support both bare UUIDs and semantic slugs
      const product = isBareUuid(rawSlug)
        ? await repo.getById(createProductId(rawSlug))
        : await repo.getByIdPrefix(extractIdFromSlug(rawSlug));

      if (product) {
        markdown = mdHeader(`${product.emoji || '📦'} ${product.name}`);
        markdown += mdProduct(product);
        if (product.description) {
          markdown += `## Description\n\n${product.description}\n\n`;
        }
        markdown += `---\n\n[Add to cart](${BASE_URL}/product/${toProductSlug(product.name, product.id)}) | [Continue shopping](${BASE_URL})\n`;
      } else {
        markdown = mdHeader('Product Not Found');
        markdown += `No product found for: ${rawSlug}\n\n[Browse products](${BASE_URL})\n`;
      }
    } else if (path === '/search') {
      const q = searchParams.get('q') || '';
      if (q) {
        const { products } = await repo.search({ query: q, limit: 20 });
        markdown = mdHeader(`Search: "${q}"`, `${products.length} results`);
        for (const p of products) {
          markdown += mdProduct(p);
        }
      } else {
        markdown = mdHeader('Search Lucky Store');
        markdown += `Search our product catalog. Visit ${BASE_URL}/search to use the web search.\n\n`;
        markdown += `Available categories:\n\n`;
        const categories = await repo.getCategories();
        for (const cat of categories) {
          markdown += `- [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
        }
      }
    } else if (path === '/category') {
      const categories = await repo.getCategories();
      markdown = mdHeader('All Categories', `${categories.length} categories`);
      for (const cat of categories) {
        markdown += `- ${cat.emoji || '📦'} [${cat.name}](${BASE_URL}/category/${cat.slug})\n`;
      }
      markdown += '\n';
      for (const group of CATEGORY_GROUPS) {
        markdown += `- **${group.label}** — [Browse](${BASE_URL}/category/${group.slug})\n`;
      }

    // ----- Static page handlers -----
    } else if (path === '/contact') {
      markdown = mdContactPage();
    } else if (path === '/privacy') {
      markdown = mdPrivacyPage();
    } else if (path === '/terms') {
      markdown = mdTermsPage();
    } else if (path === '/data-deletion') {
      markdown = mdDataDeletionPage();
    } else if (path === '/security-policy') {
      markdown = mdSecurityPolicyPage();
    } else if (path === '/login') {
      markdown = mdAuthPage('login');
    } else if (path === '/signup') {
      markdown = mdAuthPage('signup');

    } else {
      // Generic fallback — enriched with site map
      markdown = mdHeader('Lucky Store');
      markdown += `*This page doesn't have a dedicated markdown representation yet.*\n\n`;
      markdown += `Visit [${path}](${BASE_URL}${path}) in your browser.\n\n`;
      markdown += mdSiteMap();
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
