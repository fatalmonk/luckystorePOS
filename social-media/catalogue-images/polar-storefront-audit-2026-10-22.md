# Polar storefront product audit

**Reviewed:** 22 October 2026
**Scope:** Public English storefront search results for “Polar” and product pages linked from those results. Read-only audit; no database, product, price, SEO, or image changes were made.
**Coverage:** 28 product listings. All 28 product URLs returned HTTP 200. Prices below are the live sale and crossed-out regular prices shown on storefront cards, not an independently verified price list.

## Executive summary

The most urgent issues are three product pages with broken main images, incorrect Strawberry Carnival metadata, and variant identities that still collapse multiple confirmed flavors into generic single listings. Page SEO is consistent at a basic level (title, description, canonical, Open Graph and Twitter tags are present), but structured product SEO is thin: all pages use `og:type=website`, none expose `Product` JSON-LD or product-specific `product:*` metadata, and the public HTML does not expose AI-SEO-specific fields. The site does render product enrichment sections on some product pages, but local enrichment coverage is incomplete and contains known identity/quantity conflicts.

## Ranked remediation

| Rank | Priority | Finding | Affected products |
|---:|---|---|---|
| 1 | Critical | Main product image is visibly broken on the product detail page. | Chocolate Cup; Double Sundae 1 Liter; Kheer 1/2 Liter |
| 2 | High | Carnival Strawberry detail title, meta description and image alt identify Vanilla, despite Strawberry route/listing and strawberry-named image. | Carnival Strawberry |
| 3 | High | Confirmed flavor variants are still represented by generic listings or stale detail metadata; product identity, SEO and image associations can point to the wrong flavor. | Chocobar, Ice Lolly, Robusto, Tornado, Essora, Premium Cup, Chocolate Cup/Mango Cup |
| 4 | High | Tub Regular listing says Vanilla 1/2 Liter while detail title/alt omit Vanilla and enrichment states net quantity 2 L. | Tub Regular Vanilla 1/2 Liter |
| 5 | High | Vanilla 1 Liter listing name conflicts with detail title and enrichment name “Polar Regular 1 Liter.” | Vanilla 1 Liter |
| 6 | Medium | Two live listings lack a matching unique local product-enrichment entry; one Vanilla Carnival entry is duplicated and no Strawberry Carnival entry exists. | Carnival Strawberry; Chocolate Cup |
| 7 | Medium | Product-specific structured SEO is missing: no Product JSON-LD/product:* tags; generic keyword list; Open Graph type is website for all pages. | All 28 |
| 8 | Medium | Product-specific Open Graph image falls back to the site social-share image. | Chocolate Cup; Double Sundae 1 Liter; Kheer 1/2 Liter |
| 9 | Medium | Multi-image gallery data is only populated for Royal Sundae among the 27 local Polar enrichment records. Product-page screenshot did not show gallery controls for Royal Sundae. | Polar listings generally |

## Per-listing audit

Prices use **sale / regular** notation in Bangladeshi taka. “Image” is based on the product image/alt and Open Graph image metadata unless marked visually checked. Only the four detail pages named in the notes were inspected visually; do not treat other images as visually verified.

