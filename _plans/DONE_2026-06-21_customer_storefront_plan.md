# Storefront UI Enhancement Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform Lucky Store customer storefront with modern e-commerce UX patterns: sticky global header with prominent search, horizontal scrollable category pills, two-column filter + product grid layout, enhanced product cards with price-first design, skeleton loaders, shallow routing, asymmetric promo grids, and social commerce blocks.

**Architecture:** 
- Retain current yellow palette (`#FFF34D`) with modern hierarchy: prominent search bar, high-contrast badges, price-first card design
- Two-column layout: collapsible filter sidebar (desktop) + responsive product grid
- Shallow URL routing for filters (`?brand=unilever&max_price=500`) enabling instant filter updates without page reload
- Optimistic UI: instant cart updates + skeleton loaders during data fetch
- Asymmetric promo grids + social commerce carousels for engagement

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Supabase RPCs

---

## Current State Analysis

| Component | Location | Current Status |
|-----------|----------|----------------|
| Header | `app/components/Header.tsx` | Glassmorphism, logo + search + cart |
| CategoryGrid | `app/components/CategoryGrid.tsx` | Horizontal scrollable pills, sticky variant exists |
| ProductCard | `app/components/ProductCard.tsx` | Basic card with stock badge, price, qty controls |
| ProductGrid | `app/components/ProductGrid.tsx` | Responsive grid (2-6 cols), simple mapping |
| ProductCarousel | `app/components/ProductCarousel.tsx` | Horizontal scrolling carousel exists |
| Category Page | `app/category/page.tsx` | Has sticky category bar, basic loading state |
| HeroBanner | `app/components/HeroBanner.tsx` | Reusable banner component exists |
| Tokens | `app/tokens.css` | Warm yellow palette established |

---

## Phase 1: Header Redesign (Global Utility Header)

### Task 1: Enhance Header with Prominent Search + Location Context

**Objective:** Transform header into modern global header with dominant search, location context, and utility icons.

**Files:**
- Modify: `apps/customer_storefront/app/components/Header.tsx`

**Changes:**
- 68px height, yellow bg (`#FFF34D`), sticky top
- Left: Logo + Location pill ("Delivery to Chittagong ▼")
- Center: Dominant pill-shaped search with blue search button inside
- Right: Account icon + Cart with dark badge + yellow text

```tsx
<header className="sticky top-0 z-50 h-[68px] bg-[#FFF34D] border-b border-yellow-300 flex items-center px-4 gap-3">
  {/* Left: Logo + Location */}
  <div className="flex items-center gap-3 flex-shrink-0">
    <Link href="/" className="flex items-center gap-2">
      <img src="/logo-mark.svg" alt="Lucky Store" className="w-9 h-9 rounded-full bg-white" />
      <span className="font-extrabold text-base text-[#1c1917] hidden sm:block">Lucky Store</span>
    </Link>
    <button className="hidden md:flex flex-col items-start text-xs text-[#5c5200] hover:bg-yellow-400 px-2 py-1 rounded-lg transition-colors">
      <span className="font-medium">Delivery to</span>
      <span className="font-bold">Chittagong ▼</span>
    </button>
  </div>

  {/* Center: Dominant Search */}
  <div className="flex-1 max-w-2xl mx-2">
    <div className="relative">
      <input
        type="text"
        placeholder="Search everything..."
        className="w-full h-11 pl-4 pr-12 rounded-full bg-white border-2 border-transparent focus:border-[#0071DC] outline-none text-sm shadow-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const term = (e.target as HTMLInputElement).value;
            if (term.trim()) router.push(`/category?q=${encodeURIComponent(term)}`);
          }
        }}
      />
      <button className="absolute right-1 top-1 h-9 w-9 bg-[#0071DC] rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
        🔍
      </button>
    </div>
  </div>

  {/* Right: Account + Cart */}
  <div className="flex items-center gap-1 flex-shrink-0">
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
      <span className="text-xl">👤</span>
      <span className="hidden lg:block text-sm font-medium">Sign In</span>
    </button>
    <button onClick={onCartClick} className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
      <span className="text-xl">🛒</span>
      <span className="hidden lg:block text-sm font-medium">Cart</span>
      {mounted && cartCount > 0 && (
        <span className={`absolute -top-1 right-1 min-w-[20px] h-5 bg-[#1c1917] text-[#FFF34D] text-xs font-bold rounded-full grid place-items-center px-1 ${bouncing ? 'cart-bounce' : ''}`}>
          {cartCount}
        </span>
      )}
    </button>
  </div>
