Below is a full replacement README.md drafted from your original README plus the fixes and current project state from our conversation.

<div align="center">
# 🏪 Lucky Store POS
**A modern Point of Sale, inventory, and retail management system for businesses in Bangladesh**
[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[🚀 Live Demo](https://lucky-store-pos-six.vercel.app/) • [📱 Download APK](https://github.com/fatalmonk/luckystorePOS/releases) • [📖 Docs](docs/)
</div>
---
## 📌 Project Overview
**Lucky Store POS** is a multi-platform retail management system built for Bangladeshi retail businesses. It includes:
- A **Flutter mobile POS app** for in-store sales, inventory, customers, barcode scanning, offline support, and Bluetooth label printing.
- A **React + Vite admin dashboard** for sales analytics, inventory control, sales history, purchases, expenses, customers, suppliers, and reports.
- A **Supabase backend** for authentication, PostgreSQL database, row-level security, RPC functions, edge functions, and real-time capabilities.
- A **Vercel-hosted landing page** for product presentation and APK distribution.
The system supports both:
1. **Remote Supabase project mode**  
   Used for the original/production database and real business data.
2. **Local Supabase development mode**  
   Used for local schema replay, migrations, development testing, and safe debugging.
---
## ✨ Features
<details open>
<summary><b>📱 Mobile App — Flutter POS</b></summary>
<br>
| Feature | Description |
|---|---|
| 🛒 **Sales Management** | Process retail transactions with cash, card, mobile banking, and mixed payment support. |
| 📦 **Inventory Tracking** | Track real-time stock, low-stock alerts, stock movement, and item-level quantity. |
| 👥 **Customer Management** | Maintain customer profiles, contact details, loyalty data, and purchase history. |
| 🏷️ **Label Printing** | Print price labels with MRP using the MHT-P29L Bluetooth thermal printer. |
| 📡 **Barcode Scanning** | Scan barcodes for quick product lookup and checkout. |
| 🌐 **Offline Support** | Continue POS operations without internet and sync later when connected. |
| 🗺️ **Google Maps Integration** | Address selection and location support for delivery workflows. |
| 🧾 **Receipt / Sale Records** | Maintain sale, sale item, and payment history. |
| 🔐 **Supabase Auth** | Secure user login and profile mapping. |
</details>
<details open>
<summary><b>💻 Admin Dashboard — React + Vite</b></summary>
<br>
| Feature | Description |
|---|---|
| 📊 **Dashboard Analytics** | View sales totals, order counts, low-stock items, active sessions, and recent activity. |
| 📝 **Product Management** | Manage products, SKUs, categories, pricing, stock, and item metadata. |
| 📦 **Inventory Management** | View current stock, minimum quantity, reorder status, and inventory alerts. |
| 📈 **Sales History** | Search, filter, and inspect sales records by date, receipt/sale number, and store. |
| 🧾 **Sale Details** | View sale items, payments, cashier, status, totals, discounts, and void information. |
| 🛍️ **Purchase Entry** | Record purchases and stock intake. |
| 💰 **Expense Tracking** | Track operational expenses. |
| 👥 **Customer / Supplier Ledgers** | Manage account history, payments, and balances. |
| 🔐 **Authenticated Admin Access** | User profile resolution through Supabase Auth and `public.users`. |
| 🧩 **RPC-backed Data Layer** | Uses Supabase RPC functions for dashboard, inventory, and sales views. |
</details>
---
## 🧱 Tech Stack
| Layer | Technology |
|---|---|
| Mobile App | Flutter |
| Admin Web | React, Vite, TypeScript |
| Backend | Supabase |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Local Dev DB | Supabase CLI + Docker |
| Deployment | Vercel |
| Printer | MHT-P29L Bluetooth label printer |
| Maps | Google Maps |
| Payment | SSLCommerz |
| Package Runtime | Node.js |
---
## 📁 Project Structure
```txt
Lucky Store/
├── apps/
│   ├── mobile_app/              # Flutter POS app
│   ├── admin_web/               # React + Vite admin dashboard
│   └── scraper/                 # Product data scraper
├── landing-page/                # Public website / marketing page
├── supabase/
│   ├── migrations/              # PostgreSQL schema, RLS, functions, seed repairs
│   ├── functions/               # Supabase Edge Functions
│   └── config.toml              # Supabase local configuration
├── docs/                        # Project documentation
├── data/                        # Inventory CSVs and static data assets
├── schema_dump.sql              # Schema snapshot used for inspection/debugging
├── AGENTS.md                    # Coding-agent instructions
└── README.md

⸻

🚀 Quick Start

Prerequisites

# Flutter SDK
flutter --version
# Node.js
node --version
# Supabase CLI
supabase --version
# Docker
docker --version

Recommended versions:

Tool	Recommended
Flutter	>= 3.0.0
Node.js	>= 18.0.0
Supabase CLI	Latest stable
Docker	Required only for local Supabase

⸻

🧭 Local vs Remote Supabase

This project can run against either a local Supabase instance or the original remote Supabase project.

Remote Supabase Mode

Use this when you want to see the original project data.

Remote project URL:

https://hvmyxyccfnkrbxqbhlnm.supabase.co

The admin web app should use:

VITE_SUPABASE_URL=https://hvmyxyccfnkrbxqbhlnm.supabase.co
VITE_SUPABASE_ANON_KEY=<your Supabase anon/public key>

Recommended location:

apps/admin_web/.env.local

This file should stay local and ignored by Git.

Do not use service-role keys in frontend code.

Local Supabase Mode

Use this when you want to test migrations and local development behavior.

supabase start

Local default URL:

http://127.0.0.1:54321

Local development uses local generated/demo data unless seeded.

⸻

🐳 Do I Need Docker?

For remote Supabase data

No.

If the app is pointed at:

https://hvmyxyccfnkrbxqbhlnm.supabase.co

then Docker is not required for the database. The app talks directly to the remote Supabase project.

For local Supabase

Yes.

Docker is required when running:

supabase start
supabase db reset
supabase migration up --local

Supabase local runs PostgreSQL, Auth, PostgREST, Studio, and related services in Docker containers.

⸻

🔧 Environment Setup

Root environment

cp .env.example .env

Mobile app environment

cp apps/mobile_app/.env.example apps/mobile_app/.env

Admin web environment

Recommended:

touch apps/admin_web/.env.local

Example:

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

For local Supabase:

VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

For the original remote database:

VITE_SUPABASE_URL=https://hvmyxyccfnkrbxqbhlnm.supabase.co
VITE_SUPABASE_ANON_KEY=<remote anon/public key>

Important security rules

Never commit:

.env
.env.local
apps/admin_web/.env.local
apps/mobile_app/.env
service-role keys
JWTs
access tokens
refresh tokens
database passwords
Supabase access tokens

⸻

📱 Mobile App Setup

cd apps/mobile_app
flutter pub get
flutter run

The mobile app supports:

* POS checkout
* Barcode scanning
* Customer management
* Inventory sync
* Offline operation
* Bluetooth printer integration
* Google Maps address support

⸻

💻 Admin Web Setup

cd apps/admin_web
npm install
npm run dev

Default admin URL:

http://localhost:5173/admin/

From the repository root, you can also run:

npm run dev
npm run typecheck
npm run build

⸻

🗄️ Supabase Local Setup

Start local Supabase:

supabase start

Reset local database:

supabase db reset

Apply pending local migrations only:

supabase migration up --local --yes

Do not run against remote unless intentionally approved:

supabase db push
supabase link

These commands can modify or link remote infrastructure and should not be used casually.

⸻

🔐 Authentication Model

The admin app login depends on both:

1. A Supabase Auth user in auth.users
2. A matching application profile in public.users

The profile must have a valid:

* auth_id
* tenant_id
* store_id
* role
* is_active

During local development, a local admin seed migration was added to make login reproducible.

Local seeded admin:

Email: admin@luckystore.com
Password: TempPassword123!

This local account exists for local Supabase development only. It will not work against the original remote Supabase project unless the same account exists there.

For original remote data, use the real remote Supabase account credentials.

⸻

🧩 Supabase RPC Functions

The admin dashboard relies heavily on Supabase RPC functions.

Important RPCs include:

RPC	Purpose
get_manager_dashboard_stats	Dashboard sales, order, session, and low-stock summary.
get_inventory_list	Inventory list with current stock, minimum quantity, and reorder status.
get_sales_history	Sales history table with filters and pagination.
get_sale_details	Sale details, sale items, and payment information.
get_low_stock_items	Low-stock inventory cards/alerts.
get_upcoming_reminders	Dashboard reminder data.

⸻

✅ Fixes Completed So Far

The following issues were diagnosed and fixed during development.

1. Local Admin Login Failure

Problem

Local Supabase login failed because:

* No seeded auth.users account existed for the admin.
* public.users.auth_id did not resolve after login.
* RLS blocked profile lookup.

Fix

Added a replay-safe local admin seed migration:

supabase/migrations/20260511000000_local_admin_login_seed.sql

This migration creates:

* local tenant
* local store
* confirmed local admin auth user
* matching public.users row
* narrow self-read RLS policy for authenticated profile lookup

Committed as:

1290965 fix(supabase): seed local admin and repair dashboard rpc

⸻

2. Dashboard RPC Schema Drift

Problem

Dashboard failed with:

column sales.total_amount does not exist

Local replay schema used:

sales.total

but older dashboard RPC code referenced:

sales.total_amount

Fix

Patched local dashboard RPC migrations to use sales.total.

Files:

supabase/migrations/20260420300000_manager_dashboard_rpc.sql
supabase/migrations/20260420300001_manager_dashboard_trend.sql

Committed as:

1290965 fix(supabase): seed local admin and repair dashboard rpc

⸻

3. Vite Build Failure From Stale Generated Dist

Problem

Build failed with:

Error: ENOTEMPTY, Directory not empty:
apps/admin_web/dist/assets

Fix

Removed stale generated output:

rm -rf apps/admin_web/dist
npm run typecheck
npm run build

No source code change was required.

⸻

4. Sales Page React Hook Crash

Problem

The sales page crashed with:

Rendered fewer hooks than expected.
This may be caused by an accidental early return statement.

Root Cause

SalesHistoryPage returned early on error before later hooks such as useRef and virtualizer setup were called.

Fix

Moved the error return below all hook declarations so hooks are always called in a stable order.

File:

apps/admin_web/src/features/sales/SalesHistoryPage.tsx

Committed as:

0d5caaf fix(admin): stabilize sales history hook order

⸻

5. Local Inventory and Sales RPC Runtime Failures

Problem

Local /admin/inventory and /admin/sales had repeated RPC failures.

Observed errors included:

column sl.updated_at does not exist
column s.sale_number does not exist

Root Cause

Local replay schema differed from later POS-style schema assumptions:

* stock_levels did not have updated_at
* baseline local sales used receipt_number and total
* some later RPCs expected sale_number and total_amount

Fix

Patched local RPC definitions and added a follow-up runtime repair migration:

supabase/migrations/20260423230000_lean_inventory_rpcs.sql
supabase/migrations/20260506000004_repair_remaining_rpc_functions.sql
supabase/migrations/20260511010000_repair_inventory_sales_runtime_rpcs.sql

Committed as:

8e1101e fix(supabase): repair inventory and sales runtime rpcs

⸻

6. PWA and Dev Console Warnings

Problems

Local dev console showed:

GET /sw.js 404
Service worker not served with correct MIME type
GET /pwa-192x192.png 404
Manifest icon download error
Deprecated apple-mobile-web-app-capable warning
Form field should have id or name

Fixes

* Disabled service worker registration in dev mode.
* Unregistered stale dev service workers.
* Made service worker path base-aware in production.
* Reused existing PWA icons.
* Added mobile-web-app-capable.
* Added stable id, name, and aria-label attributes to visible search inputs.

Files:

apps/admin_web/index.html
apps/admin_web/public/manifest.json
apps/admin_web/src/lib/sw-register.ts
apps/admin_web/src/components/TopHeader.tsx
apps/admin_web/src/features/inventory/InventoryListPage.tsx

Committed as:

4a06fad fix(admin): clean up local dev pwa warnings

⸻

7. Remote Supabase Configuration

Problem

The app was showing local/demo data instead of original project data.

Root Cause

The admin app was pointed at local Supabase:

http://127.0.0.1:54321

Fix

Updated local ignored frontend env file:

apps/admin_web/.env.local

to point at:

https://hvmyxyccfnkrbxqbhlnm.supabase.co

No env values were committed.

⸻

8. Manifest JSON Syntax Error

Problem

Browser showed:

manifest.json:1 Manifest: Line: 1, column: 1, Syntax error

Root Cause

The manifest path was being resolved through the /admin/ SPA base and could return HTML instead of JSON.

Fix

Changed manifest and PWA icon links to resolve correctly from the admin base:

<link rel="manifest" href="../manifest.json" />
<link rel="apple-touch-icon" href="../pwa-192x192.png" />

File:

apps/admin_web/index.html

Committed as:

9590d63 fix(admin): correct manifest asset path

⸻

⚠️ Known Remaining Issue

Remote get_sales_history Permission / RPC Error

Current browser issue:

POST https://hvmyxyccfnkrbxqbhlnm.supabase.co/rest/v1/rpc/get_sales_history
400 Bad Request

A sanitized non-browser probe returned:

code: 42501
message: permission denied for function get_sales_history

Likely required remote SQL permission fix:

GRANT EXECUTE ON FUNCTION public.get_sales_history(
  uuid, text, timestamptz, timestamptz, integer, integer
) TO authenticated;

This is a remote schema permission change and should only be applied deliberately.

If permission is not the only issue, the browser response body should be inspected for:

* code
* message
* details
* hint

without printing auth headers, JWTs, cookies, or tokens.

⸻

🧪 Validation Commands

Run these before committing changes:

npm run typecheck
npm run build
git diff --check -- apps/admin_web supabase/migrations .gitignore
git status --short

Check generated output is not committed:

git status --short -- apps/admin_web/dist

Check latest commits:

git log --oneline -10

⸻

🧾 Recent Important Commits

9590d63 fix(admin): correct manifest asset path
4a06fad fix(admin): clean up local dev pwa warnings
8e1101e fix(supabase): repair inventory and sales runtime rpcs
0d5caaf fix(admin): stabilize sales history hook order
1290965 fix(supabase): seed local admin and repair dashboard rpc

⸻

🚀 Deployment

Landing Page

vercel --prod

Live URL:

https://lucky-store-pos-six.vercel.app/

Admin Web

The admin web is a Vite app under:

apps/admin_web

Build:

npm run build

or:

cd apps/admin_web
npm run build

Production deployment must include the correct environment variables:

VITE_SUPABASE_URL=https://hvmyxyccfnkrbxqbhlnm.supabase.co
VITE_SUPABASE_ANON_KEY=<remote anon/public key>

APK Distribution

Download APK builds from:

https://github.com/fatalmonk/luckystorePOS/releases

⸻

🔌 Integrations

<div align="center">

Service	Purpose
Supabase	Database, Auth, Edge Functions, RLS, RPC, Realtime
Google Maps	Address selection and delivery location workflows
SSLCommerz	Payment gateway for card/mobile banking payments
MHT-P29L Printer	Bluetooth thermal label printing
Vercel	Web deployment

</div>

⸻

🖨️ Hardware Support

MHT-P29L Label Printer

Supported features:

* Bluetooth connection via flutter_blue_plus
* TSPL command format
* Code128 barcode support
* MRP with strikethrough pricing
* 40x30mm label size
* Product price label printing

⸻

📊 Database Notes

Core business domains include:

tenants
stores
users
items / products
categories
stock_levels
stock_movements
sales
sale_items
sale_payments
customers
suppliers
expenses
reminders

Schema source:

supabase/migrations/

Reference schema snapshot:

schema_dump.sql

Important distinction:

* Local replay schema may differ from original remote schema.
* Do not blindly apply local repair migrations to the remote database.
* Remote schema changes must be based on the actual remote error and schema.

⸻

🧯 Troubleshooting

App shows empty/demo data

Check whether admin web is pointed at local Supabase:

VITE_SUPABASE_URL=http://127.0.0.1:54321

To use original data, point it at remote Supabase:

VITE_SUPABASE_URL=https://hvmyxyccfnkrbxqbhlnm.supabase.co

Restart Vite after env changes.

⸻

Login works locally but not remotely

The local seeded admin is only for local Supabase:

admin@luckystore.com
TempPassword123!

Remote login requires a real account in the remote Supabase Auth project.

⸻

Dashboard says failed to load data

Check RPC errors in DevTools Network tab.

Common causes:

* Missing function
* Wrong function signature
* Column drift
* Missing GRANT EXECUTE
* RLS denial
* Profile row missing tenant_id or store_id

⸻

Sales history returns 400

Check the response body from:

/rest/v1/rpc/get_sales_history

Capture only:

code
message
details
hint

Possible fix if permission error:

GRANT EXECUTE ON FUNCTION public.get_sales_history(
  uuid, text, timestamptz, timestamptz, integer, integer
) TO authenticated;

⸻

Manifest syntax error

If you see:

manifest.json:1 Manifest: Line: 1, column: 1, Syntax error

the browser is likely receiving HTML instead of JSON.

Current expected links:

<link rel="manifest" href="../manifest.json" />
<link rel="apple-touch-icon" href="../pwa-192x192.png" />

⸻

Vite build fails with ENOTEMPTY

Clean generated output:

rm -rf apps/admin_web/dist
npm run build

Do not commit dist.

⸻

Service worker warning in local dev

The app disables service worker registration outside production and unregisters stale dev service workers.

If warnings persist:

1. Open browser DevTools.
2. Go to Application → Service Workers.
3. Unregister old service workers.
4. Hard refresh.

⸻

🛡️ Safety Rules for Development

Do not commit:

.env
.env.local
apps/admin_web/.env.local
apps/mobile_app/.env
apps/admin_web/dist
node_modules
logs
screenshots
tokens
JWTs
service-role keys
database passwords

Do not run against remote unless explicitly approved:

supabase db push
supabase link

Do not expose:

Supabase anon key in logs
service-role key
JWT
access token
refresh token
cookies
session object
database URL

Frontend must only use the public anon key.

⸻

🧭 Future Steps

High Priority

1. Fix remote get_sales_history permission
    * Apply the targeted GRANT EXECUTE only after confirming the remote browser error.
    * Re-test /admin/sales.
2. Audit all remote RPC permissions
    * Confirm authenticated users can execute required RPCs:
        * get_sales_history
        * get_sale_details
        * get_inventory_list
        * get_manager_dashboard_stats
        * get_low_stock_items
        * get_upcoming_reminders
3. Confirm remote schema compatibility
    * Compare remote schema to local migrations.
    * Avoid applying local replay-only fixes to remote.
4. Verify RLS policies
    * Ensure users can read only their tenant/store data.
    * Confirm admin users can access required management data.
    * Avoid broad policies.

⸻

Medium Priority

1. Document environment modes
    * Add clear docs for:
        * local Supabase mode
        * remote Supabase mode
        * Vercel production mode
2. Create safe SQL repair scripts
    * Store remote-safe SQL separately from local replay migrations.
    * Add comments marking local-only vs remote-safe migrations.
3. Add RPC smoke test scripts
    * Login with anon client.
    * Call dashboard/inventory/sales RPCs.
    * Print sanitized OK/error only.
    * Do not print tokens.
4. Add seed documentation
    * Explain local admin seed account.
    * Explain why it does not apply to remote.
5. Improve browser verification workflow
    * Add checklist for:
        * Dashboard
        * Inventory
        * Sales
        * Login/logout
        * Manifest/PWA
        * Console errors

⸻

Low Priority

1. Improve PWA install experience
    * Add better icons.
    * Add maskable icon support.
    * Add screenshots in manifest.
    * Add app shortcuts.
2. Improve accessibility
    * Audit form labels.
    * Add ARIA labels where needed.
    * Improve keyboard navigation.
3. Improve admin UX
    * Better empty states.
    * Better loading states.
    * Better RPC error display.
    * Retry actions for transient network failures.
4. Add deployment docs
    * Vercel env setup.
    * Supabase env setup.
    * Mobile APK release process.

⸻

🤝 Contributing

1. Fork the repository.
2. Create a feature branch:

git checkout -b feature/amazing-feature

3. Make changes.
4. Validate:

npm run typecheck
npm run build

5. Commit:

git commit -m "feat: add amazing feature"

6. Push:

git push origin feature/amazing-feature

7. Open a pull request.

See:

docs/root-docs/BRANCH_STRATEGY.md

⸻

📞 Contact

<div align="center">

📧 Email: luckystore.1947@gmail.com￼

📱 Phone: 01731944544

📍 Address: 665 Percival Hill Road, Emdad Park, Chawkbazar, Chittagong, Bangladesh

</div>

⸻

<div align="center">

Made with ❤️ for retailers in Bangladesh

© 2024 Lucky Store. All rights reserved.

</div>
```