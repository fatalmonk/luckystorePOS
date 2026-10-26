[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Curated gallery packshot precedence fixed in GridProductCard, DealOfTheWeek, and Category/Brand shells
Done: PR #518/#543/#545/#546/#547 merged; AMA image updated; CodeQL fixed; worktrees/branches pruned; Deal of Week renewed (26 Oct - 1 Nov 2026); Supabase migration 20261026000000 synced; Polar routes reconciled (36/36 HTTP 200, 308 redirects); Polar page-level SEO & manufacturer enrichment applied (36/36 enriched); Polar Vanilla 1/2L image assignment verified; live canonical host-chain verified (301 1-hop apex->www, www 200); live crawler endpoints verified (status 200); markdown negotiation verified; live AI discovery citations documented; sample product SEO verified; all 25 Polar packshots uploaded to Cloudflare R2 bucket `lucky-store-images` (25/25 verified HTTP 200 on `https://images.luckystore1947.com/products/polar/`); `productGalleryRegistry.ts` migrated to R2; git repository stripped of binary image assets; `.gitignore` updated; GridProductCard image precedence inverted to prioritize curated transparent R2 packshots over uncurated catalog image_url; 622 tests pass
Branch: fix/curated-gallery-image-precedence
PR: #548 (https://github.com/fatalmonk/luckystorePOS/pull/548)
Health: 100% test pass rate (622/622 tests in customer_storefront); typecheck clean; remote DB green
Last Synced: 2026-10-26
ctx: PR #548 opened | done: 25 Polar R2 packshots, GridProductCard gallery override, 622 tests pass | next: await PR review and merge