| # | Storefront listing | Price ৳ | Image / identity / SEO note | Rank |
|---:|---|---:|---|---:|
| 1 | Polar Carnival Butterscotch | 33 / 35 | Flavor-specific title and image alt; OG image `IC-POL-CAR-2.webp`. | 3 |
| 2 | Polar Carnival Hazelnut | 75 / 80 | Title identifies Polar Hazelnut; OG image `IC-POL-HAZ.webp`; alt is less specific than the listing. | 3 |
| 3 | Polar Carnival Strawberry | 56 / 60 | **Wrong metadata:** page title, description and image alt all say Carnival Vanilla; OG image filename says strawberry (`cone-carnvial-strawberry.webp`, filename typo). | 2 |
| 4 | Polar Carnival Vanilla | 56 / 60 | Flavor-specific; OG image `IC-POL-CAV.webp`. | 3 |
| 5 | Polar Chocobar | 32 / 35 | Listing is generic; detail title/description identify Vanilla Chocobar. Confirmed identity work calls for separate Vanilla Chocobar and Chocolate Choco Bar products; only one generic result is live. | 3 |
| 6 | Polar Chocodelight | 65 / 70 | Product-specific image `IC-POL-CHO-2.webp`; no critical metadata issue found in sampled fields. | 5 |
| 7 | Polar Chocolate Cup | 27 / 30 | **Visually broken main image.** Detail title is Chocolate Cup; OG uses generic site fallback `lucky-store-social-share.jpg`; no matching local enrichment entry. | 1 |
| 8 | Polar Coffee 1L | 380 / 400 | Product-specific OG image `IC-POL-COF.webp`; no critical metadata issue found in sampled fields. | 5 |
| 9 | Polar Crunchy | 45 / 50 | Product-specific OG image `IC-POL-CRU.webp`; no critical metadata issue found in sampled fields. | 5 |
| 10 | Polar Doi 1 Liter | 380 / 400 | Product-specific OG image `IC-POL-D1L.webp`; no critical metadata issue found in sampled fields. | 5 |
| 11 | Polar Double Sundae 1 Liter | 330 / 350 | **Visually broken main image.** Detail H1 is “Polar Double Sundae Ice Cream 1L Tub”; OG uses generic site fallback. | 1 |
| 12 | Polar Essora | 75 / 80 | Generic listing/image; confirmed Banana and Mixed Berry variants are not split on the storefront. OG image `IC-POL-ESS.webp`. | 3 |
| 13 | Polar Ice Lolly | 18 / 20 | Generic listing; title/description identify Lemon, while confirmed Lemon and Orange variants are not split. OG image `IC-POL-ICE.webp`. | 3 |
| 14 | Polar Kheer 1 Liter | 380 / 400 | Product-specific OG image `IC-POL-K1L-2.webp`; no critical issue found in sampled fields. | 5 |
| 15 | Polar Kheer 1/2 Liter | 190 / 200 | **Visually broken main image.** Detail H1 says Kheer Ice Cream Tub 500ml; OG uses generic site fallback. | 1 |
| 16 | Polar Malai | 18 / 20 | Product-specific OG image beginning `IC-POL-MAL-`; no critical issue found in sampled fields. | 5 |
| 17 | Polar Mango 1L | 285 / 300 | Product-specific OG image `IC-POL-MAN-2.webp`; no critical issue found in sampled fields. | 5 |
| 18 | Polar Mango Cup | 27 / 30 | Card says Mango Cup, but page title/description and enrichment still identify Mango/Chocolate Cup. Product-specific OG image `IC-POL-MAN.webp`; stale naming risks ambiguity with Chocolate Cup. | 3 |
| 19 | Polar Premium Cup | 65 / 70 | Generic page title/description; OG image `IC-POL-CHO-CUP.webp` implies chocolate. Confirmed exact identity is Polar Chocolate Premium Cup, but storefront name is not yet aligned. | 3 |
| 20 | Polar Red Velvet 1L | 580 / 600 | Product-specific OG image `IC-POL-RV1.webp`; no critical issue found in sampled fields. | 5 |
| 21 | Polar Robusto | 115 / 120 | Generic listing; detail metadata identifies Salted Caramel, while confirmed identity requires Salted Caramel, Chocolate and Vanilla variants. OG image `IC-POL-ROB.webp`. | 3 |
| 22 | Polar Royal Sundae | 46 / 50 | Product image visually checked and appears correct (two cups shown). Product route screenshot showed no visible carousel controls. Registry contains four gallery image entries (front, ingredients, nutrition, barcode), but only composite/front image was apparent in the screenshot. OG image `IC-POL-ROY-front.webp`. | 4 |
| 23 | Polar Shell N Core | 28 / 30 | Product-specific OG image `IC-POL-SNC.webp`; no critical issue found in sampled fields. | 5 |
| 24 | Polar Shor Malai | 28 / 30 | Product-specific OG image `IC-POL-SHO.webp`; no critical issue found in sampled fields. | 5 |
| 25 | Polar Tornado | 38 / 40 | Generic card, while detail metadata identifies Strawberry (55ml). Confirmed product set requires Green Apple, Mango and Strawberry variants; only one result is live. OG image `IC-POL-TOR.webp`. | 3 |
| 26 | Polar Tub Regular Vanilla 1/2 Liter | 140 / 150 | Page image alt/title omit Vanilla; enrichment claims net quantity 2 L, contradicting 1/2 Liter. OG image `IC-POL-VAN-500.png`. Confirmed 1/2 L Vanilla identity; flavor siblings are not represented. | 3 |
| 27 | Polar Vanilla 1 Liter | 285 / 300 | Card says Vanilla, but detail title/H1 and enrichment say “Polar Regular 1 Liter.” OG image `IC-POL-VA1.webp`. Confirmed name is “Polar Vanilla 1 Liter.” | 3 |
| 28 | Polar Zafran Malai 1 Liter | 380 / 400 | Product-specific OG image `IC-POL-ZM1.webp`; no critical issue found in sampled fields. | 5 |

## SEO and enrichment coverage

- All 28 product URLs returned HTTP 200 and contained title, meta description, canonical, Open Graph title/description/URL/site name/locale/image/alt/type, Twitter card/title/description/image, and the same generic site keywords.
- Canonical and `og:url` use `https://www.luckystore1947.com/...`, while the audited entry origin was `https://luckystore1947.com`. Whether this is intentional canonicalization or accompanied by a redirect was not checked.
- All pages use `og:type=website`; none exposed product-specific `product:*` tags or Product JSON-LD in the audited HTML. Store, GroceryStore and Organization JSON-LD were present.
- The keywords list is site-wide (“online grocery chattogram…”) rather than flavor/product-specific.
- No public AI-SEO-specific fields/markers were found. This is limited to rendered public HTML; it does not establish whether internal admin/database AI SEO fields exist.
- Local storefront enrichment registry has 27 Polar records but 26 unique exact names. “Polar Carnival Vanilla Cone Ice Cream 120ml” is duplicated; no Carnival Strawberry or standalone Chocolate Cup enrichment match was found.
- Only Royal Sundae has a `galleryImages` array among those Polar records. Its four records describe front, ingredients, nutrition and barcode images. The live screenshot showed no visible carousel UI.
- Enrichment content is generally structured with name, brand, net quantity, specifications, highlights, FAQs and evidence references; naming and quantity conflicts listed above should be corrected when remediation is authorized.

## Verification limits

- Live storefront cards and detail pages were used for public names, displayed prices, page content, and visual image checks. Prices were not checked against an authoritative source.
- Visual inspection confirmed a good Royal Sundae image and broken images on Chocolate Cup, Double Sundae and Kheer 1/2 Liter. The other product images were checked through page metadata/image references only, not individually opened at full size.
- This audit does not change product records, images, SEO, prices or inventory. It does not verify private admin-only AI SEO fields or internal database state.