</header>
```

---

## Phase 2: Secondary Navigation (Horizontal Scroll Pills)

### Task 2: Enhance CategoryGrid for Seasonal/Thematic Pills

**Objective:** Transform category grid into modern secondary nav with dropdowns + scrollable thematic pills.

**Files:**
- Modify: `apps/customer_storefront/app/components/CategoryGrid.tsx`

**Changes:**
- Add "Departments" dropdown button (dark bg, yellow text)
- Add thematic pills: "🔥 Rollbacks & Deals", "✨ New Arrivals", "⭐ Best Sellers"
- Active: dark bg (`#1c1917`) + yellow text (`#FFF34D`)
- Inactive: light gray bg (`#f5f5f4`)
- Sticky variant: solid white bg with shadow

```tsx
const activeClass = 'bg-[#1c1917] text-[#FFF34D] font-bold shadow-sm';
const inactiveClass = 'bg-[#f5f5f4] text-[#44403c] hover:bg-[#e7e5e4]';

// Render order:
// 1. Departments (dropdown trigger)
// 2. Thematic pills
// 3. Category pills
```

---

## Phase 3: Two-Column Layout (Sidebar Filters + Product Grid)

### Task 3: Create FilterSidebar Component

**Objective:** Build collapsible filter sidebar with accordion sections for desktop, sheet/drawer for mobile.

**Files:**
- Create: `apps/customer_storefront/app/components/FilterSidebar.tsx`
- Modify: `apps/customer_storefront/app/category/page.tsx`

**Filter Categories:**
- Price Range (under ৳100, ৳100-500, ৳500-1000, ৳1000+)
- Category (from existing categories)
- Availability (In Stock, Low Stock)
- Sort (Best Match, Price Low-High, Price High-Low, Newest)

**Mobile:** Bottom sheet with drag handle, slide up from bottom
**Desktop:** Sticky sidebar (`sticky top-[140px]`), accordion sections

```tsx
// FilterSidebar.tsx structure
<>
  {/* Mobile Bottom Sheet */}
  <div className={`fixed inset-0 z-50 lg:hidden ...`}>
    <aside className="absolute bottom-0 left-0 right-0 h-[70vh] bg-white rounded-t-2xl shadow-2xl transform transition-transform ...">
      {/* Drag handle + FilterContent */}
    </aside>
  </div>

  {/* Desktop Sidebar */}
  <aside className="hidden lg:block w-64 flex-shrink-0">
    <div className="sticky top-[140px]">
      <h2 className="font-bold text-lg mb-4">Filters</h2>
      {/* Accordion sections */}
    </div>
  </aside>
</>
```

---

## Phase 4: Enhanced Product Cards (Conversion-Optimized)

### Task 4: Redesign ProductCard for Maximum Conversion

**Objective:** Transform product cards into information-dense cards with prominent pricing and clear CTAs.

**Files:**
- Modify: `apps/customer_storefront/app/components/ProductCard.tsx`

**Card Stack Order (top to bottom):**
1. **Badging area** (top-left): Promotional badge + stock indicator
2. **Wishlist** (top-right): Heart icon button
3. **Image**: `aspect-square`, `object-contain`, white bg, hover zoom (`group-hover:scale-105`)
4. **Variant selector** (if applicable): "+ 4 options" button
5. **Price block** (most prominent): Large ৳XX with superscript paisa
6. **Original price** (if on sale): Strikethrough + "Save ৳X" badge
7. **Per-unit price**: "৳X.XX / unit" transparency
8. **Title**: `line-clamp-2`, medium weight
9. **Social proof**: Star rating (yellow) + review count
10. **Fulfillment**: "Delivery by **Tomorrow**"
11. **CTA**: "Add to Cart" blue outline button, full width, rounded-full

