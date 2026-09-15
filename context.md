<!-- markdownlint-disable MD041 -->
[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Phase 4A Product Page SEO & Content Enrichment (Pilot Completed & Tested)
Done: Phase 0 complete; Phase 1 deployed; Phase 2 deployed; Phase 3 deployed; Phase 4 deployed (PR #362); Phase 4A pilot complete: brand parser expanded for GSC brands (Fortune, Aril, Bellame, Ama), ProductJsonLd brand fallback fixed (omits brand instead of defaulting to 'Lucky Store') with shippingDetails & hasMerchantReturnPolicy (doorstep inspection), productMetadata title (<=60 chars) & description (120-160 chars) adhering to policy (1 km, ৳500+ free, COD, inspection), productEnrichment registry with verified pilot records for 7 GSC-demonstrated items, ProductClient enhanced with overview, specifications table, highlights, kitchen guidance, direct delivery card, and product FAQs, TrustStrip linked to /delivery, 243/243 vitest tests passing (+15 in product-enrichment-contract), tsc clean, production build clean
Branch: main
Health: 243/243 vitest tests passing, 0 tsc errors, next build clean (31/31 static pages)
Last Synced: 2026-09-08
ctx: Phase 4A Product Page Enrichment | done: BrandParser, ProductJsonLd brand & shipping & return fixes, productMetadata formatters, productEnrichment registry, ProductClient & TrustStrip UI enhancements, product-enrichment-contract test suite, phase-4a-execution-tracker | next: Phase 4B (Bengali Storefront Track /bn Dual-Surface SEO)
