# Lucky Store 1947 — Social Media & Marketing Kit
> **Handoff Date:** June 2026
> **Prepared for:** Social Media Marketing Team
> **Brand System:** v2.0 — Premium Sans-Serif Edition
> **Files Location:** `brand/assets/`

---

## 📦 What's Inside This Kit

| Folder | Contents | For |
|--------|----------|-----|
| `brand/assets/logo/svg/` | Primary wordmark, mark-only, inverse logos | Web, print, apps, signage |
| `brand/assets/logo/pngs/` | Raster exports @1x, @2x, @3x | Social avatars, Instagram, Facebook |
| `brand/assets/templates/` | Canva/Figma-ready templates | Stories, feed posts, flyers |
| `brand/assets/fonts/` | Geist + Geist Mono | All digital touchpoints |
| `docs/BRAND_GUIDELINES.md` | Full brand bible | Reference |
| `docs/DESIGN_SYSTEM.md` | Code tokens, Tailwind colors | Dev team |

---

## 🎨 Logo System — v2.0 (Approved Direction)

### ⭐ Primary Logo — Bold Stacked Wordmark (Panel 1)

> **This is the official primary logo.** Bold, stacked, all-caps `LUCKY STORE` wordmark in Geist Black (`#1A1A1A`). The `O` in STORE is replaced by a solid Brand Yellow circle (`#F5C518`). Founding year `1947` set beneath in Geist Mono Warm Grey (`#6B6B6B`).
> **Why it works:** Maximum legibility at any size. Zero decorative noise. Conveys neighborhood trust and premium clarity in a single glance.

### Files

| File | Use Case | Spec |
|------|----------|------|
| `lucky-store-primary.svg` | Website header, signage, print | Full wordmark + year |
| `lucky-store-mark.svg` | App icon, favicon, social avatar | Yellow dot + `LS` initials |
| `lucky-store-inverse.svg` | Dark backgrounds, Brand Yellow surfaces | White wordmark |
| `lucky-store-primary@2x.png` | Website retina, Instagram | 400×480px |
| `lucky-store-mark@2x.png` | App store icon, social avatar | 400×400px |
| `lucky-store-mark@3x.png` | iOS app icon, splash screen | 600×600px |
| `lucky-store-inverse@2x.png` | Instagram story overlays, dark posts | 400×480px |

### Clear Space Rule
> Maintain clear space = cap height of the `L` on all four sides. Never crowd the wordmark.

```
        ←—— L ——→
      ┌──────────┐
   ↑  │  LUCKY   │  ↑
   L  │  STORE   │  L
   ↓  └──────────┘  ↓
        ←—— L ——→
```

### Minimum Sizes

| Use | Min Width |
|-----|-----------|
| Website header | 120px |
| Instagram avatar | 400×400px (rendered at 150×150) |
| App icon | 48dp (Android) / 60pt (iOS) |
| Receipt header | 15mm |
| Delivery bag | 20mm |
| Flyer | 30mm |

### Logo Color Rules

| Element | Light BG | Dark / Saffron BG |
|---------|----------|-----------------|
| Wordmark `LUCKY STORE` | `#0B0B0D` Deep Night | `#FFFFFF` White |
| Saffron Dot | `#f0c444` | `#f0c444` |
| Year `1947` (mono) | `#6B6B6B` Warm Grey | `#FFFFFF` White |

### ❌ Never Do
- Stretch, rotate, or warp the wordmark
- Replace the Brand Yellow dot with any other color
- Use Inter, Roboto, Arial, or any non-Geist typeface in brand materials
- Add drop shadows, outlines, or glows not in the approved files
- Place on busy photos without a clear background safe zone
- Recreate from memory — always use approved SVG files

---

## 🎨 Color Palette (v2.1 — Deep Night & Saffron)

Use these exact hex values in all design tools.

