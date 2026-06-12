# Lucky Store

## Stack
React, Next.js 14 (App Router), Supabase, Tailwind, TypeScript, Flutter

## Current
Smart Pricing inline editor with competitor insights + CI test fixes

## Done
- Header redesign, CategoryGrid, FilterSidebar, ProductCard, Skeleton components
- Shallow routing, PromoGrid, SocialCarousel, Mobile enhancements
- Performance, Homepage integration, Category page infinite loop fix
- Delivery Orders real-time notifications & widgets
- Smart Pricing inline editor with competitor insights
- RPC functions grants for CI tests
- Added docs/ to .gitignore and untracked existing docs/ files

## Decisions
- Vercel deploys use Root Directory natively (no --cwd flags)
- SmartPricingEditor: extracted as reusable component
- seed.sql: stock_movements uses delta not quantity_change

## Blockers
- none

## Next
- Clean up uncommitted changes (category page, package.json, vercel.json)
- Phase 3 (Warm Night dark mode) or deploy

---
ctx: smart pricing + CI fixes | done: 15 | next: cleanup changes or dark mode
