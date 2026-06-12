# Lucky Store — Social Media Marketing Kit
> **Handoff Date:** June 2026  
> **Prepared for:** Social Media Marketing Team  
> **Brand System:** v1.0  
> **Files Location:** `brand/assets/`

---

## 📦 What's Inside This Kit

| Folder | Contents | For |
|--------|----------|-----|
| `brand/assets/logo/svg/` | Primary, Mark-only, Inverse logos | Web, print, apps, signage |
| `brand/assets/logo/pngs/` | Raster exports @1x, @2x, @3x | Social avatars, Instagram, Facebook |
| `brand/assets/templates/` | Canva/Photoshop-ready templates | Stories, feed posts, flyers |
| `brand/assets/fonts/` | Inter + Hind Siliguri | Social graphics |
| `docs/BRAND_GUIDELINES.md` | Full brand bible | Reference |
| `docs/DESIGN_SYSTEM.md` | Code tokens, Tailwind colors | Dev team |

---

## 🎨 Logo Package — Option A (Approved Direction)

### "Leaf Bag Mark" — Shopping bag with bold L + growing leaf

> **Symbolism:** Freshness, growth, neighborhood delivery, warmth.  
> **Why it works:** Readable at 48×48px. No detail lost on small screens. Memorable shape.

### Files

| File | Use Case | Spec |
|------|----------|------|
| `lucky-store-primary.svg` | Website header, merch, signage | Full wordmark + tagline |
| `lucky-store-mark.svg` | App icon, favicon, social avatar | Icon only, 200×200 viewBox |
| `lucky-store-inverse.svg` | Dark backgrounds, terracotta surfaces | White bag + wordmark |
| `lucky-store-primary@2x.png` | Instagram profile pic, website retina | 400×480px |
| `lucky-store-mark@2x.png` | App store icon, social avatar | 400×400px |
| `lucky-store-mark@3x.png` | iOS app icon, splash screen | 600×600px |
| `lucky-store-inverse@2x.png` | Instagram story overlays, dark posts | 400×480px |

### Clear Space Rule
> Never crowd the logo. Maintain clear space = height of the **L** in all directions.

```
        ←—— L ——→
      ┌──────────┐
   ↑  │   LOGO   │  ↑
   L  │          │  L
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

### Colors (Always Use These Hex Values)

| Element | Light BG | Dark BG |
|---------|----------|---------|
| Bag | `#E8B84B` | `#FFFFFF` |
| L letter | `#FFFFFF` | `#E8B84B` |
| Leaf | `#15803D` | `#22C55E` |
| Wordmark | `#0F172A` | `#F8FAFC` |
| Tagline | `#475569` | `#94A3B8` |

### ❌ Never Do
- Stretch, rotate, or warp the logo
- Change the bag color arbitrarily
- Add outlines, glows, or shadows not in the file
- Place on busy photos without a safe zone circle
- Recreate from memory — always use approved SVG

---

## 📐 Social Media Templates

### Instagram Feed Post (1:1 or 4:5)

**Layout:**
```
┌─────────────────────────┐
│  [Lifestyle photo, warm  │
│   kitchen setting]        │
│                           │
│  ──────────────────────  │
│  "ভোরের তাজা সবজি"        │
│  "Morning-fresh produce"  │
│                           │
│  💰 ৳25/kg    🛵 Same Day  │
│                           │
│  ┌─────────────────┐     │
│  │  👉 Order Now   │     │
│  └─────────────────┘     │
│       luckystorebd.com    │
└─────────────────────────┘
```

**Specs:**
- Canvas: `1080×1350px` (4:5) or `1080×1080px` (1:1)
- Photo area: Top 65%
- Gradient overlay bottom: `#0F172A` → transparent
- Price CTA: Gold `#E8B84B` pill
- Font: Inter Bold (English), Hind Siliguri Bold (Bangla)

### Instagram Story (9:16)

