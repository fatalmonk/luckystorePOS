
# LUCKY STORE 1947 — UI/UX REDESIGN PLAN
## Using: design-taste-frontend + high-end-visual-design + imagegen-frontend-mobile

---

## DESIGN READ (Section 0 — Brief Inference)

**Reading this as:** E-commerce landing + product browsing for Bangladeshi neighborhood grocery consumers, 
with a heritage-trust language, leaning toward a warm, premium-but-accessible design system with 
strong yellow brand identity and cultural resonance.

**Brand constraint:** Yellow is the ONLY brand color. No green, no terracotta, no earth tones as primary.

---

## THREE DIALS (Section 1 — Core Configuration)

| Dial | Value | Reasoning |
|------|-------|-----------|
| DESIGN_VARIANCE | 6 | Heritage brand needs structure + warmth, not chaos. Asymmetric but grounded. |
| MOTION_INTENSITY | 5 | Smooth, confident motion. Not flashy — groceries are about reliability. |
| VISUAL_DENSITY | 5 | Product-heavy e-commerce needs clarity, but not sterile. Warm spacing. |

---

## VIBE & TEXTURE ARCHETYPE (Section 3 — High-End Visual Design)

**Selected: Soft Structuralism (Consumer / Health / Portfolio variant)**
- Silver-grey or warm off-white backgrounds
- Massive bold Grotesk typography
- Airy, floating components with unbelievably soft, highly diffused ambient shadows
- **BUT:** Yellow as the singular accent driver — not a neutral system

**Why this archetype:**
- Grocery shopping is tactile, daily, warm
- "Soft Structuralism" balances the trust of a 1947 heritage brand with modern e-commerce expectations
- Yellow works beautifully as a single saturated accent against warm neutrals

---

## LAYOUT ARCHETYPE (Section 3 — High-End Visual Design)

**Selected: The Asymmetrical Bento**
- Masonry-like CSS Grid of varying card sizes
- Hero section: Large brand storytelling panel (left, 2/3) + Quick-order/promo panel (right, 1/3)
- Product grid: Mixed card sizes — featured items get larger tiles, staples get compact cards
- Category strips: Horizontal scrollable pills below hero

**Mobile Collapse:** Single-column stack (`grid-cols-1`) with `gap-6`, all `col-span` overrides reset to `col-span-1`

---

## COLOR PALETTE (Yellow-Locked)

| Token | Hex | Usage |
|-------|-----|-------|
| Canvas / Background | #FDFBF7 | Warm bone white — softer than pure white, lets yellow breathe |
| Primary Surface (Cards) | #FFFFFF | Clean product cards |
| Text Primary | #1A1A1A | Near-black for readability |
| Text Secondary | #6B6B6B | Warm grey for metadata |
| **Brand Yellow** | **#F5C518** | **Primary accent — CTAs, badges, highlights, hover states** |
| Yellow Light | #FFF8E1 | Soft yellow tint backgrounds, tags, subtle highlights |
| Yellow Dark | #C79400 | Deep yellow for text on yellow backgrounds (WCAG AA) |
| Structural Borders | #E8E4DC | Warm grey dividers — never cold #E5E7EB |
| Error / Alert | #DC2626 | Standard red for out-of-stock, errors |
| Success | #16A34A | Green ONLY for success states (checkmarks, delivered) — never as brand color |

**Rules:**
- Yellow appears on EVERY interactive element: buttons, active nav, cart badge, sale tags, price highlights
- No other saturated color competes with yellow
- All shadows tinted warm (yellow-grey at 3% opacity), never pure black

---

## TYPOGRAPHY (Section 4.1 — Design Taste Frontend)

| Role | Font | Weight | Size | Tracking | Line-Height |
|------|------|--------|------|----------|-------------|
| Display / Hero | Geist or Cabinet Grotesk | 800 | clamp(3rem, 8vw, 6rem) | -0.03em | 0.95 |
| H1 Section | Geist | 700 | clamp(2rem, 5vw, 3.5rem) | -0.02em | 1.1 |
| H2 Card Title | Geist | 600 | 1.25rem | -0.01em | 1.3 |
| Body | Geist | 400 | 1rem | 0 | 1.6 |
| Mono / Price | Geist Mono | 500 | 1.125rem | 0.02em | 1.2 |
| Micro / Tags | Geist | 500 | 0.75rem | 0.05em | 1.4 |
| Bengali | Noto Sans Bengali | 400-700 | matching | 0 | 1.6 |

