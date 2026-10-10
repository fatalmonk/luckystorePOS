[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Resized and optimized social preview assets to exact 1200x630 (twitter-image.png, opengraph-image.png, lucky-store-social-share-v2.png, lucky-store-social-share.jpg)
Done: Scaled master social card to 1200x630, compressed via sharp libimagequant palette (302KB, -77%), generated 1200x630 JPEG fallback (174KB), optimized square card 1024x1024 (406KB), 380/380 vitest pass
Branch: codex/redesign-homepage
Health: 380 vitest tests pass, exact 1200x630 dimensions verified via sips, zero visual degradation
Last Synced: 2026-10-11
ctx: Social preview asset optimization | done: twitter-image.png, opengraph-image.png, lucky-store-social-share-v2.png, lucky-store-social-share.jpg, opengraph-image-square.png | next: Ready for user instructions
