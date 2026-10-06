# Lucky Store 1947 — Storefront Brand Reference

> Reviewed 2026-10-06 against [the live storefront](https://www.luckystore1947.com/)
> and its checked-in implementation.

This document records the live customer storefront's identity. For the
complete brand and social handoff, see lucky_store_brand_kit.md and README.md.

## Active logo assets

The English logo component selects logo-main.png for the light theme and
logo-main-inverse.png for the dark theme. The Bengali interface selects
logo-bangla.svg or logo-bangla-inverse.svg. The website's English logo is a
composite wordmark, smiling grocery-bag mark, and 1947 lockup; it is not a
text-only stacked logo with a saffron dot replacing the O.

The synchronized handoff copies are in assets/logo/approved/. Source files:
../apps/customer_storefront/app/components/ui/Logo.tsx and
../apps/customer_storefront/public/.

## Color tokens

Source: ../apps/customer_storefront/app/tokens.css.

| Token | Light theme | Dark theme |
|-------|-------------|------------|
| Page background | #FDFBF7 | #0F0F0F |
| Surface | #FFFFFF | #121212 |
| Main text | #0B0B0D | #F5F0EB |
| Supporting text | #525252 | #B0A89E |
| Accent | #F0C444 | #F0C444 |
| Accent text | #0B0B0D | #0B0B0D |
| Accent hover | #E0B434 | #D4A820 |
| Accent muted | #FFF8E1 | #2A2418 |
| Border | #E8E4DC | rgba(245, 240, 235, 0.12) |

## Type and icon tokens

RootLayoutDocument.tsx loads Bricolage Grotesque, Manrope, Geist Mono, and
Noto Sans Bengali. tokens.css assigns Bricolage Grotesque to display, Manrope
to interface/body, and Geist Mono to numeric details. Do not document Geist
as the primary sans-serif.

Phosphor web icons are used in the application with weights selected by
component. There is no single global icon weight requirement.

## Components versus brand rules

Rounded surfaces, compact pill controls, side navigation, product cards, and
the hero layout are current interface patterns. Treat these as storefront
implementation details; adapt them only when a campaign or print application
benefits from them. Do not describe every card as a mandatory “Double-Bezel”
or the navigation as a universal “Fluid Island” brand element.