| Name | Hex | Role | Usage |
|------|-----|------|-------|
| Warm Bone | `#FDFBF7` | Canvas / Background | Main body background; feels like premium paper |
| White Surface | `#FFFFFF` | Primary Surface | Clean product cards and UI panels |
| **Saffron** | **`#f0c444`** | **Primary Accent** | **CTAs, badges, active states, brand dot** |
| Yellow Muted | `#FFF8E1` | Accent Background | Soft yellow tints, tags, chip backgrounds |
| Yellow Dark | `#C79400` | Accent Pressed | High-contrast text on yellow, hover states |
| Deep Night | `#0B0B0D` | Text Primary | Headlines, body, high-contrast containers |
| Warm Grey | `#6B6B6B` | Text Secondary | Supporting text, secondary actions, metadata |
| Warm Border | `#E8E4DC` | Structural Border | Thin dividers, outer bezel lines |
| Error Red | `#E34234` | Danger | Out-of-stock, system alerts |
| Success Green | `#16A34A` | Success | Confirmed, in-stock, delivery states |

> ⚠️ **Deprecated:** `#F5C518`, `#1A1A1A`, `#E8B84B`, `#D4941A`, `#0F172A`, `#F8FAFC`, `#15803D` and all Slate/Teal tokens are **removed** as of v2.1.

---

## ✍️ Typography

All brand communications use **Geist** (sans-serif) and **Geist Mono** (monospace) exclusively.

| Role | Font | Weight | Size | Tracking | Line-Height |
|------|------|--------|------|----------|-------------|
| Display / Hero | Geist | 800 | `clamp(3rem, 8vw, 6rem)` | `-0.03em` | `0.95` |
| Section Heading (H1) | Geist | 700 | `clamp(2rem, 5vw, 3.5rem)` | `-0.02em` | `1.1` |
| Card Title (H2) | Geist | 600 | `1.25rem` | `-0.01em` | `1.3` |
| Body Copy | Geist | 400 | `1rem` | `0` | `1.6` |
| Price / Code | Geist Mono | 500 | `1.125rem` | `+0.02em` | `1.2` |
| Tags / Badges | Geist | 500 | `0.75rem` | `+0.05em` | `1.4` |
| Bengali Fallback | Noto Sans Bengali | 400–700 | Matching | `0` | `1.6` |

> **Banned:** Inter, Roboto, Arial, Open Sans, Helvetica — do NOT use in any brand asset.

---

## 🖼️ Iconography

| Attribute | Spec |
|-----------|------|
| Style | Ultra-lightweight line icons — minimal stroke weight |
| Library | `@phosphor-icons/web` (Light variant) or equivalent thin-line set |
| Core Set | Shopping bag, egg carton, jar, loaf, delivery bag, grocery basket, storefront |
| Color | Charcoal `#1A1A1A` on light BG; White `#FFFFFF` on dark/yellow BG |
| Avoid | Thick-stroked Lucide, FontAwesome solid fill, Material Icons filled |

---

## 📐 Social Media Templates

### Instagram Feed Post (1:1 or 4:5)

**Layout:**
```
┌─────────────────────────┐
│  [Warm lifestyle photo   │
│   on bone/cream surface] │
│                          │
│  ──────────────────────  │
│  "ভোরের তাজা সবজি"        │
│  "Morning-fresh produce" │
│                          │
│  💰 ৳25/kg    🛵 Same Day │
│                          │
│  ┌───────────────────┐   │
│  │  Order Now  ↗     │   │  ← Brand Yellow pill
│  └───────────────────┘   │
│       luckystore1947.com   │
└─────────────────────────┘
```

**Specs:**
- Canvas: `1080×1350px` (4:5) or `1080×1080px` (1:1)
- Photo area: Top 65%, warm natural light
- Background: Warm Bone `#FDFBF7`
- Price CTA pill: Brand Yellow `#F5C518`, text Charcoal `#1A1A1A`
- Font: **Geist Bold** (English), **Noto Sans Bengali Bold** (Bangla)

### Instagram Story (9:16)

**Layout:**
```
┌────────────────┐
│ 🍅 Fresh Tomatoes│  ← Top badge, Geist bold white
│    ৳45/kg      │
│                │
│  [Full bleed   │
│   warm photo]  │
│                │
│  ┌──────────┐  │
│  │  Order ↗ │  │  ← Brand Yellow pill, bottom
│  └──────────┘  │
└────────────────┘
```

**Specs:**
- Canvas: `1080×1920px`
- Full-bleed photo with warm tones
- Badge: Geist Bold, white, `rgba(26, 26, 26, 0.5)` backdrop
- CTA pill: `#F5C518`, text `#1A1A1A`, `border-radius: 9999px`

### Facebook Cover (16:9)

