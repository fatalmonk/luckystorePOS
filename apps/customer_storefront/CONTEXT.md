# Customer storefront context

## Responsibility

Owns the customer-facing catalog, cart, checkout, and storefront delivery
experience.

## Sources and boundaries

- Source: `apps/customer_storefront/`
- Runtime: Next.js App Router
- Reads customer-facing data through Supabase integrations.
- Hands administrative and point-of-sale workflows to the admin and mobile
  contexts.

## Terms and invariants

- Public shopping terms describe the Chawkbazar grocery shop, not the POS product.
- Delivery copy stays inside the published 1 km radius of the Emdad Park shop.
- Doorstep inspection before payment is the published return window. A longer window needs the owner's confirmation.

## Decisions

Context decisions belong in `apps/customer_storefront/docs/adr/`, created when
the first decision is recorded. System-wide decisions belong in `docs/adr/`.
