# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Households and individual shoppers in Chattogram who want to browse everyday groceries and home essentials online.
- The storefront supports English and Bengali and is designed for mobile web as well as desktop.

## Product Purpose

Lucky Store's storefront helps customers discover grocery and household products, review product details, build a cart, place orders, and manage follow-up tasks such as wishlists and order status. Success means customers can find what they need and understand the next step in ordering or getting help.

## Positioning

Lucky Store is a Chawkbazar neighborhood grocery brought online. The storefront combines the store's grocery catalog with online browsing and ordering flows. Describe store-based fulfillment, delivery coverage, fees, hours, payment options, stock, and prices only when current project or operational sources verify them.

## Operating Context

- Customers browse by category, search or filter the catalog, review product pages, manage a cart, and proceed through checkout.
- The storefront is bilingual (English and Bengali) and must preserve localized labels and routes.
- Customers may use account, wishlist, order-status, and support paths when available.

## Capabilities and Constraints

- The storefront supports category browsing, search and filters, product pages with an in-place quick preview, cart and checkout, order status, order repurchase at current catalog prices, wishlist, recently viewed products, optional Supabase sign-in for account features, and light/dark themes. Checkout is available to guests without signing in.
- The responsive home experience includes campaign and deal surfaces, curated product discovery, mobile navigation, a product grid, and pull-to-refresh on supported touch devices. Shared cart feedback can show the current cart summary and delivery-threshold progress.
- Preserve localized routes and copy in English and Bengali, accessible keyboard and touch interaction, current stock validation, and the established storefront design system.
- Customer-facing product, price, and availability data must come from the current catalog. Re-purchasing an order uses current catalog prices and stock; unavailable or unverified items must not be added.
- This record covers `apps/customer_storefront` only. Its UI uses the `warm-*` tokens mapped in `tailwind.config.js` and `app/tokens.css`; do not assume `admin_web` token classes apply here. Keep palette, typography, and component specifications in `DESIGN.md`.
- Operational details such as delivery area, charges, schedules, payment availability, stock, and prices can change; verify the appropriate current source before presenting them as facts.
- Do not use model-generated or OCR-derived product details to authorize catalog, inventory, or financial changes.

## Brand Commitments

- Use the Lucky Store 1947 name and the established neighborhood-grocery identity.
- Keep customer-facing language plain, direct, warm, and easy to scan; localize content naturally in Bengali.
- Use the supplied logo assets rather than recreating the logo as text.

## Evidence on Hand

- The storefront implementation and customer-facing flows are in this app, including `app/components/HomeShell.tsx`, `app/components/CampaignGrid.tsx`, and the category, product, cart, and checkout routes.
- `app/lib/deliveryData.ts` is the project source for delivery policy copy and structured data; recheck it when using operational delivery details.
- Do not invent customer testimonials, adoption statistics, independent product claims, or current availability.

## Product Principles

1. Help customers find everyday items with direct browse and search paths.
2. Keep product, price, and availability information grounded in current sources.
3. Make the next ordering or support step clear in both supported languages.
4. Keep local service claims specific and verifiable.
