# Lucky Store

## Stack
React, Next.js 14 (App Router), Supabase, Tailwind, TypeScript, Flutter

## Current
Facebook page posting integration ready; awaiting system user token for automated posts

## Done
- Header redesign, CategoryGrid, FilterSidebar, ProductCard, Skeleton components
- Shallow routing, PromoGrid, SocialCarousel, Mobile enhancements
- Performance, Homepage integration, Category page infinite loop fix
- Delivery Orders real-time notifications & widgets
- Smart Pricing inline editor with competitor insights
- RPC functions grants for CI tests
- Added docs/ to .gitignore and untracked existing docs/ files
- Relocated brand assets to lucky-store-brand-guidelines/
- Registered luckystore1947.com domain, connected Vercel nameservers, SSL active
- admin_web: fixed vite base path (/admin/ → /), Router basename, hardcoded links
- customer_storefront: fixed Node 24.x engine, Vercel deploy path duplication
- Added Supabase env vars to GitHub secrets + workflow build step
- Fixed RPC grants with DO blocks for both function signatures
- Skipped .css files in secret_scan to prevent false positives on design tokens
- Facebook posting module wired into project (src/facebook.ts, tsconfig.json, env vars, scripts)

## Decisions
- Vercel deploys use Root Directory natively (no --cwd flags)
- SmartPricingEditor: extracted as reusable component
- seed.sql: stock_movements uses delta not quantity_change
- Domain: luckystore1947.com (matches social @luckystore1947)

## Blockers
- none

## Next
- Generate Facebook system user token in Business Manager and add to .env
- Phase 3 (Warm Night dark mode)
- Mobile app work

---
ctx: facebook posting wired | done: 21 | next: system user token or dark mode
