# Lucky Store POS — Admin Web

Admin dashboard for Lucky Store POS — inventory management, daily sales, expenses, POS, reports, and retail analytics.

## Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 8 (Rolldown)
- **Routing**: React Router v7
- **Data**: Supabase (Postgres + Realtime + Storage)
- **Query**: TanStack Query + Virtualizer
- **UI**: Tailwind CSS + custom warm design tokens
- **Charts**: Recharts
- **i18n**: react-i18next (EN/BN)
- **PWA**: Service worker for offline support
- **Fonts**: Inter, Hind Siliguri, JetBrains Mono

## Setup

```bash
cd apps/admin_web
npm install
npm run dev     # http://localhost:5173/admin/
```

## Build

```bash
npm run build   # Outputs to dist/
```

Build script: `tsc --noEmit || true && vite build && node scripts/build-sw.mjs`

## Deployment

Vercel — auto-deploys from `apps/admin_web/` via monorepo config. Root `vercel.json` routes `/admin/*` to this app.

## Project Structure

```
src/
├── app/          # Root (App, AuthGuard, ErrorBoundary, LoginPage, QueryProvider)
├── components/   # Shared UI (Layout, SidebarNew, PageHeader, inventory/, ui/, data-display/)
├── features/     # Page-level modules (dashboard, inventory, sales, expenses, pos, reports, ...)
├── hooks/        # Shared hooks (useDebounce, useRealtime, useAnimatedNumber, useInventoryBulkActions)
├── lib/          # API client, auth context, format utils, Supabase types, i18n
└── styles/       # CSS tokens, base, components, layout
```

## Design System

Warm palette (cream/sand surfaces, charcoal text, terracotta accents). Design tokens in `src/styles/tokens.css` mapped to CSS custom properties.

## Key Features

- **Stock Inventory** — Virtualized grid/list with search, category filter, sorting, bulk actions, barcode scanning
- **Daily Sales** — Inline editable table with charts (pie, bar, line), payment breakdown, CSV export
- **Quick POS** — Dual-pane checkout with barcode, cart, payment modal, keyboard shortcuts
- **Expenses** — Track with category/payment breakdown and month-over-month trends
- **Dashboard** — KPI cards, cashflow chart, trend metrics, recent activity, receivables aging
- **Reports** — Sales, inventory value, profit & loss, top products
- **Collections** — Customer receivable tracking with aging, notes, payment capture
- **LEDGER** — Customer & supplier ledger with balance tracking
- **Competitor Prices** — Track and compare pricing
- **User Management** — Staff roles, PIN auth