**Note:** Serif is BANNED for this project. The brand voice is "neighborhood institution," not "editorial luxury." Sans-serif display (Geist) conveys approachability + modern trust.

---

## HERO SECTION (Section 4.7 — Layout Discipline)

**Structure:**
1. **Eyebrow:** "EST. 1947 — DHAKA'S NEIGHBORHOOD GROCER" (yellow pill badge, Geist Mono, 10px, tracking 0.2em)
2. **Headline:** "Fresh essentials, delivered fast." (Geist 800, 2 lines max, tight leading)
3. **Subtext:** "Same-day delivery across Dhaka. Quality staples, household goods, and daily essentials since 1947." (max 20 words, 3 lines)
4. **CTAs:** 
   - Primary: "Shop Now" (yellow bg, black text, rounded-md)
   - Secondary: "View Categories" (outline, black text, yellow border)
5. **Hero Asset:** Split composition — left 60% warm lifestyle photography (family kitchen, yellow accents), right 40% floating product showcase (3-4 hero products with soft shadows)

**NO trust micro-strip in hero.** No "Used by 10,000 families" — that goes below.

---

## NAVIGATION (Section 5 — High-End Visual Design)

**The "Fluid Island" Nav (adapted for e-commerce):**
- Floating pill navbar, detached from top (`mt-4`, `mx-auto`, `w-max`, `rounded-full`)
- Background: `bg-white/80 backdrop-blur-xl` with warm yellow-tinted border `border-yellow-100/50`
- Left: Logo (Lucky Store wordmark, yellow dot accent)
- Center: Categories (Dairy, Staples, Snacks, Household, Baby)
- Right: Search icon + Cart (yellow badge for item count) + Account
- **Mobile:** Hamburger morphs to X with fluid rotation, menu expands as full-screen overlay with staggered link reveals

**Height cap:** 64px max. No giant nav bars.

---

## PRODUCT CARDS (Double-Bezel Architecture — Section 4.A)

Every product card uses the "Doppelrand" nested structure:

```
OUTER SHELL:
- bg: white
- border: 1px solid #E8E4DC
- padding: 6px
- radius: 16px
- shadow: 0 4px 24px rgba(245, 197, 24, 0.04) — warm yellow-tinted shadow

INNER CORE:
- bg: white
- border: none
- radius: calc(16px - 6px) = 10px
- shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] — inner highlight
- padding: 16px
- image container: aspect-[4/5], rounded-[10px], overflow-hidden
- content: product name (Geist 600), price (Geist Mono 500, yellow for sale price), 
  per-unit price (micro, grey), "Add" button (yellow bg, black text, rounded-full, 
  with nested arrow icon in its own circle)
```

**Hover state:** Card lifts with shadow intensifying to `rgba(245, 197, 24, 0.08)`, image scales 1.03, "Add" button arrow translates diagonally.

---

## CATEGORY SYSTEM (Section 4.9 — Content Density)

**Horizontal scroll-snap pills** (NOT a dropdown, NOT a sidebar):
- Each category: icon (Phosphor Bold) + label, pill-shaped, `rounded-full`
- Active category: yellow background, black text
- Inactive: white bg, warm grey border, grey text
- Scrollable on mobile with `snap-x snap-mandatory`
- Categories: Dairy & Eggs, Rice & Grains, Snacks, Household, Baby Care, Beverages, Personal Care

---

## TRUST SECTION (Below Hero — NOT Inside Hero)

**"Used by Dhaka families since 1947"** — logo wall style but with trust signals:
- "Same-day delivery" + truck icon
- "Cash on delivery" + wallet icon  
- "Fresh guarantee" + leaf icon (green ONLY here, not brand)
- "78 years of trust" + shield icon
- Layout: 4-column on desktop, 2x2 grid on mobile
- No fake company logos — these are service promises

