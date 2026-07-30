---
name: Lucky Store Customer Storefront
version: 1.0.0
---

# Lucky Store — Customer Storefront

## Product identity

- **Name:** Lucky Store 1947 — Customer Storefront
- **Tagline:** "Your friendly neighborhood grocery, now online."
- **Business:** Local grocery and household essentials delivery in Chittagong, Bangladesh.
- **Established:** 1947
- **Website:** https://luckystore1947.com
- **Primary channel:** Mobile-web PWA / responsive web storefront
- **Language:** English (primary UI), Bengali ready (Noto Sans Bengali loaded)
- **Contact:** WhatsApp +8801731944544

## Audience

- **Primary:** Urban and semi-urban households in Chittagong ordering everyday groceries.
- **Secondary:** Busy professionals, young families, and returning customers used to neighborhood kirana stores but wanting WhatsApp/chat-assisted ordering online.
- **Device:** 70%+ mobile. Mobile-web first; desktop is an upscale adaptation, not a separate experience.
- **Literacy assumption:** Mixed English/Bengali; UI copy is short, scannable, and avoids jargon.

## What the surface must prove

A first-time visitor should, within one viewport:

1. Recognize a trusted local grocery store (not a generic app).
2. See that staples they buy every week can be ordered quickly.
3. Feel the store is active, helpful, and reachable via WhatsApp if anything goes wrong.

## Core jobs

- **Browse:** Discover products by category, search, and curated campaigns.
- **Buy:** Add to cart, review, and checkout with minimal friction on mobile.
- **Trust:** See clear pricing, stock status, and delivery expectations; contact support easily.
- **Return:** Reorder, check order status, and manage a wishlist.

## Key features

- Category browsing, search, and filters
- Product detail pages with quick-view modal
- Campaign / deal surfaces (Deal of the Week, featured products)
- Cart with local-storage persistence and cart-fly animation
- WhatsApp-assisted checkout fallback
- Order status page
- Wishlist and recently viewed
- Auth via Supabase (OTP / email)
- Light/dark theme toggle

## Brand personality

- Warm, neighborly, efficient, and trustworthy.
- Celebrates the neighborhood store heritage without feeling old.
- Uses deep night and saffron as its anchor; warm paper as its default ground.
- Friendly but never gimmicky; helpful but never intrusive.

## Tone of voice

- Plain, direct, warm.
- "Add to bag" not "Add to cart" in some contexts; "Order on WhatsApp" where chat fallback matters.
- Use Bengali numerals/labels where localized.

## Visual commitments

- **Primary text / deep night:** `#0B0B0D`
- **Brand accent / saffron:** `#f0c444`
- **Paper ground (light):** `#FDFBF7`
- **Dark mode ground:** `#0B0B0D`
- Logo is an image asset (`logo-main.png`, `logo-main-inverse.png`) and must not be recreated as text.
- Banner/promo images must always be wide landscape (16:9 or 21:9); never 1:1 for wide slots.

## Constraints

- Phase 1 forbids changes to PosProvider, auth flow logic, Supabase migrations, and core business logic.
- All design work must preserve working behavior and project conventions.
- RTK wrappers are preferred for reads, builds, and diffs.

## Success metrics

- First viewport communicates trust + assortment.
- Mobile cart completion feels native-fast.
- Theme, logo, and accent remain consistent across every surface.