**Layout:**
```
┌────────────────┐
│ 🍅 Fresh Tomatoes│  ← Top sticker, white bold
│    ৳45/kg      │
│                │
│  [Full bleed   │
│   photo]       │
│                │
│  ┌──────────┐  │
│  │ Swipe Up │  │  ← Gold pill, bottom
│  │ to Order │  │
│  └──────────┘  │
└────────────────┘
```

**Specs:**
- Canvas: `1080×1920px`
- Full-bleed photo
- Stickers: Inter Bold, white with `rgba(0,0,0,0.5)` backdrop
- "Swipe Up" pill: `#E8B84B`, rounded `9999px`

### Facebook Cover (16:9)

- Canvas: `820×312px`
- Left third: Logo + tagline
- Right two-thirds: Seasonal hero photo
- Overlay gradient left-to-right: opaque `#F8FAFC` → transparent
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

অর্ডার করুন: luckystorebd.com
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

Join him: luckystorebd.com
```

---

## 🎨 Color Palette (For Any Graphics Tool)

Add these to your swatches:

| Name | Hex | Usage |
|------|-----|-------|
| Gold | `#E8B84B` | CTAs, logo accent, active states |
| Gold Dark | `#D4941A` | Hover, pressed |
| Gold Deeper | `#B0781A` | Active/pressed |
| Gold Subtle | `#FEF3C7` | Backgrounds, badges |
| Gold On | `#1E293B` | Text on gold |
| Slate 50 | `#F8FAFC` | Backgrounds |
| Slate 100 | `#F1F5F9` | Subtle backgrounds |
| White | `#FFFFFF` | Surfaces |
| Slate 950 | `#0F172A` | Headlines, body text |
| Slate 600 | `#475569` | Captions, meta text |
| Slate 400 | `#94A3B8` | Disabled, placeholders |
| Slate 200 | `#E2E8F0` | Dividers, card outlines |
| Teal | `#0D9488` | Secondary actions |
| Success Green | `#22C55E` | In stock, confirmed |
| Warning Amber | `#FBBF24` | Low stock, limited |
| Danger Red | `#EF4444` | Sold out, cancelled |
| Leaf Green | `#15803D` | Logo leaf, fresh accents |

---

## 📸 Photography Direction

**Aesthetic: Warm Bangladeshi Kitchen Lifestyle**

### Do's
- Shoot in natural golden-hour light
- Use warm wood, terracotta, concrete textures
- Include real props: betel leaf, clay bowls, steel glasses, checkered towels
- Show imperfect produce: curved gourds, soil on roots
- Capture steam, water droplets, flour dust
- Mix close-ups with wider kitchen compositions

### Don'ts
- White studio seamless shots (too sterile)
- Over-styled Pinterest aesthetics (unreachable)
- Cold fluorescent lighting
- Plastic packaging as hero

### Filters/Vibe
- Slight warmth boost (+5 to +10)
- Lift shadows slightly
- Keep saturation natural — slightly boost greens and oranges
- Prefer authentic over polished

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
| Browse | "See all: luckystorebd.com" |
| Urgency | "Only 12 left — reply now" |
| Feedback | "Reply YES if you want this weekly" |

---

## 🚀 Launch Checklist for Social Team

Before going live:

- [ ] Logo pack downloaded and organized (SVG + PNG)
- [ ] Brand colors added to your design tool
- [ ] Inter + Hind Siliguri fonts installed
- [ ] Canva templates created (feed, story, flyer)
- [ ] Instagram Business account connected to `hello@luckystorebd.com`
- [ ] Facebook page linked to Instagram
- [ ] WhatsApp Business profile completed (catalog, hours, address)
- [ ] 7 days of content scheduled in buffer
- [ ] Bio link set to `luckystorebd.com`
- [ ] First post published with proper hashtags

---

## 📞 Questions?

| Topic | Contact |
|-------|---------|
| Logo usage / asset requests | hello@luckystorebd.com |
| Campaign ideas | Mac (WhatsApp) |
| Technical / website issues | dev@luckystorebd.com |
| Urgent approvals | WhatsApp group "Lucky Store Marketing" |

---

*These materials are proprietary to Lucky Store. Share only with authorized team members.*
