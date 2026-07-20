<div align="center">

<img src="./assets/screenshots/admin-dashboard.png" alt="Lucky Store POS" width="100%">

</div>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-32CD32?style=flat-square" alt="Version">
  &nbsp;
  <img src="https://img.shields.io/badge/license-Apache--2.0-32CD32?style=flat-square&logo=apache&logoColor=white" alt="License">
  &nbsp;
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20Web%2FPWA-6C757D?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-3.29+-02569B?style=flat-square&logo=flutter&logoColor=white" alt="Flutter">
  &nbsp;
  <img src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  &nbsp;
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  &nbsp;
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  &nbsp;
  <img src="https://img.shields.io/badge/Supabase-Production-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  &nbsp;
  <img src="https://img.shields.io/badge/PRs-welcome-32CD32?style=flat-square" alt="PRs Welcome">
</p>

---

<p align="center">
  <strong>A free, open-source Point of Sale system built for retail shops in Bangladesh</strong><br>
  <em>bKash Payments | Offline-First | Bangla Interface | Bluetooth Label Printing | Real-Time Inventory | AI Price Monitoring | Live E-commerce Storefront</em>
</p>

<p align="center">
  <a href="https://github.com/fatalmonk/luckystorePOS/releases">
    <img src="https://img.shields.io/badge/⬇️%20Download%20APK-Latest%20Release-32CD32?style=for-the-badge&logo=github&logoColor=white" alt="Download Latest Release" height="50">
  </a>
</p>

---

## 📋 Quick Navigation

<p align="center">

