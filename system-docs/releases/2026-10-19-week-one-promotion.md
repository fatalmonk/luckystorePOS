# Week-one online promotion release review

This record requests approval to apply the already-merged migration
[`20261015100000_add_week_one_online_item_promotion.sql`](../../supabase/migrations/20261015100000_add_week_one_online_item_promotion.sql)
to the Lucky Store production Supabase project. The migration is **not applied**
by merging this PR. Its SHA-256 is
`6de2e23580aa1b4d7c8831115029be9b48146d67df31c68dd47c10c25852819d`.
Recheck that hash before application; a changed file needs a new review.

The migration creates the tenant-scoped promotion table, installs 12 reviewed
product offers, and updates the guest checkout core to calculate an extra 5%
from each product's current selling price. Its offer window is 19 October 2026
00:00 through 26 October 2026 00:00, Asia/Dhaka. The offer is online-checkout
only. A product does not receive the extra discount when its name, selling
price, MRP, stock eligibility, or offer window no longer matches the reviewed
record. The promotion is separate from the existing MRP reduction.

## Reviewed product prices

These are the prices in the migration and the matching production catalogue
snapshot checked on 16 October 2026. The planned checkout price is the current
selling price less 5%, rounded to two decimals. It applies only during the
offer window while the product remains eligible; stock and prices must be
rechecked before release.

| Product | Selling price | Planned online checkout price |
| --- | ---: | ---: |
| Awei Data Cable Micro USB (CL-115M) | ৳150.00 | ৳142.50 |
| Buldak Ramen Cheese Cup | ৳150.00 | ৳142.50 |
| Buldak Ramen Noodles 2x Spicy Cup | ৳150.00 | ৳142.50 |
| Buldak Ramen Original Cup | ৳150.00 | ৳142.50 |
| Avonee Pant Style Baby Diaper (9-14 kg) - L 48 pcs | ৳1,000.00 | ৳950.00 |
| Dove Conditioner Intensive Repair 50 ml | ৳19.00 | ৳18.05 |
| Buldak Ramen 2x Spicy | ৳160.00 | ৳152.00 |
| Buldak Ramen 3x Spicy | ৳160.00 | ৳152.00 |
| Buldak Ramen Cream Carbonara | ৳160.00 | ৳152.00 |
| Buldak Ramen Original | ৳160.00 | ৳152.00 |
| Buldak Ramen Quattro Cheese | ৳160.00 | ৳152.00 |
| Buldak Ramen Rose | ৳160.00 | ৳152.00 |

## Evidence captured 16 October 2026

- Production project `hvmyxyccfnkrbxqbhlnm` had no
  `public.storefront_item_promotions` table and no migration-history entry for
  `20261015100000` at the time of review.
- All 12 listed product IDs were active. Their names, prices, and MRPs matched
  the migration, and each had positive sellable stock. The lowest observed
  sellable stock was one unit; recheck immediately before application.
- On disposable project `grxxenvdhfwzafzyykgo`, the promotion-aware checkout
  function was installed against its existing test promotion table. Rollback-only
  SQL checks passed for the 5% price, idempotent replay, incorrect submitted
  total, price drift, expired offer, wrong tenant, and exhausted stock. A
  post-test query confirmed no test promotion or order persisted. This tested
  the checkout function, **not** the full production migration against a fresh
  database. The test fixture used a disposable catalogue item, not a production
  product.

## Release checks

1. Require mac (`fatalmonk`) to leave an explicit approval comment in this PR's
   Conversation tab naming the final PR HEAD commit and the migration hash above.
   GitHub does not allow a PR author to submit a formal approval review on their
   own PR. A new commit after mac's comment requires a new approval comment.
2. Recheck the migration hash, production project ID, migration history, and
   table absence. Stop if the schema or history has changed unexpectedly.
3. Recheck all 12 catalogue IDs against the stored names, prices, MRPs, active
   status, and positive sellable stock. If fewer than 12 qualify, use the
   unranked deals fallback and do not publish the editorial shortlist.
4. Verify the live Hostinger storefront is running the compatible checkout and
   weekly-deals code before the offer starts. A GitHub merge does not deploy it.
5. Confirm required checkout and tenant-isolation checks pass. A verified
   checkout or security failure blocks release until fixed and reapproved.
6. Apply the reviewed migration before Monday 19 October 00:00 Asia/Dhaka,
   then verify the migration record, 12 promotion rows, RLS policy, checkout
   function, and the public page. Avoid creating a production test order.

Mac's explicit owner comment on this PR authorizes the reviewed production
migration after these checks pass. Merging the PR or leaving a generic comment
does not substitute for that authorization. It does not authorize applying a
changed SQL file or bypassing a verified checkout or security failure.
