# Lucky Store POS - Project Instructions

## Project Overview
Lucky Store POS is a free, open-source Point of Sale system designed for retail shops in Bangladesh. It features an offline-first architecture, bKash payment integration, barcode/QR scanning, Bluetooth label printing, and AI-powered competitor price monitoring.

## Technology Stack
- **Mobile POS**: Flutter (Dart) with Drift (SQLite ORM) for offline-first capabilities.
- **Admin Web**: React 19 + Vite + TypeScript, featuring a PWA interface, Recharts for analytics, and Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Realtime, RLS-based tenant isolation).
- **Edge Functions**: 17+ Deno Edge Functions for business logic (sales, payment processing, inventory).
- **Scraper**: Node.js + Puppeteer for competitor pricing data collection.

## Building and Running

### Prerequisites
- Flutter SDK (≥ 3.29.3)
- Node.js (≥ 20.0.0)
- Supabase CLI (≥ 1.0.0)

### Development
- **Mobile App**: `cd apps/mobile_app && flutter pub get && flutter run`
- **Admin Web**: `cd apps/admin_web && npm install && npm run dev`
- **Local Supabase**: `supabase start && supabase db reset`

## Development Conventions
- **Commit Format**: Conventional Commits (`type(scope): message`).
- **Architecture**: Tenant-isolated RLS on all Supabase tables; Offline-first via local SQLite; ID-driven conflict resolution.
- **Language**: English interface with support for Bangla (HindSiliguri).
- **Security**: PIN-based staff authentication via Supabase RPCs; Row-Level Security (RLS) enforcement on all data layers.

## Important Operational Mandates
- **NEVER** expose the `SUPABASE_SERVICE_ROLE_KEY` to frontend or mobile code.
- **NEVER** run `supabase db reset`, `supabase db push`, or `supabase migration up` against real/staging environments without explicit human approval.
- **NEVER** bypass RPC inventory mutations or directly modify `stock_levels` directly.
- **Data Correctness & Ledger Safety**: Maintain append-only guarantees and `SERIALIZABLE` transaction integrity.