[Why Lucky Store?](#-why-lucky-store-pos) ·
[Screenshots](#-screenshots) ·
[Customer Storefront](#-customer-storefront) ·
[Features](#-features) ·
[Tech Stack](#-tech-stack) ·
[Quick Start](#-quick-start) ·
[Deployment](#-deployment) ·
[Contributing](#-contributing)

</p>

---

## 🤔 Why Lucky Store POS?

**Lucky Store POS is purpose-built for the reality of Bangladeshi retail:** intermittent internet, bKash dominance, thermal label culture, and the need for both Bangla and English at the counter.

| Feature | **Lucky Store POS** | Traditional POS | Cloud-Only POS |
|:--------|:-------------------|:----------------|:---------------|
| **Offline Mode** | Full offline with Drift SQLite; auto-syncs when back online | Paper-based fallback only | Stops working completely |
| **bKash Payments** | Native bKash checkout built into the POS flow | Manual reconciliation | Not available |
| **SSLCommerz Cards** | Integrated card + mobile banking gateway | Separate terminal required | May support, generic |
| **Bluetooth Label Printing** | MHT-P29L TSPL, Code128 barcodes, 40x30mm labels | Manual price tagging | Not supported |
| **Bangla Interface** | English + Bangla with HindSiliguri font throughout | English-only | English-only |
| **Competitor Price Monitoring** | AI-powered scraping of Shwapno, Chaldal, AamaderBazar | Not available | Not available |
| **Multi-Tenant Security** | Supabase RLS with tenant isolation per store | Basic auth only | Basic auth only |
| **Deployment** | Docker one-command, Vercel free tier, APK sideload | Complex server setup | Vendor lock-in |
| **Cost** | Free & Open Source (Apache 2.0) | License fees + hardware | Monthly SaaS fees |
| **Realtime Inventory** | Supabase realtime subscriptions; low-stock alerts | End-of-day manual counts | Polling-based only |

---

## 📸 Screenshots

### 💻 Admin Dashboard (React + Vite)

| Dashboard | Products | Inventory |
|:---------:|:--------:|:---------:|
| ![Dashboard](assets/screenshots/admin-dashboard.png) | ![Products](assets/screenshots/admin-products.png) | ![Inventory](assets/screenshots/admin-inventory.png) |
| *Sales analytics, revenue trends & key metrics* | *Category-based product grid with thumbnail images* | *Real-time stock with low-stock indicators* |

| Supplier Ledger | Collections | POS Quick Sale |
|:---------------:|:---------:|:----------------:|
| ![Ledger](assets/screenshots/admin-ledger.png) | ![Collections](assets/screenshots/admin-collections.png) | ![POS](assets/screenshots/admin-pos.png) |
| *Supplier payables with aging breakdown* | *Overdue customer follow-ups & payment tracking* | *Fast counter checkout with barcode lookup* |

### 📱 Mobile App (Flutter) — Coming Soon

> Mobile screenshots are being captured. Download the [APK from GitHub Releases](https://github.com/fatalmonk/luckystorePOS/releases) to see the Flutter POS app in action.

---

## ✨ Features

### 📱 Mobile POS (Flutter)

| Sales Management | Barcode Scanning | Offline Mode |
|:----------------:|:---------------:|:------------:|
| Cash, bKash, Card & Credit payments | Camera-based (Code128, EAN-13, QR) | Drift SQLite with background sync |

| Inventory Tracking | Label Printing | Localization |
|:------------------:|:-------------:|:------------:|
| Real-time stock + low-stock alerts | MHT-P29L Bluetooth, TSPL, 40×30mm labels | English + Bangla (HindSiliguri font) |

| PIN-Based Auth | Manager Dashboard | Store Operations |
|:-------------:|:-----------------:|:----------------:|
| Staff PIN via Supabase RPC | Close review, risk analytics, session summaries | Open/close shifts, cash reconciliation |

<details>
<summary><strong>🔍 Offline-First Architecture</strong></summary>

<br>

- **Drift (SQLite ORM)** for full local product catalog, cart, and sale recording
- **Background sync** via WorkManager + flutter_background_service
- **Conflict resolution** with idempotency keys and server-authoritative override
- **Feature toggle:** `ENABLE_OFFLINE_MODE=true`

</details>

<details>
<summary><strong>🔍 Payment Methods</strong></summary>

<br>

- **Cash** — default tender with change calculation
- **bKash** — native mobile banking checkout flow
- **SSLCommerz** — card payments (Visa, Mastercard) + mobile banking gateways
- **Credit** — customer ledger posting for deferred payment
- **Split payments** — multiple tenders per sale

</details>

<details>
<summary><strong>🔍 Bluetooth Label Printing (MHT-P29L)</strong></summary>

<br>

- Bluetooth connection via `flutter_blue_plus`
- TSPL command format for MHT-P29L thermal printers
- Code128 barcode generation via `barcode_widget`
- 40×30mm labels with MRP strikethrough pricing
- Bulk printing from CSV files
- Print retry queue for reliability

</details>

<details>
<summary><strong>🔍 Barcode Scanning</strong></summary>

<br>

- Camera-based scanning via `mobile_scanner` package
- Supports Code128, EAN-13, and QR code formats
- Instant product lookup in POS flow
- Auto-barcode generation (EAN-13) on product import

</details>

---

### 💻 Admin Web (React + Vite + TypeScript)

| Analytics Dashboard | POS Checkout | Product Management |
|:------------------:|:-----------:|:-----------------:|
| Sales trends, Recharts charts, low-stock alerts | Cart checkout, barcode lookup, receipt preview | Category thumbnails, grid/list toggle, image upload |

| Inventory Control | Finance Ledgers | Collections |
|:-----------------:|:--------------:|:-----------:|
| Real-time stock, adjust/history, status badges | Supplier payables + Customer receivables with aging | Overdue follow-ups, payment tracking |

| Purchase Management | Expense Tracking | PWA Support |
|:------------------:|:--------------:|:-----------:|
| Purchase entry, receiving, history | Pie/bar charts, 6 categories, 4 payment types | Installable on any device, offline caching |

| Delivery Orders | Social Posting | Staff Dashboard |
|:--------------:|:--------------:|:---------------:|
| Order tracking & fulfillment | Facebook Pages API integration | Staff PIN auth & session management |

| Competitor Prices | Import Wizard | Reports |
|:-----------------:|:-------------:|:-------:|
| Shwapno/Chaldal price comparison | CSV/Excel product + party import | Sales, finance, inventory reporting |

| OAuth Consent | Other Income | Reminders |
|:-------------:|:------------:|:---------:|
| Third-party agent access flow | Non-sale income tracking | Follow-up & task reminders |

<details>
<summary><strong>🔍 Dashboard & Analytics</strong></summary>

<br>

- **5 MetricCards:** To Receive, To Give, Today Sales, Stock Purchases, Expense
- **Custom bar chart:** Sales vs Expenses vs Stock Purchases (14-day view)
- **Payment breakdown:** Cash/Bkash/Credit with percentage progress bars
- **Low-stock alerts** and **upcoming reminders** widgets
- **Realtime toast notifications** on new sales via Supabase Realtime

</details>

<details>
<summary><strong>🔍 Finance, Ledgers & Collections</strong></summary>

<br>

- **Supplier Ledger** — payables, aging summary, transaction history
- **Customer Ledger** — receivables, credit history, balance tracking
- **Collections Workspace** — overdue customer list with days-overdue, promise-to-pay dates, quick actions (call/SMS/note/payment)
- **Expense Tracking** — pie + bar charts (Recharts), 6 categories (Stock Purchase, Capital Expenditure, Utility, Transport, Salary, Partners Take, Other), 4 payment types
- **Daily Sales** — end-of-day manual entry with line+bar charts, period comparisons
- **Toggle:** `ENABLE_LEDGER_POSTING=true` · `ENABLE_DAILY_RECONCILIATION=true`

</details>

<details>
<summary><strong>🔍 PWA (Progressive Web App)</strong></summary>

<br>

- Installable on desktop, tablet, and mobile — no app store needed
- Service worker with offline caching (custom Vite build via `build-sw.mjs`)
- Install prompt banner and offline indicator
- Works on any modern browser

</details>

<details>
<summary><strong>🔍 Storybook Component Library</strong></summary>

<br>

- Storybook 8.6 with React 19 + Vite
- Isolated component development and visual testing
- Design tokens wired to Tailwind CSS
- Run: `cd apps/admin_web && npm run storybook`

</details>

---

### 🛒 Customer Storefront (Next.js 15 + E-commerce)

> **Live at [luckystore1947.com](https://luckystore1947.com)** — production storefront serving real customers.

| Browse & Shop | Product Details | Cart & Checkout |
|:------:|:---------------:|:---------------:|
| Department dropdown, category swimlanes, thematic pills, price filter | Variant selector, quantity stepper, MRP/strikethrough pricing | Cart sidebar, persistent state, stock-aware checkout |

| Search & Filter | Subcategory Pages | Wishlist |
|:---------------:|:-----------------:|:--------:|
| URL params for availability, sort, price ranges, query suggestions | `/category/[slug]` thumbnail grids with SSR + ISR (60s revalidate) | Out-of-stock notifications, persistent across sessions |

| Responsive Design | Accessibility | Internationalization |
|:----------------:|:-------------:|:--------------------:|
| Two-column desktop, mobile-optimized top nav | WCAG 2.1 AA compliant, semantic landmarks, focus management | English + Bangla (HindSiliguri font) |

<details>
<summary><strong>🔍 Storefront Pages & Routes (16 pages, 9 API routes)</strong></summary>

<br>

**Pages:** Home (`/`), Category listing (`/category`), Subcategory (`/category/[slug]`), Product details (`/product/[id]`), Search (`/search`), Cart (`/cart`), Checkout (`/checkout`), Order tracking (`/order`), Wishlist (`/wishlist`), Login (`/login`), Signup (`/signup`), Profile (`/profile`), Privacy (`/privacy`), Terms (`/terms`), Security policy, Data deletion

**API routes:** `/api/products`, `/api/categories`, `/api/checkout`, `/api/orders`, `/api/wishlist`, `/api/auth/callback`, `/api/health`, `/api/markdown`, `/api/webhooks/supabase-sync`

</details>

<details>
<summary><strong>🔍 AI Agent Protocol (MCP / OAuth 2.1)</strong></summary>

<br>

- **Agent-assisted shopping** via `auth.md` + OAuth 2.1 authorization server metadata
- `.well-known/` endpoints: `oauth-authorization-server`, `oauth-protected-resource`, `auth.md`, `api-catalog`, `openid-configuration`
- Admin web includes OAuth consent flow for third-party agent access
- See: [agent.luckystore1947.com](https://agent.luckystore1947.com)

</details>

<details>
<summary><strong>🔍 Testing</strong></summary>

<br>

- **Vitest** unit tests (5 suites): cart, wishlist, orders, validation, price formatting
- **Playwright** E2E: checkout + wishlist flows (desktop Chrome + Pixel 5 mobile)
- Lighthouse-ready, sitemap + robots.ts generation
- Run: `cd apps/customer_storefront && npm test && npx playwright test`

</details>

---

### 🔐 Backend & Security (Supabase)

| Dimension | Count |
|:----------|:-----|
| Database tables | 117 |
| SQL migrations | 162 |
| Stored procedures (RPCs) | 86 |
| Edge functions (Deno) | 10 |
| RLS policies | Tenant-isolated on every table |

<details>
<summary><strong>🔍 Edge Functions</strong></summary>

<br>

| Function | Purpose |
|:---------|:--------|
| `create-sale` | Rate-limited sale creation with input validation, auth verification, and `complete_sale` RPC |
| `adjust-stock` | Stock adjustment with configurable CORS |
| `import-inventory` | CSV/XLSX import with auto-barcode (EAN-13), image upload, batch/expiry tracking, audit trail |
| `create-card-checkout` | SSLCommerz card checkout session initiation |
| `payment-ipn` | SSLCommerz Instant Payment Notification validator |
| `payment-return-success` | SSLCommerz success callback handler |
| `payment-return-fail` | SSLCommerz failure callback handler |
| `payment-return-cancel` | SSLCommerz cancellation callback handler |
| `post-facebook` | Facebook Pages API social media posting |
| `send-whatsapp-message` | WhatsApp Business Cloud API messaging |

</details>

<details>
<summary><strong>🔍 Security Architecture</strong></summary>

<br>

- **Tenant-Isolated Row-Level Security** — every table has RLS policies isolating data per store
- **Multi-tenant** — single Supabase project serves unlimited stores
- **PIN-based staff auth** via `authenticate_staff_pin` RPC (separate from admin email/password)
- **Service role key** used only in edge functions; anon key for client operations
- **Rate limiting** via database-backed `rate_limits` table + `check_rate_limit` RPC
- **Input validation** on all edge functions (UUID format, positive numbers, max amounts)
- See: [Security Recommendations](docs/SECURITY_RECOMMENDATIONS.md)

</details>

<details>
<summary><strong>🔍 SSLCommerz Payment Flow</strong></summary>

<br>

1. **Edge function** creates checkout session with sale details
2. **Redirect** to SSLCommerz hosted payment page
3. **IPN edge function** processes SSLCommerz callback (validates, records payment)
4. **Success/fail/cancel** return handlers update sale status
5. Supports **Visa, Mastercard, bKash, Nagad, Rocket** through a single gateway

</details>

---

### 🕵️ Competitor Price Monitoring

<details>
<summary><strong>🔍 AI-Powered Scraping of Bangladeshi Retailers</strong></summary>

<br>

- **Puppeteer-based scraping** of major Bangladeshi retailers:
  - **Shwapno** — Bangladesh's largest retail chain
  - **Chaldal** — leading online grocery (per-category: biscuits, chocolates, beverages, noodles, etc.)
  - **AamaderBazar** — competitive pricing data
  - **Unilever Bangladesh** — brand-level pricing
- **AI product mapping** via string-similarity algorithms (`ai-mapper.js`)
- **Price comparison generation** (`generate-price-mapping.js`)
- Data stored in Supabase for reporting and competitive analysis
- Run: `cd apps/scraper && npm run update-prices`

</details>

---

## 🛠 Tech Stack

### Mobile App
**Flutter 3.29+** · Dart ≥3.7.2 · Provider · Drift (SQLite) · supabase_flutter · flutter_blue_plus · mobile_scanner · fl_chart · workmanager · flutter_background_service · flutter_dotenv · google_fonts · intl · barcode_widget · flutter_thermal_printer · pdf · printing · csv · excel · webview_flutter

### Customer Storefront
**Next.js 15.5** · React 19 · TypeScript 5.9 (strict) · Tailwind CSS 3.4 · App Router · Supabase SSR · Playwright · Vitest · Zod 3 · PostCSS · Autoprefixer · MCP/OAuth 2.1 agent protocol

### Admin Web
**React 19.2** · Vite 6 · TypeScript 5.9 (strict) · Tailwind CSS 3.4 · React Router 7 · TanStack Query 5 · TanStack Virtual 3 · Recharts 3 · React Hook Form 7 · Zod 3 · Lucide React · Storybook 8.6 · Vitest 3 · Testing Library · date-fns 4 · clsx

### Backend
**Supabase** · PostgreSQL 17 · Deno Edge Functions · Row-Level Security · Realtime Subscriptions · Storage · Neon APAC read replica

### Infrastructure
**Cloudflare** · R2 object storage (APAC) · Workers (image proxy, Neon proxy, agent) · Turnstile · Wrangler · Docker (multi-stage Node 22 + Nginx 1.27 Alpine) · GitHub Actions (7 workflows) · Vercel (admin + storefront + landing)

### Scraper
**Node.js** · Puppeteer · string-similarity · xlsx

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum Version | Check |
|:-----|:---------------|:------|
| Flutter SDK | ≥ 3.29.3 | `flutter --version` |
| Node.js | ≥ 20.0.0 | `node --version` |
| npm | ≥ 10.0.0 | `npm --version` |
| Supabase CLI | ≥ 1.0.0 | `supabase --version` |
| Docker | ≥ 24.0.0 | `docker --version` *(optional)* |

### Setup

```bash
# 1. Clone and configure
git clone https://github.com/fatalmonk/luckystorePOS.git
cd luckystorePOS
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 2. Start Supabase locally
supabase start
supabase db reset

# 3. Run the Flutter mobile app
cd apps/mobile_app
cp .env.example .env        # Fill in Supabase credentials
flutter pub get
flutter run

# 4. Run the admin web dashboard
cd apps/admin_web
npm install
npm run dev                  # Opens at http://localhost:5173

# 5. Run the customer storefront
cd apps/customer_storefront
npm install
cp .env.example .env.local   # Fill in Supabase + R2 image URL
npm run dev                  # Opens at http://localhost:3000

# 6. Storybook (optional, in apps/admin_web)
npm run storybook            # Opens at http://localhost:6006

# 7. Docker (optional — production-like)
docker compose up -d         # Admin web at http://localhost:8080
```

---

## 📁 Project Structure

```
luckystorePOS/
├── apps/
│   ├── mobile_app/          # Flutter POS app (141 Dart files, 13 feature modules)
│   ├── admin_web/           # React + Vite admin dashboard (19 features, 26 routes)
│   ├── customer_storefront/   # Next.js 15 e-commerce — LIVE at luckystore1947.com (16 pages, 9 API routes)
│   └── scraper/             # Puppeteer competitor price scraper (Shwapno, Chaldal, AamaderBazar, Unilever)
├── supabase/
│   ├── migrations/          # 162 SQL migration files
│   ├── functions/           # 10 Deno edge functions
│   ├── rpc/                 # Raw stored procedure scripts
│   ├── views/               # Database views
│   └── public/policies/     # RLS policy definitions
├── landing/                 # Static HTML marketing page (Vercel)
├── cloudflare/              # Workers (images, neon-proxy, agent) + R2 config
├── assets/                  # Screenshots & static assets
│   └── screenshots/         # App screenshots (incl. dark mode)
├── scripts/                 # Build, deploy, DB, seed, ops, and test scripts
├── data/                    # Inventory CSVs, competitor data, account data
├── docker/                  # Nginx config + seed DB Dockerfile
├── .github/workflows/       # CI/CD (7 workflows: ci, flutter-ci, storefront-ci, deploy-storefront, deploy-agent, scraper-daily, monitor-robots)
├── docker-compose.yml       # One-command Docker deployment
├── Dockerfile               # Multi-stage Node 22 + Nginx 1.27 Alpine
├── vercel.json              # Vercel routing & build config
└── LICENSE                  # Apache 2.0
```

---

## 🚢 Deployment

<details>
<summary><strong>🔍 Vercel (Admin Web + Landing Page)</strong></summary>

<br>

- Auto-deploys on push to `main`
- Serves landing page at `/` and admin web at `/admin/*` from a single project
- Build command: `bash scripts/build/vercel.sh`
- Live: [admin.luckystore1947.com](https://admin.luckystore1947.com/) (or [lucky-store-pos-six.vercel.app](https://lucky-store-pos-six.vercel.app/))

</details>

<details>
<summary><strong>🔍 Vercel (Customer Storefront)</strong></summary>

<br>

- Separate Vercel project, auto-deploys on push to `main`/`develop` (workflow: `deploy-storefront.yml`)
- Next.js 15 App Router with ISR (60s revalidate), SSR, sitemap + robots generation
- Live: [luckystore1947.com](https://luckystore1947.com)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_IMAGE_BASE_URL`, `NEXT_PUBLIC_AGENT_WORKER_URL`

</details>

<details>
<summary><strong>🔍 Android APK</strong></summary>

<br>

- CI builds debug APK on every push to `main`/`develop` (see `flutter-ci.yml`)
- Artifact available in GitHub Actions runs (7-day retention)
- Release APKs: [GitHub Releases](https://github.com/fatalmonk/luckystorePOS/releases)
- Google Play Store listing: planned

</details>

<details>
<summary><strong>🔍 Docker</strong></summary>

<br>

- Multi-stage build: Node 22 Alpine builds React app → Nginx 1.27 Alpine serves it
- Non-root `appuser` (UID 1001) for security
- Health check configured on port 80
- Optional `seed-db` profile for database seeding
- `docker compose up -d` for one-command deployment

</details>

<details>
<summary><strong>🔍 Supabase Production</strong></summary>

<br>

```bash
supabase link --project-ref <your-project-ref>
supabase db push              # Apply all migrations
supabase functions deploy <name>  # Deploy edge functions
```

Set required secrets on each edge function:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGIN` — for CORS (e.g. `https://lucky-store.vercel.app`)

</details>

---

## 📖 Documentation

| Document | Purpose |
|:---------|:--------|
| [Deployment Guide](docs/DEPLOYMENT.md) | Full deployment instructions |
| [Design System](docs/DESIGN_SYSTEM.md) | Visual language, tokens, component patterns |
| [Brand Guidelines](docs/BRAND_GUIDELINES.md) | Brand identity, colors, typography |
| [Security Recommendations](docs/SECURITY_RECOMMENDATIONS.md) | Security fixes and hardening |
| [Env Variable Security](docs/env-security.md) | Public vs. secret env management |
| [Admin Login Guide](docs/ADMIN-LOGIN.md) | Admin portal access setup |
| [Drawer Reconciliation](docs/DRAWER_RECONCILIATION_IMPLEMENTATION.md) | Cash drawer reconciliation |
| [DNS + Aid Setup](docs/dns-aid-setup.md) | DNS configuration |
| [Architecture — Schema Authority](docs/architecture/schema-authority.md) | Database schema authority |
| [Architecture — Migration Baseline](docs/architecture/migration-baseline-repair.md) | Migration baseline repair |
| [Contributing](apps/customer_storefront/CONTRIBUTING.md) | How to contribute |

---

## 💬 Community & Support

- **Email:** luckystore.1947@gmail.com
- **Phone:** 01731944544
- **Address:** 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh
- **Issues:** [GitHub Issues](https://github.com/fatalmonk/luckystorePOS/issues) — bug reports & feature requests
- **Discussions:** [GitHub Discussions](https://github.com/fatalmonk/luckystorePOS/discussions)

---

## 🤝 Contributing

We welcome contributions. See [CONTRIBUTING.md](apps/customer_storefront/CONTRIBUTING.md) for guidelines.

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Commit format:** `type(scope): message` — e.g. `feat(pos): add split payment support`, `fix(rls): tighten tenant isolation`

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

## ⭐ Star History

<p align="center">
  <a href="https://www.star-history.com/#fatalmonk/luckystorePOS&Date" target="_blank">
    <img src="https://api.star-history.com/svg?repos=fatalmonk/luckystorePOS&type=Date" alt="Star History" width="600">
  </a>
</p>

## Contributors

<p align="center">
  <a href="https://github.com/fatalmonk/luckystorePOS/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=fatalmonk/luckystorePOS&max=100" alt="Contributors" />
  </a>
</p>

<div align="center">

**If you find this useful, give us a star ⭐**

[Report Bug](https://github.com/fatalmonk/luckystorePOS/issues) · [Request Feature](https://github.com/fatalmonk/luckystorePOS/issues)

</div>
