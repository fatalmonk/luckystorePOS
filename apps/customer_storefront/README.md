# Lucky Store Customer Storefront

Next.js 15 App Router storefront for Lucky Store 1947 ([luckystore1947.com](https://luckystore1947.com)).

## Features
- Bilingual shopping experience (English and Bengali)
- Mobile-first responsive UI with warm design token styling
- Real-time catalog search and category filtering via Supabase RPC
- Instant cart persistence, drawer, and streamlined checkout

## Development & Verification
- Dev server: `npm run dev --workspace=apps/customer_storefront`
- Typecheck: `npm run typecheck --workspace=apps/customer_storefront`
- Unit tests: `npx vitest run --root apps/customer_storefront`
- Production build: `npm run build --workspace=apps/customer_storefront`
