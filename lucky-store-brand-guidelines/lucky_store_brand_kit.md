# Lucky Store 1947 — Brand Identity System

> Updated 2026-10-06 after comparison with the live storefront and its source files.
> Current visual reference: [luckystore1947.com](https://www.luckystore1947.com/).

## Brand idea

A familiar neighborhood grocery made easy to shop: practical, welcoming, and
clear. The storefront expresses this through warm light surfaces, Saffron
actions, dark readable text, real product photography, and compact interface
details. Keep the identity friendly and useful rather than ornate or luxury-coded.

## Logo

The active English primary logo is a single composite artwork: the LUCKY STORE
wordmark, a smiling grocery-bag mark, and 1947 on the same baseline. Use the
approved image as supplied. Do not replace the O with a saffron circle, stack
the wordmark, move the year below it, remove the bag mark, or rebuild the
lettering with live text.

- Light background: assets/logo/approved/logo-main.png
- Dark background: assets/logo/approved/logo-main-inverse.png
- Bengali, light: assets/logo/approved/logo-bangla.svg
- Bengali, dark: assets/logo/approved/logo-bangla-inverse.svg
- Favicon: assets/logo/approved/favicon.svg

The approved copies are synchronized from
../apps/customer_storefront/public/. Keep each complete mark proportional,
uncropped, and clear of nearby text. The live implementation is in
../apps/customer_storefront/app/components/ui/Logo.tsx.

## Color system

These values reflect the current storefront tokens in
../apps/customer_storefront/app/tokens.css.

| Role | Light theme | Dark theme |
|------|-------------|------------|
| Page background | #FDFBF7 | #0F0F0F |
| Surface | #FFFFFF | #121212 |
| Main text | #0B0B0D | #F5F0EB |
| Supporting text | #525252 | #B0A89E |
| Brand accent | #F0C444 | #F0C444 |
| Text on accent | #0B0B0D | #0B0B0D |
| Accent hover | #E0B434 | #D4A820 |
| Soft accent surface | #FFF8E1 | #2A2418 |
| Border | #E8E4DC | rgba(245, 240, 235, 0.12) |

Keep Saffron as the recognizable accent. Red and green are semantic interface
states, not alternate brand palettes. storefront-color-palette.svg documents
the core light-theme swatches.

## Typography

The customer storefront loads:

- Display: Bricolage Grotesque
- Interface and body: Manrope
- Prices and numeric details: Geist Mono
- Bengali: Noto Sans Bengali

The font loading is declared in
../apps/customer_storefront/app/RootLayoutDocument.tsx, with role tokens in
../apps/customer_storefront/app/tokens.css. Do not describe Geist as the
storefront's primary sans-serif. In Canva, use the exact faces when available;
never retype or alter the composite logo.

## Storefront expression

The website uses warm rounded surfaces, compact pill-shaped controls, clear
hierarchy, and simple Phosphor icons with component-specific weights. These
are implementation references, not mandatory recipes for every print or social
layout. Keep campaign art simple, legible, and within the light or dark
palette.

## Source and asset status

The approved assets under assets/logo/approved are copied from the current
storefront. Compare them with the source files after a storefront logo update.
Files under assets/logo/svg and assets/logo/canva-svg are retained historical
exports and are not approved for new work unless visually checked against the
current composite logo.

There is no brand-board image in this folder. Use the live website and the
approved logo files as visual references; do not rely on the previously broken
image link.
