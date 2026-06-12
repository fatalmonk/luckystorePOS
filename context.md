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
- Relocated brand assets to lucky-store-brand-guidelines/
- Relaxed Node engine constraint in customer_storefront to fix EBADENGINE warnings
- Created .env.local in admin_web with Supabase env vars
- Applied Design System v2 colors (customized accent to storefront yellow #FFF34D with black text), typography, borders, and shadows to admin_web, design-system-preview index.html, and Inventory List Table/Product Card components via tokens.css mappings, and fixed product card layout clipping and image cropping in the inventory grid by adjusting image size, row height limits, and changing to object-contain with padding
- Added cost price, profit margin (percentage and absolute value), clearer stock quantity representation, and date of last purchase fields to the product card, enabling inline editing for both cost and price
- Configured page-level container scrolling on the inventory page so header/analytics scroll up out of view naturally while categories/filters remain sticky at the top, and fixed double scrollbars by relying on the main layout scrollable container and dynamically measuring toolbar height via ResizeObserver to set exact sticky offsets for table headers

- Redesigned table view columns to separately show and allow inline edits for Cost Price, MRP, Selling Price, and Last Purchase Date, along with a dedicated Profit Margin column. Resolved row overlapping and table header misalignment during scrolls by removing `overflow-x: auto` from `.table-wrap` (changed to `overflow-x: visible` to allow vertical sticky positioning of children relative to the outer `.main-content` scroll container) and removing duplicate `sticky top-0` positioning from `thead` in `InventoryListTable.tsx`. Prevented scrolled rows from leaking into the top padding gap above the sticky toolbar by dynamically toggling `inventory-page-scroll` class on `.main-content` (setting its top padding to 0) and adding `pt-6` on `.inventory-container`. Guaranteed solid background opacity for sticky headers by adding `bg-warm-bg` directly to all `th` elements and changing `background` to `background-color` in `index.css`.





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