**Micro-interactions:**
- Card hover: `hover:shadow-lg transition-shadow`
- Image hover: `group-hover:scale-105 transition-transform duration-300`
- Button hover: `hover:bg-blue-50 transition-colors duration-200`
- Button active: `active:scale-95` tactile feedback

```tsx
// Price block structure
<div className="flex items-baseline gap-1">
  <span className="text-2xl font-bold text-[#2E2F32]">৳{Math.floor(price)}</span>
  <span className="text-sm font-bold text-[#2E2F32]">{((price % 1) * 100).toFixed(0).padStart(2, '0')}</span>
</div>

// CTA button
<button className="w-full py-2.5 rounded-full border-2 border-[#0071DC] text-[#0071DC] text-sm font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all">
  Add to Cart
</button>
```

---

## Phase 5: Skeleton Loaders & Loading States

### Task 5: Create Skeleton Components

**Objective:** Replace simple shimmer divs with proper skeleton loaders matching card structure.

**Files:**
- Create: `apps/customer_storefront/app/components/SkeletonGrid.tsx`
- Modify: `apps/customer_storefront/app/category/page.tsx`

```tsx
// SkeletonCard.tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <div className="aspect-square bg-gray-200 animate-pulse" />
  <div className="p-3 space-y-2">
    <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
    <div className="h-8 bg-gray-200 rounded-full animate-pulse mt-2" />
  </div>
</div>
```

---

## Phase 6: Shallow Routing for Filters

### Task 6: Implement URL-Based Filter State

**Objective:** Enable instant filter updates via URL query params without page reload.

**Files:**
- Modify: `apps/customer_storefront/app/category/page.tsx`
- Modify: `apps/customer_storefront/app/lib/products.ts`

**URL Structure:**
- `/category?cat=groceries&price=0,500&brand=unilever&sort=price_asc`

**Implementation:**
```tsx
// Parse filters from URL
const filters = {
  priceRange: searchParams.get('price')?.split(',').map(Number) || [],
  brands: searchParams.get('brand')?.split(',') || [],
  sort: (searchParams.get('sort') as SortOption) || 'best',
};

// Update URL (shallow routing)
router.push(`/category?${params.toString()}`, { scroll: false });
```

---

## Phase 7: Asymmetric Promo Grid (Discovery Engine)

### Task 7: Create PromoGrid Component

**Objective:** Build asymmetric promotional grid for homepage engagement.

**Files:**
- Create: `apps/customer_storefront/app/components/PromoGrid.tsx`
- Modify: `apps/customer_storefront/app/page.tsx`

**Layout:** One large block (2 cols) + two stacked blocks (1 col each)
- Large: Background image with gradient overlay, headline, CTA
- Small: Color-coded cards with punchy copy

```tsx
// PromoGrid.tsx
<section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
  {/* Large promo */}
  <div className="relative col-span-1 md:col-span-2 h-64 flex flex-col justify-end overflow-hidden rounded-xl p-4">
    <img src="/promo-large.jpg" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
    <div className="relative z-10 w-2/3">
      <h2 className="text-2xl font-bold text-white">Big Savings Week</h2>
      <p className="mb-3 text-lg font-bold text-white">Up to 50% off essentials</p>
      <button className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-gray-100">Shop now</button>
    </div>
  </div>

  {/* Two stacked promos */}
  <div className="col-span-1 flex flex-col gap-4">
    <div className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-xl bg-red-100 p-4">
      <h3 className="text-lg font-bold text-black">Fresh Arrivals</h3>
      <button className="mt-2 text-sm font-bold underline">Shop now</button>
    </div>
    <div className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-xl bg-green-100 p-4">
      <h3 className="text-lg font-bold text-black">Daily Deals</h3>
      <button className="mt-2 text-sm font-bold underline">Shop now</button>
    </div>
  </div>
</section>
```

---

## Phase 8: Social Commerce Carousel

### Task 8: Create SocialCarousel Component

**Objective:** Social media style video/product carousel for social proof.

**Files:**
- Create: `apps/customer_storefront/app/components/SocialCarousel.tsx`
- Modify: `apps/customer_storefront/app/page.tsx`