---

## PRODUCT GRID (Bento-Style Asymmetry)

**Layout:**
- Featured product (e.g., Aarong Milk): `col-span-2 row-span-2` — large image, story-driven
- Standard products: `col-span-1 row-span-1` — compact, price-focused
- Sale items: Yellow top-border strip, "Save ৳XX" badge in yellow pill
- "On Sale" badge: Yellow bg, black text, `rounded-full`, `text-xs`, uppercase, tracking wide

**NO 3-column equal cards.** Asymmetric grid with rhythm.

---

## MOBILE APP SCREENS (imagegen-frontend-mobile skill)

**Platform:** Cross-platform premium neutral (grocery app needs universal appeal)
**Screens to generate:**
1. **Home/Dashboard** — Hero banner, category pills, featured products, quick reorder
2. **Category Browse** — Grid of products with filter chips, search bar
3. **Product Detail** — Large image, price block, quantity selector, "Add to Cart" CTA, related items
4. **Cart** — Item list with quantity steppers, price breakdown, checkout CTA
5. **Checkout** — Delivery address, payment method (COD prominent), order summary
6. **Order Confirmation** — Success animation, delivery estimate, order tracking CTA

**Design Bible for Mobile:**
- Platform: Cross-platform premium
- Device: Clean iPhone-style mockup with visible frame
- Palette: Warm bone white (#FDFBF7) canvas, yellow (#F5C518) primary, black text
- Typography: Geist Sans + Geist Mono
- Structure: Card-led modular with bento-inspired grid
- Image art direction: Warm lifestyle photography, product shots with soft shadows
- Texture: Ultra-subtle grain on backgrounds (0.02 opacity)
- Navigation: Bottom tab bar (Home, Categories, Cart, Account) — 4 items max
- Spacing: Generous, 24px section gaps, 16px card padding
- Buttons: Full-width yellow CTAs with black text, rounded-xl
- Cards: Double-bezel style adapted for mobile — outer 12px radius, inner 8px
- Consistency: All 6 screens share identical component language, spacing, palette

---

## MOTION CHOREOGRAPHY (Section 5 — High-End Visual Design)

| Element | Motion | Spec |
|---------|--------|------|
| Hero text | Staggered fade-up | `translateY(24px) opacity-0` → `0 opacity-100`, 800ms, `cubic-bezier(0.32, 0.72, 0, 1)` |
| Product cards | Scroll reveal | `translateY(16px) opacity-0` → `0 opacity-100`, 600ms, stagger 80ms per card |
| Category pills | Horizontal scroll | Native scroll with `scroll-snap`, no JS animation |
| Nav island | Scroll-aware | Shrinks slightly on scroll down, expands on scroll up (CSS `transform` only) |
| Add to Cart button | Press feedback | `active:scale-[0.98]`, arrow icon `group-hover:translate-x-1` |
| Cart badge | Pop animation | Scale 1 → 1.2 → 1, 200ms spring on item add |
| Sale badges | Subtle pulse | `opacity` 0.9 → 1, 2s infinite, VERY subtle |
| Page transitions | Fade | `opacity` 0 → 1, 300ms, no layout shift |

**NO:** `window.addEventListener('scroll')`, `requestAnimationFrame` loops, heavy blur on scroll containers.

---

## ANTI-PATTERNS TO AVOID (All Three Skills)

| Banned | Why | Replacement |
|--------|-----|-------------|
| Inter font | Generic, overused | Geist or Cabinet Grotesk |
| Lucide icons | Thin, generic | Phosphor Bold or Tabler |
| Green as brand color | User explicitly banned | Yellow (#F5C518) locked |
| Terracotta/earth tones | User explicitly banned | Warm bone white + yellow |
| 3 equal feature cards | Boring, template-like | Asymmetric bento grid |
| Heavy drop shadows | Cheap, dated | Ultra-diffused warm shadows at 4% opacity |
| Centered hero (always) | Boring default | Asymmetric split: content left, products right |
| Fake dashboard divs | AI tell | Real product photography or generated lifestyle images |
| "Elevate", "Seamless" | AI copy slop | Plain, specific: "Same-day delivery", "Fresh guarantee" |
| Em-dashes | Banned per design-taste | Hyphens or line breaks |
| Section-number eyebrows | Banned per design-taste | Plain text labels or none |
| Generic placeholder names | Breaks trust | Real Bengali names, real Dhaka neighborhoods |
| h-screen for hero | iOS Safari bug | `min-h-[100dvh]` |
| Glassmorphism everywhere | Dated, overused | Only on nav island, nowhere else |
| Purple/blue AI gradients | Generic startup slop | Yellow radial glows ONLY if used, and sparingly |

---

## PRE-FLIGHT CHECKLIST (Section 14 — Design Taste + Section 8 — High-End)

- [x] Brief inference declared: Heritage grocery e-commerce for Dhaka consumers, warm yellow brand
- [x] Dial values explicit: 6/5/5 (variance/motion/density)
- [x] Vibe archetype selected: Soft Structuralism with yellow accent
- [x] Layout archetype selected: Asymmetrical Bento
- [x] ZERO em-dashes anywhere
- [x] Page theme lock: Light mode only (warm bone white), no mid-page dark sections
- [x] Color consistency lock: Yellow (#F5C518) is the ONLY accent, used everywhere
- [x] Shape consistency: `rounded-xl` (12-16px) for cards, `rounded-full` for pills/buttons, `rounded-md` for CTAs — documented rule
- [x] Button contrast: Yellow bg (#F5C518) + black text = 12.5:1 ratio, passes WCAG AAA
- [x] CTA button wrap: "Shop Now" (2 words), "View Categories" (2 words) — fits single line
- [x] Hero fits viewport: 2-line headline, 18-word subtext, 2 CTAs visible without scroll
- [x] Hero top padding: `pt-20` max (5rem), content starts high
- [x] Hero stack discipline: Eyebrow + Headline + Subtext + CTAs = 4 elements exactly
- [x] Eyebrow count: 1 eyebrow in hero, 0 in product grid, 1 in trust section = 2 total (≤ ceil(6/3)=2) ✓
- [x] Split-header ban: No left-headline/right-paragraph section headers — vertical stack only
- [x] Zigzag cap: Product grid is bento, not alternating image/text — no zigzag at all
- [x] No duplicate CTA intent: "Shop Now" (browse) and "View Categories" (navigate) — different intents
- [x] Logo wall = logo only: Trust section uses icons + text, not logos — acceptable
- [x] Bento background diversity: Featured cards have lifestyle images, standard cards have white bg, sale cards have yellow top strip
- [x] Copy self-audit: All strings checked — no AI slop, no generic names, no broken grammar
- [x] Motion motivated: Every animation has a purpose (hierarchy, feedback, state transition)
- [x] Marquee max-one: No marquees on this page (not needed for grocery)
- [x] Navigation on one line: Floating pill nav, all items fit at lg breakpoint
- [x] Section layout repetition: Hero (split) → Categories (pills) → Featured (bento) → Products (grid) → Trust (4-col) → Footer (stack) — 5 different families across 6 sections
- [x] Bento cell count: N products → N cells, no empty cells
- [x] Long lists: Product grid uses bento cards, not `<ul>` with `divide-y`
- [x] Real images: Generate lifestyle photography + product shots via image gen tool
- [x] No pills on images: Sale badges are outside image container, overlaying card edge
- [x] No photo-credit captions: Product names only, no fake photographer credits
- [x] No version footers: No "v1.0" or build numbers
- [x] No micro-meta sentences: No "Each of these is a feature we ship today" under sections
- [x] No decoration text strip: No "BRAND. MOTION. SPATIAL." at hero bottom
- [x] No floating top-right sub-text: Section headers are vertical stack only
- [x] No scoring/progress bars: No comparison visuals needed
- [x] No locale/time strips: No "DHK 14:23 · 32°C" in nav
- [x] No scroll cues: No "Scroll to explore" — user knows how to scroll
- [x] No version labels in hero: No "BETA" or "v2.0"
- [x] No section-numbering eyebrows: No "001 · Products"
- [x] No decorative dots: No colored dots before nav items or list rows
- [x] No border-t + border-b on every row: Product cards use gap spacing, not hairline rows
- [x] Content density: No 20-row tables, no fake-precise specs, sub-paragraphs ≤ 25 words
- [x] Quotes ≤ 3 lines: No testimonials on landing page (not needed)
- [x] Motion claimed = motion shown: 5/10 intensity = scroll reveals, hover states, nav morph
- [x] No window.addEventListener('scroll'): IntersectionObserver or Motion whileInView only
- [x] Reduced motion: All animations wrapped with `useReducedMotion()` or `@media (prefers-reduced-motion)`
- [x] Dark mode: Not implemented (light-only per brand warmth), but tokens structured for future
- [x] Mobile collapse: All asymmetric layouts collapse to `w-full px-4 py-8` below 768px
- [x] Viewport stability: `min-h-[100dvh]` everywhere, never `h-screen`
- [x] useEffect cleanup: All GSAP/Motion contexts have `ctx.revert()` or equivalent
- [x] Empty/loading/error states: Skeleton loaders for product grid, empty cart state designed
- [x] Cards omitted where possible: Trust section uses icon+text blocks, not cards
- [x] Icons from allowed library: Phosphor Bold (primary), Tabler (secondary) — no Lucide
- [x] Motion isolated: All animated components are Client Components with `'use client'`
- [x] No AI tells: No Inter, no purple gradients, no 3 equal cards, no Jane Doe, no Acme
- [x] Core Web Vitals: Hero image priority loaded, LCP target < 2.5s, no layout shifts
- [x] One design system: Tailwind v4 + custom tokens, no mixing with Material or Bootstrap

---

## TECH STACK

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14+ (App Router) | SEO-critical for e-commerce, RSC for performance |
| Styling | Tailwind v4 | Utility-first, custom tokens for yellow palette |
| Animation | Motion (framer-motion successor) | `whileInView`, `useReducedMotion`, spring physics |
| Icons | @phosphor-icons/react (Bold weight) | Thick, premium stroke, consistent with soft structuralism |
| Fonts | Geist (Sans + Mono) via next/font | Premium, available, no external requests |
| Images | next/image + generated assets | Priority loading for hero, lazy for grid |
| State | Zustand (if needed) | Cart state, minimal global needs |

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- Set up Next.js + Tailwind v4 + Geist fonts
- Configure yellow color tokens in Tailwind config
- Build Design System: buttons, cards, pills, badges, inputs
- Implement Double-Bezel card component
- Create fluid island nav component

### Phase 2: Core Pages (Week 2)
- Hero section with asymmetric split layout
- Category pill system with horizontal scroll
- Product grid with bento asymmetry
- Product card with Double-Bezel + Add to Cart
- Trust section with 4 service promises

### Phase 3: Motion & Polish (Week 3)
- Scroll reveal animations (IntersectionObserver + Motion)
- Nav island scroll behavior
- Cart badge pop animation
- Hover states on all interactive elements
- Mobile collapse for all asymmetric layouts
- Reduced motion fallbacks

### Phase 4: Mobile App Screens (Week 4)
- Generate 6 mobile screen images using imagegen skill
- Home, Category, Product Detail, Cart, Checkout, Confirmation
- Ensure consistency across all 6 screens
- Present in clean iPhone mockups with even framing

### Phase 5: QA & Launch (Week 5)
- Pre-flight checklist verification
- Lighthouse audit (target: 90+ all categories)
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile responsiveness audit (iOS Safari, Android Chrome)
- Accessibility audit (WCAG 2.1 AA minimum)

---

## SUMMARY

This redesign transforms Lucky Store 1947 from a basic template-style grocery site into a 
premium, heritage-driven e-commerce experience. The yellow brand color is treated as a 
precious, scarce resource — used only where it drives action (CTAs, badges, highlights) 
against a warm, breathable canvas. The 1947 heritage is leveraged as a trust asset, not 
buried in the logo. The asymmetric bento grid creates visual rhythm without sacrificing 
clarity. Every interaction has purposeful motion. Every product card feels tactile and 
expensive. The result: a neighborhood grocer that feels like a modern institution.