- Canvas: `820×312px`
- Left third: Wordmark + tagline on Warm Bone `#FDFBF7`
- Right two-thirds: Seasonal hero photo (warm, natural light)
- Overlay gradient: left-to-right `#FDFBF7` → transparent
- Update seasonally per campaign calendar

### WhatsApp Status (9:16)

- Same template as Instagram Story
- Frequency: 2–3/day (morning, noon, evening)
- Content: Daily arrivals, restocks, behind-the-scenes
- CTA: "Reply to order" or "Tap link in bio"

---

## 📝 Caption Library (Copy-Paste Ready)

### Restock Alert

> **Bangla-first, code-switched:**
```
🥬 এই সপ্তাহের তাজা —

পালং শাক • ৳২৫/আটি
বরবটি • ৳৩৫/কেজি
লাল শাক • ৳২০/আটি

সরাসরি আমাদের কৃষকের ঘর থেকে।
Straight from our farmers.

অর্ডার করতে রিপ্লাই করুন 💬
Reply to order by 11 AM for same-day delivery 🛵

#LuckyStoreBD #FreshChattogram #SameDayDelivery #LocalProduce
```

### Weekend Promo

```
🎉 ফ্রি ডেলিভারি উইকেন্ড!

৳৫০০+ অর্ডারে ডেলিভারি ফ্রি।
Free delivery on ৳500+ orders.

Friday – Sunday
Auto-applied. No code needed.

অর্ডার করুন: luckystore1947.com
Questions? WhatsApp us 💬
```

### Behind the Scenes

```
🌅 ভোর ৫টা।

মার্কেটে পৌঁছে গেছি — আপনার সবজি বাছাই করতে।
We're at the market by 5 AM picking your produce.

এই তাজা, এই সত্যিকারের — শুধু আপনার জন্য।
This fresh, this real — just for you.

📍 Emdad Park, Chattogram
🛵 Same-day delivery
```

### Customer Testimonial

```
⭐ "ভাই, আমি প্রথম অর্ডার করেছিলাম সন্দেহ নিয়ে।
এখন আর মার্কেটে যাই না।"

— Rafiq, Dhanmondi

His first order was skeptical.
Now he hasn't been to the market in months.

Join him: luckystore1947.com
```

---

## 📸 Photography Direction

**Aesthetic: Warm Neighborhood Grocery — Clean & Tactile**

### Do's
- Shoot in natural golden-hour or soft studio light on bone/cream surfaces
- Use warm wood, linen, kraft paper, terracotta as props and textures
- Show real produce: natural imperfections, soil on roots, dew on leaves
- Capture tactile moments: flour dust, cracked eggs, steam over bread
- Mix close-up macro shots with wider warm-kitchen compositions
- Keep backgrounds consistent with Warm Bone `#FDFBF7` tones

### Don'ts
- Cold fluorescent lighting or clinical white seamless backgrounds
- Over-styled or overly Pinterest-perfect aesthetics
- Plastic packaging as the hero element
- Heavy post-processing filters that shift away from warm tones

### Filters/Vibe
- Warmth boost: +5 to +10
- Lift shadows slightly for a soft, tactile feel
- Saturation: Natural — slight boost on yellows and warm oranges
- Preferred: Authentic, community-oriented, not corporate

---

## 📅 Seasonal Campaign Calendar

| Occasion | Month | Hero Product | Hashtag Push |
|----------|-------|--------------|--------------|
| Ramadan | Mar–Apr | Dates, iftar bundles | `#RamadanSpecial` |
| Eid-ul-Fitr | Shawwal | Meat, sweets, dry fruit | `#EidWithLucky` |
| Pohela Boishakh | Apr 14 | Hilsha, panta bhat, mango | `#BoishakhFresh` |
| Summer Fruits | May–Jul | Mango, litchi, jackfruit | `#SummerMango` |
| Monsoon | Jun–Aug | Rain gear, ginger, turmeric | `#RainOrShine` |
| Durga Puja | Sep–Oct | Festive pantry packs | `#PujaThali` |
| Winter Veggies | Nov–Jan | Cauliflower, carrots, spinach | `#WinterHarvest` |
| Year-End | Dec | Loyalty thank-you, recap | `#YearWithLucky` |

> **Action:** Schedule 2-week content sprints ahead of each occasion.

---