**Structure:**
- Portrait cards (`aspect-[9/16]`, ~320px height)
- Creator avatar + name (top)
- Product thumbnail + title + price (bottom floating card)
- Horizontal scroll with snap

```tsx
// SocialCarousel.tsx
<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
  {creators.map((creator) => (
    <div key={creator.id} className="group relative h-80 w-48 flex-shrink-0 snap-start overflow-hidden rounded-xl bg-gray-200 cursor-pointer">
      <img src={creator.bgImage} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      
      {/* Creator info */}
      <div className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
        <img src={creator.avatar} className="h-6 w-6 rounded-full border border-white" />
        <span className="text-xs font-medium text-white">@{creator.handle}</span>
      </div>

      {/* Product card */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-lg bg-white p-2 shadow-lg transition-transform group-hover:-translate-y-1">
        <img src={creator.productImage} className="h-10 w-10 rounded bg-gray-100 object-cover" />
        <div className="flex flex-col">
          <span className="line-clamp-1 text-xs font-medium text-gray-900">{creator.productName}</span>
          <span className="text-sm font-bold text-green-700">৳{creator.productPrice}</span>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## Phase 9: Mobile Responsiveness Polish

### Task 9: Mobile-Specific Enhancements

**Objective:** Ensure modern experience works great on mobile.

**Files:**
- Modify: `apps/customer_storefront/app/components/Header.tsx` (mobile search)
- Modify: `apps/customer_storefront/app/components/FilterSidebar.tsx` (bottom sheet)

**Mobile search:**
- Show search icon on mobile
- Tapping opens full-width search overlay

**Touch targets:**
- All interactive elements: min 44px
- Category pills: min-height 44px
- Card buttons: min 44px height

---

## Phase 10: Performance Optimizations

### Task 10: Add Image Optimization & Debouncing

**Objective:** Ensure fast load times with proper image handling.

**Files:**
- Modify: `apps/customer_storefront/app/components/ProductCard.tsx`
- Modify: `apps/customer_storefront/app/category/page.tsx`

**Optimizations:**
```tsx
// ProductCard.tsx
<img
  src={image_url}
  alt={name}
  className="w-full h-full object-contain"
  loading="lazy"
  decoding="async"
/>
```

**Debounced filtering:**
```tsx
import { debounce } from 'lodash';

const debouncedFetch = debounce((filters) => {
  fetchProducts(filters);
}, 300);
```

---

## Phase 11: Home Page Integration

### Task 11: Update Homepage with New Components

**Objective:** Apply modern patterns to homepage.

**Files:**
- Modify: `apps/customer_storefront/app/page.tsx`

**New layout order:**
1. Header (updated)
2. Secondary nav (CategoryGrid)
3. HeroBanner
4. PromoGrid (new)
5. Popular Now carousel (existing)
6. SocialCarousel (new)
7. BottomNav

---

## Verification Checklist

Before completing, verify:

- [ ] Header: 68px height, yellow bg, dominant search, location context
- [ ] Category pills: horizontal scroll, thematic sections, sticky on scroll
- [ ] Two-column layout: sidebar filters (lg+) + product grid
- [ ] Product cards: price-first, stacked badges, per-unit pricing, hover effects
- [ ] Skeleton loaders: match card structure, smooth pulse
- [ ] Shallow routing: URL updates instantly, filters persist on refresh
- [ ] Promo grid: asymmetric layout, gradient overlays, CTAs
- [ ] Social carousel: portrait cards, creator avatars, floating product cards
- [ ] Mobile: search overlay, bottom sheet filters, 44px touch targets
- [ ] Micro-interactions: image zoom, button scale, hover states
- [ ] Images: lazy loading, proper aspect ratios

---

## Test Commands

```bash
# Navigate to storefront
cd apps/customer_storefront

# Install dependencies
npm install

# Run dev server
npm run dev

# Check TypeScript
npx tsc --noEmit

# Check build
npm run build
```

---

## Rollback Plan

If issues arise:
1. `git log --oneline -10` - find last good commit
2. `git reset --hard <commit-hash>` - reset to stable state
3. Branch strategy: work on `feature/storefront-redesign` branch

---

**Total Tasks: 11**
**Estimated Time: 6-8 hours**
**Priority: High (before deployment)**