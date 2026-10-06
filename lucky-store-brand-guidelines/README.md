# Lucky Store 1947 — Brand & Social Marketing Kit

> Reviewed 2026-10-06 against the live customer storefront and its source assets.
> Treat this folder as handoff guidance. The storefront and current owner-approved
> campaign details remain the source of truth.

## Brand system

Lucky Store's current storefront uses a warm, practical neighborhood-grocery
look: Warm Bone surfaces, Saffron actions, Deep Night text, rounded product
surfaces, and simple line icons. Keep compositions calm and product-led. Use
the website's approved composite logo artwork; do not reconstruct its letters
or replace the friendly grocery-bag mark.

## Approved logo files

These copies are synchronized from the active customer storefront:

| Use | File in this kit | Current storefront source |
|-----|------------------|--------------------------|
| English logo, light background | assets/logo/approved/logo-main.png | apps/customer_storefront/public/logo-main.png |
| English logo, dark background | assets/logo/approved/logo-main-inverse.png | apps/customer_storefront/public/logo-main-inverse.png |
| Bengali logo, light background | assets/logo/approved/logo-bangla.svg | apps/customer_storefront/public/logo-bangla.svg |
| Bengali logo, dark background | assets/logo/approved/logo-bangla-inverse.svg | apps/customer_storefront/public/logo-bangla-inverse.svg |
| Favicon | assets/logo/approved/favicon.svg | apps/customer_storefront/public/favicon.svg |

The English artwork is a composite wordmark, grocery-bag mark, and 1947 lockup.
Keep it intact: preserve proportions and clear space, do not crop, redraw,
ungroup, replace the O with a dot, or move the year. The files in
assets/logo/svg and assets/logo/canva-svg are historical exports; do not use
them as approved artwork unless they are checked against the files above.

There are no tested minimum-size measurements in this kit. Scale the complete
logo proportionally and check that the wordmark, mark, and year stay legible.

## Storefront colors

Use the light and dark values from
apps/customer_storefront/app/tokens.css:

| Role | Light theme | Dark theme |
|------|-------------|------------|
| Page background | Warm Bone #FDFBF7 | #0F0F0F |
| Surface | White #FFFFFF | #121212 |
| Main text | Deep Night #0B0B0D | #F5F0EB |
| Supporting text | Muted #525252 | #B0A89E |
| Main accent | Saffron #F0C444 | Saffron #F0C444 |
| Accent text | Deep Night #0B0B0D | Deep Night #0B0B0D |
| Accent hover | #E0B434 | #D4A820 |
| Soft accent surface | #FFF8E1 | #2A2418 |
| Border | #E8E4DC | rgba(245, 240, 235, 0.12) |

Use red and green only for their semantic states, not as replacement brand
colors. The storefront palette reference at storefront-color-palette.svg shows
the core light-theme colors.

## Typography and icons

The live storefront loads Bricolage Grotesque for display, Manrope for
interface and body text, Geist Mono for numeric and code-like details, and
Noto Sans Bengali for Bengali text. See
apps/customer_storefront/app/RootLayoutDocument.tsx and
apps/customer_storefront/app/tokens.css.

The bundled fonts/ directory is not a complete current storefront font
package: it contains Geist sans files, not Bricolage Grotesque, Manrope,
Geist Mono, or Noto Sans Bengali. Do not treat it as proof that Geist is the
primary storefront font or redistribute fonts outside their license terms.

For Canva, use these faces if available. Do not substitute Plus Jakarta Sans,
Outfit, or Space Mono as though they were the live storefront fonts. If an
exact face is unavailable, use a Canva-rendered export of the approved logo
and keep other text simple; do not retype the logo.

The site uses Phosphor web icons with component-specific weights. Prefer
simple, consistent line icons and avoid mixing unrelated filled icon styles.

## Claims and copy

The live homepage displayed these service points when this kit was reviewed:
delivery within 1 km of Chawkbazar, free delivery on orders of ৳500+, and
payment after doorstep inspection through Cash on Delivery or bKash. It also
states that Lucky Store has served Chattogram since 1947. Verify all prices,
availability, delivery terms, hours, and promotions on the current storefront
before each campaign; these details can change.

Use placeholders for any unverified detail:

- Product: [exact current storefront listing]
- Price and availability: [check the current listing]
- Offer, dates, exclusions, and terms: [confirm with the owner and storefront]
- Delivery wording: [use the current delivery page]
- Customer quote: [use only with documented permission and exact source]

Do not publish invented testimonials, customer names or locations, farmer or
supplier claims, same-day promises, price examples, limited-stock statements,
or discount terms as facts. The older Rafiq/Dhanmondi testimonial and the
older same-day/farmer copy have been removed from this guide.

### Safe copy starters

Restock:
“Today's pick: [product name], [current price]. Check availability and order
from Lucky Store.”

Delivery:
“Lucky Store delivers within 1 km of Chawkbazar. Free delivery on ৳500+
orders. Please confirm current terms on the delivery page.”

Promotion:
“[Verified offer] on [eligible products], [start date]–[end date].
[Conditions and exclusions]. Check the current listing before ordering.”

These are drafts. Confirm each bracketed field and current service details
before publishing.

## Social formats and photography

Common starting canvases: Instagram feed 1080 × 1350 or 1080 × 1080;
stories/status 1080 × 1920; Facebook cover 820 × 312. Check each platform's
current safe areas before export.

Use warm, natural, tactile product photography with uncluttered backgrounds.
Keep the palette restrained, leave space for editable copy, and add final text
in Canva rather than baking it into generated imagery. Show the actual product
and packaging; do not combine unrelated brand marks or invent product labels.

The former ice-cream campaign images are archived at
social-media-post/archive/unapproved-ice-cream-campaign.png and
social-media-post/archive/unapproved-ice-cream-campaign-alternate.png. They
are not approved templates because their palette, logo treatment, offer copy,
and generated package text do not match this system. The other social images
are working drafts; verify product details, claims, and logo use before
publishing.

## Seasonal planning

The calendar and seasonal ideas in this folder are prompts for planning, not
confirmed campaign dates or offers. Check local dates and current product
availability each year before scheduling.

## Contact and listing references

The storefront currently displays hello@luckystore1947.com and
+880 1731 944544. Use the contact page as the current public reference.
Business Profile identifiers, hours, addresses, social handles, and internal
team contacts elsewhere in this folder have not been revalidated in this
review; confirm them against the live source before use.