## 📱 WhatsApp Broadcast Best Practices

### Timing
- **Best:** 9:00–10:00 AM (morning restock), 2:00–3:00 PM (lunch), 6:00–7:00 PM (evening)
- **Never:** After 9:00 PM, before 7:00 AM

### Frequency
- Daily broadcasts: **1–2 max** (over-sending = blocks + unsubscribes)
- WhatsApp Status: **2–3/day** (easier to ignore if not interested)

### Format
```
[Emoji hook] [Bold headline in Bangla]

[Short body — 2–3 lines, mixed language]

[Price or CTA]

[Delivery info]

[Hashtags — max 5]
```

### CTA Types
| Goal | Copy |
|------|------|
| Direct order | "Reply with quantity" |
| Browse | "See all: luckystore1947.com" |
| Urgency | "Only 12 left — reply now" |
| Feedback | "Reply YES if you want this weekly" |

---

## 🚀 Launch Checklist for Social Team

Before going live:

- [ ] Logo pack downloaded and organized (SVG + PNG)
- [ ] Brand Yellow `#F5C518` + Charcoal `#1A1A1A` + Warm Bone `#FDFBF7` added to your design tool
- [ ] **Geist** + **Geist Mono** + Noto Sans Bengali fonts installed
- [ ] Canva/Figma templates created (feed, story, flyer)
- [ ] Instagram Business account connected to `hello@luckystore1947.com`
- [ ] Facebook page linked to Instagram
- [ ] WhatsApp Business profile completed (catalog, hours, address)
- [ ] 7 days of content scheduled in buffer
- [ ] Bio link set to `luckystore1947.com`
- [ ] First post published with proper hashtags

---

## 📞 Questions?

## 📍 Google Business Profile

> Mandatory for local SEO, Google Maps presence, "near me" search, and customer reviews. Keep NAP (Name/Address/Phone) consistent across all platforms — Google penalizes mismatches.

**Canonical Place ID (CID):** `0x30ad279098e1891f:0x9274c6c949a94b80`
**Feature ID:** `g/11n9w6zw_l`

### URLs

| Use | URL |
|-----|-----|
| **Canonical Maps listing** | `https://www.google.com/maps/place/Lucky+Store/@22.3550277,91.8363056,17z` |
| **Short URL (mobile, social bio)** | `https://maps.app.goo.gl/tfiRABoc1WsKEt619` |
| **Write a review** | `https://g.page/r/CYBLqUnJxnSSEBM/review` |
| **Directions** | `https://www.google.com/maps?q=Lucky+Store,+Emdad+Park,+665+Percival+Hill+Rd,+Chattogram+4203&ftid=0x30ad279098e1891f:0x9274c6c949a94b80` |

### NAP (must match across all listings)

  - **Name:** Lucky Store
  - **Address:** Emdad Park, 665 Percival Hill Rd, Chattogram 4203, Bangladesh
  - **Phone:** +880 1731-944544
  - **Area label:** Chawkbazar, Chittagong (বাংলা: চকবাজার, চট্টগ্রাম)
  - **Hours:** _(set in GBP dashboard — confirm with Mac)_
  - **Category:** Grocery store / Supermarket (primary), plus secondary: Convenience store, Fruit & vegetable store

### How to share

  - In **Instagram/TikTok bio**: use the short URL (mobile-friendly)
  - In **Facebook page "About"**: use the full Maps URL
  - In **print materials / flyers**: use the short URL or a QR code (the existing `scripts/tools/price_tags/price_tags_qr.html` can generate a QR)
  - In **email signatures**: "Find us on Google Maps → [short URL]"

### Review solicitation

  - Send the review URL via WhatsApp 1-2 days after a successful delivery
  - **Never** offer discounts for reviews (violates Google policy)
  - **Never** write fake reviews — brand pillar is wholesale honesty
  - Negative reviews: respond within 24h, public reply + move to DM/WhatsApp for resolution

---

## 📞 Quick Contact

| Topic | Contact |
|-------|---------|
| Logo usage / asset requests | hello@luckystore1947.com |
| Campaign ideas | Mac (WhatsApp) |
| Technical / website issues | dev@luckystore1947.com |
| Urgent approvals | WhatsApp group "Lucky Store Marketing" |

---

*These materials are proprietary to Lucky Store 1947. Share only with authorized team members.*
