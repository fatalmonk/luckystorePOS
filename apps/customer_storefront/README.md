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

## Deployment
- Production runs at `luckystore1947.com` on Hostinger behind Cloudflare. Vercel project `lucky-store` is used for previews.
- Storefront changes merged to `main` are released by [the Hostinger workflow](../../.github/workflows/storefront-hostinger.yml): it builds one immutable package, deploys it to staging, runs smoke/E2E/load validation, then deploys the same package to production and smoke-checks both production hostnames.
- Use the Vercel preview and dedicated Supabase test project for preview verification. Never point E2E order mutations at the production Supabase project; CI preflight blocks that target.
