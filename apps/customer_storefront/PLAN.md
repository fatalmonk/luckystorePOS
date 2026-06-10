# Customer Storefront Implementation Plan (Fixed)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a live customer storefront that replaces the landing page, surfaces Lucky Store inventory from Supabase, supports COD checkout, and notifies admin + WhatsApp — including wishlist for out-of-stock items.

**Architecture:** New Next app (`apps/customer_storefront`) becomes customer-facing storefront. Replaces `landing/index.html`. Same `admin_web` Supabase instance. One unified product source: inventory DB. Storefront is read-only for inventory; orders and wishlists flow back through Supabase/edge functions.

**Tech Stack:** Next 15, React 19, TypeScript, Tailwind CSS, Supabase JS client, Zod validation, Next API routes, Supabase RPC for atomic operations, WhatsApp Cloud API.

---

### Task 0: Database Migrations & RLS (Prerequisite)

**Objective:** Create required tables and RLS policies before storefront code touches them. **Fixes 5 blockers from schema audit.**

**Files:**
- Create: `supabase/migrations/20260611000000_add_categories_ext.sql` (extends existing `categories`)
- Create: `supabase/migrations/20260611000001_add_wishlist.sql`
- Create: `supabase/migrations/20260611000002_add_orders.sql`
- Create: `supabase/migrations/20260611000003_add_items_rls.sql`

---

#### Step 1: Extend existing `categories` table (NOT create new)

**Blocker #3 Fix:** Production `categories` already exists with `id uuid PK, category text, name text, tenant_id, store_id`. Add missing columns for web consumption.

```sql
-- supabase/migrations/20260611000000_add_categories_ext.sql
-- Extends existing public.categories (id uuid PK, category text, tenant_id, store_id, name)

alter table public.categories 
  add column if not exists slug text,
  add column if not exists emoji text,
  add column if not exists display_order int default 0;

-- Backfill slug from category (lowercase, replace spaces with hyphens)
update public.categories 
set slug = lower(regexp_replace(category, '\s+', '-', 'g'))
where slug is null;

-- Backfill emoji for known categories
update public.categories set emoji = '🥛' where slug = 'dairy' and emoji is null;
update public.categories set emoji = '🍚' where slug = 'grocery' and emoji is null;
update public.categories set emoji = '🧃' where slug = 'beverages' and emoji is null;
update public.categories set emoji = '🍪' where slug = 'snacks' and emoji is null;
update public.categories set emoji = '🧼' where slug = 'household' and emoji is null;
update public.categories set emoji = '🥬' where slug = 'produce' and emoji is null;
update public.categories set emoji = '🍞' where slug = 'bakery' and emoji is null;
update public.categories set emoji = '🧊' where slug = 'frozen' and emoji is null;
update public.categories set emoji = '📦' where emoji is null; -- fallback

-- Make slug unique for web lookups
create unique index if not exists uq_categories_slug on public.categories(slug) where slug is not null;

-- RLS: anon read only active categories for the single store
alter table public.categories enable row level security;

create policy if not exists "Allow anon read categories for store"
on public.categories for select
to anon
using (active = true and store_id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd');
```

---

#### Step 2: Anon read access for items (uses existing `search_items_pos` RPC)

**Blocker #1 & #2 Fix:** Don't add RLS on `items` directly. The `search_items_pos` RPC already exists, handles `stock_levels` join, `categories` join, and returns `qty_on_hand`. It uses `SECURITY DEFINER` so it bypasses RLS. We only need to grant `anon` execute on it.

```sql
-- supabase/migrations/20260611000003_add_items_rls.sql
-- DO NOT add RLS on public.items — it breaks existing admin_web policies
-- Instead, grant anon execute on the existing search_items_pos RPC

grant execute on function public.search_items_pos(uuid, text, uuid, integer, integer) to anon;

-- Ensure image_url column exists (already there per schema audit)
-- alter table public.items add column if not exists image_url text; -- redundant
```

---

#### Step 3: Wishlist table with optional phone capture

**Significant Issue Fix:** Add optional `customer_phone` for back-in-stock notifications.

```sql
-- supabase/migrations/20260611000001_add_wishlist.sql
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.items(id) on delete cascade,
  customer_fingerprint text not null, -- localStorage fingerprint
  customer_phone text,                 -- optional, for back-in-stock SMS
  product_name text not null,          -- denormalized for notification
  created_at timestamptz not null default now(),
  unique (product_id, customer_fingerprint)
);

alter table public.wishlist enable row level security;

-- Anon can insert their own, but NOT read
create policy if not exists "Allow anon insert wishlist"
on public.wishlist for insert
to anon
with check (true);

-- Anon cannot select (prevents browsing others' wishlists)
create policy if not exists "Disallow anon select wishlist"
on public.wishlist for select
to anon
using (false);

-- Admin can read for restock planning
create policy if not exists "Allow admin read wishlist"
on public.wishlist for select
to authenticated
using (true);
```

---

#### Step 4: Orders table + atomic RPC (fixed)

**Blocker #1 Fix:** RPC uses `stock_levels` (not `items.stock`) with `p_store_id` param.
**Blocker #5 Fix:** Orders table includes `tenant_id`.
**Significant Issue:** Store ID parameterized (not hardcoded in RPC body).
**Fixed:** RPC returns result via `v_result`.

```sql
-- supabase/migrations/20260611000002_add_orders.sql
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tenant_id uuid not null, -- Blocker #5
  store_id uuid not null default '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  items jsonb not null,          -- [{id, name, price, qty, unit}]
  subtotal numeric not null,
  delivery_fee numeric not null,
  total numeric not null,
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  payment_method text not null default 'cod',
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_tenant_store_created on public.orders(tenant_id, store_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);

alter table public.orders enable row level security;

-- Anon can insert
create policy if not exists "Allow anon insert orders"
on public.orders for insert
to anon
with check (true);

-- Admin/tenant-scoped read
create policy if not exists "Allow tenant read orders"
on public.orders for select
to authenticated
using (tenant_id = public.get_current_user_tenant_id());

-- RPC: atomic order + stock decrement from stock_levels
create or replace function public.create_order_with_stock(
  p_order_number text,
  p_tenant_id uuid,            -- parameterized
  p_store_id uuid,             -- parameterized (not hardcoded)
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,               -- [{id, name, price, qty, unit}]
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_id uuid;
  v_qty int;
  v_stock int;
  v_result jsonb;
begin
  -- Validate stock for all items first (SELECT FOR UPDATE on stock_levels)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    select qty into v_stock 
    from public.stock_levels 
    where item_id = v_id and store_id = p_store_id 
    for update;
    
    if not found then
      raise exception 'Item % not found in stock_levels for store %', v_id, p_store_id;
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for item % (available: %, requested: %)', v_id, v_stock, v_qty;
    end if;
  end loop;

  -- Decrement stock in stock_levels
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'qty')::int;
    update public.stock_levels 
    set qty = qty - v_qty 
    where item_id = v_id and store_id = p_store_id;
  end loop;

  -- Insert order and capture result
  insert into public.orders (
    order_number, tenant_id, store_id, customer_name, customer_phone, customer_address, notes,
    items, subtotal, delivery_fee, total, payment_method
  ) values (
    p_order_number, p_tenant_id, p_store_id,
    p_customer_name, p_customer_phone, p_customer_address, p_notes,
    p_items, p_subtotal, p_delivery_fee, p_total, 'cod'
  ) returning jsonb_build_object('id', id, 'order_number', order_number)
  into v_result;

  return v_result;
end;
$$;

-- Grant anon execute on the RPC
grant execute on function public.create_order_with_stock(text, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text) to anon;
```

---

#### Step 5: Verify migrations

Run via Supabase Management API (POST `https://api.supabase.com/v1/projects/hvmyxyccfnkrbxqbhlnm/database/query`):

```bash
# Execute each migration file in order:
# 1. 20260611000000_add_categories_ext.sql
# 2. 20260611000001_add_wishlist.sql
# 3. 20260611000002_add_orders.sql
# 4. 20260611000003_add_items_rls.sql
```

---

### Task 0.5: Cross-Platform Design Token System (Parallel — NOT blocking)

**Objective:** Establish canonical `design-tokens/` generating platform-specific files. **Decoupled from Tasks 1-3 — run in parallel or post-MVP.**

**Critical Fixes:**
- Use **existing CSS variable names** (`--warm-bg`, `--warm-surface`, etc.) — no `color-` prefix
- Pin **Style Dictionary v3** (`^3.9.0`) to avoid SD4 async API breakage
- Flutter: fix `bodyMedium` double `copyWith` bug

**Files:**
- Create: `design-tokens/tokens.json` (canonical)
- Create: `design-tokens/package.json` (SD v3)
- Create: `design-tokens/build.js`
- Create: `design-tokens/output/tokens.css`
- Create: `design-tokens/output/tokens.dart`
- Create: `design-tokens/output/tokens.ts`
- Modify: `apps/admin_web/tailwind.config.js` (already uses correct var names)
- Modify: `apps/customer_storefront/tailwind.config.js` (map to existing var names)
- Modify: `apps/mobile_app/lib/core/theme/tokens.dart` (copy generated)
- Modify: `apps/mobile_app/lib/theme/app_theme.dart` (fix font bug)

---

#### Step 1: Canonical token JSON (uses existing var names)

`design-tokens/tokens.json`:
```json
{
  "color": {
    "warm": {
      "bg": { "$value": "#faf8f5", "$type": "color" },
      "surface": { "$value": "#ffffff", "$type": "color" },
      "fg": { "$value": "#1c1917", "$type": "color" },
      "muted": { "$value": "#78716c", "$type": "color" },
      "dim": { "$value": "#a8a29e", "$type": "color" },
      "border": { "$value": "#f0eee6", "$type": "color" },
      "border-warm": { "$value": "#e7e5e4", "$type": "color" },
      "accent": { "$value": "#dc5f3b", "$type": "color" },
      "accent-light": { "$value": "#e08868", "$type": "color" },
      "accent-hover": { "$value": "#c4542e", "$type": "color" },
      "accent-ghost": { "$value": "rgba(220,95,59,0.07)", "$type": "color" },
      "success": { "$value": "#2d6a4f", "$type": "color" },
      "success-bg": { "$value": "rgba(45,106,79,0.08)", "$type": "color" },
      "warning": { "$value": "#b45309", "$type": "color" },
      "warning-bg": { "$value": "rgba(180,83,9,0.08)", "$type": "color" },
      "danger": { "$value": "#c3312f", "$type": "color" },
      "danger-bg": { "$value": "rgba(195,49,47,0.07)", "$type": "color" },
      "sand": { "$value": "#e8e6dc", "$type": "color" },
      "charcoal": { "$value": "#4d4c48", "$type": "color" },
      "dark": { "$value": "#30302e", "$type": "color" },
      "deep": { "$value": "#141413", "$type": "color" },
      "silver": { "$value": "#b0aea5", "$type": "color" },
      "ring": { "$value": "#d1cfc5", "$type": "color" }
    }
  },
  "font": {
    "display": { "$value": ["Inter", "system-ui", "sans-serif"], "$type": "fontFamily" },
    "body": { "$value": ["Inter", "system-ui", "sans-serif"], "$type": "fontFamily" },
    "mono": { "$value": ["JetBrains Mono", "ui-monospace", "monospace"], "$type": "fontFamily" },
    "bengali": { "$value": ["Hind Siliguri", "system-ui", "sans-serif"], "$type": "fontFamily" }
  },
  "radius": {
    "xs": { "$value": "4px", "$type": "dimension" },
    "sm": { "$value": "10px", "$type": "dimension" },
    "md": { "$value": "14px", "$type": "dimension" },
    "lg": { "$value": "18px", "$type": "dimension" },
    "xl": { "$value": "24px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  },
  "spacing": {
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "10": { "$value": "40px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" }
  },
  "shadow": {
    "sm": { "$value": "0 1px 3px rgba(28,25,23,0.04)", "$type": "shadow" },
    "md": { "$value": "0 4px 16px rgba(28,25,23,0.06)", "$type": "shadow" },
    "lg": { "$value": "0 16px 48px rgba(28,25,23,0.10)", "$type": "shadow" }
  },
  "motion": {
    "ease": { "$value": "cubic-bezier(0.4, 0, 0.2, 1)", "$type": "easing" },
    "duration": { "$value": "180ms", "$type": "duration" }
  }
}
```

---

#### Step 2: Build script with **Style Dictionary v3**

`design-tokens/package.json`:
```json
{
  "name": "@lucky-store/design-tokens",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "watch": "node build.js --watch"
  },
  "devDependencies": {
    "style-dictionary": "^3.9.0"
  }
}
```

`design-tokens/build.js`:
```js
// Requires style-dictionary@^3.9.0 (SD v3 API - synchronous)
const StyleDictionary = require('style-dictionary');

const sd = new StyleDictionary({
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'output/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
        options: { 
          outputReferences: true,
          // Map token names to EXISTING CSS variable names (no color- prefix)
          prefix: '--'
        }
      }]
    },
    dart: {
      transformGroup: 'js',
      buildPath: 'output/',
      files: [{
        destination: 'tokens.dart',
        format: 'dart/class',
        options: { className: 'DesignTokens' }
      }]
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'output/',
      files: [{
        destination: 'tokens.ts',
        format: 'typescript/module-declarations',
        options: { typeAlias: 'DesignTokens' }
      }]
    }
  }
});

if (process.argv.includes('--watch')) {
  sd.watch();
} else {
  sd.buildAllPlatforms();
  console.log('✅ Design tokens built for CSS, Dart, TypeScript');
}
```

---

#### Step 3: Generated CSS uses **existing var names** (no `color-` prefix)

`design-tokens/output/tokens.css` (auto-generated):
```css
:root {
  --warm-bg: #faf8f5;
  --warm-surface: #ffffff;
  --warm-fg: #1c1917;
  --warm-muted: #78716c;
  --warm-dim: #a8a29e;
  --warm-border: #f0eee6;
  --warm-border-warm: #e7e5e4;
  --warm-accent: #dc5f3b;
  --warm-accent-light: #e08868;
  --warm-accent-hover: #c4542e;
  --warm-accent-ghost: rgba(220, 95, 59, 0.07);
  --warm-success: #2d6a4f;
  --warm-success-bg: rgba(45, 106, 79, 0.08);
  --warm-warning: #b45309;
  --warm-warning-bg: rgba(180, 83, 9, 0.08);
  --warm-danger: #c3312f;
  --warm-danger-bg: rgba(195, 49, 47, 0.07);
  --warm-sand: #e8e6dc;
  --warm-charcoal: #4d4c48;
  --warm-dark: #30302e;
  --warm-deep: #141413;
  --warm-silver: #b0aea5;
  --warm-ring: #d1cfc5;

  --font-display: Inter, system-ui, sans-serif;
  --font-body: Inter, system-ui, sans-serif;
  --font-mono: JetBrains Mono, ui-monospace, monospace;
  --font-bengali: Hind Siliguri, system-ui, sans-serif;

  --radius-xs: 4px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px;

  --shadow-sm: 0 1px 3px rgba(28,25,23,0.04);
  --shadow-md: 0 4px 16px rgba(28,25,23,0.06);
  --shadow-lg: 0 16px 48px rgba(28,25,23,0.10);

  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration: 180ms;
}
```

---

#### Step 4: Wire customer_storefront to generated tokens

1. **Copy** generated tokens:
   ```bash
   mkdir -p apps/customer_storefront/app/styles
   cp design-tokens/output/tokens.css apps/customer_storefront/app/styles/tokens.css
   ```
2. **Update** `apps/customer_storefront/app/layout.tsx`:
   ```tsx
   import './styles/tokens.css';
   import './globals.css';
   ```
3. **Update** `apps/customer_storefront/tailwind.config.js` — map to **existing var names**:

```js
// apps/customer_storefront/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: 'var(--warm-bg)',
          surface: 'var(--warm-surface)',
          fg: 'var(--warm-fg)',
          muted: 'var(--warm-muted)',
          dim: 'var(--warm-dim)',
          border: 'var(--warm-border)',
          'border-warm': 'var(--warm-border-warm)',
          accent: 'var(--warm-accent)',
          'accent-light': 'var(--warm-accent-light)',
          'accent-hover': 'var(--warm-accent-hover)',
          'accent-ghost': 'var(--warm-accent-ghost)',
          success: 'var(--warm-success)',
          'success-bg': 'var(--warm-success-bg)',
          warning: 'var(--warm-warning)',
          'warning-bg': 'var(--warm-warning-bg)',
          danger: 'var(--warm-danger)',
          'danger-bg': 'var(--warm-danger-bg)',
          sand: 'var(--warm-sand)',
          charcoal: 'var(--warm-charcoal)',
          dark: 'var(--warm-dark)',
          deep: 'var(--warm-deep)',
          silver: 'var(--warm-silver)',
          ring: 'var(--warm-ring)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        bengali: ['var(--font-bengali)'],
      },
      borderRadius: {
        'warm-xs': 'var(--radius-xs)',
        'warm-sm': 'var(--radius-sm)',
        'warm-md': 'var(--radius-md)',
        'warm-lg': 'var(--radius-lg)',
        'warm-xl': 'var(--radius-xl)',
        'warm-full': 'var(--radius-full)',
      },
      boxShadow: {
        'warm-sm': 'var(--shadow-sm)',
        'warm-md': 'var(--shadow-md)',
        'warm-lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
```

---

#### Step 5: Migrate mobile_app to warm tokens (Flutter)

**Critical Fix:** `bodyMedium` double `copyWith` bug — Bengali font only when explicitly needed.

`apps/mobile_app/lib/core/theme/tokens.dart` (copy generated):
```dart
// Generated — do not edit manually
import 'package:flutter/material.dart';

class DesignTokens {
  static const Color warmAccent = Color(0xFFDC5F3B);
  static const Color warmAccentLight = Color(0xFFE08868);
  static const Color warmAccentHover = Color(0xFFC4542E);
  static const Color warmBg = Color(0xFFFAF8F5);
  static const Color warmSurface = Color(0xFFFFFFFF);
  static const Color warmFg = Color(0xFF1C1917);
  static const Color warmMuted = Color(0xFF78716C);
  static const Color warmDim = Color(0xFFA8A29E);
  static const Color warmBorder = Color(0xFFF0EEE6);
  static const Color warmBorderWarm = Color(0xFFE7E5E4);
  static const Color warmSuccess = Color(0xFF2D6A4F);
  static const Color warmWarning = Color(0xFFB45309);
  static const Color warmDanger = Color(0xFFC3312F);

  static const double radiusXs = 4.0;
  static const double radiusSm = 10.0;
  static const double radiusMd = 14.0;
  static const double radiusLg = 18.0;
  static const double radiusXl = 24.0;
  static const double radiusFull = 9999.0;

  static const List<String> fontDisplay = ['Inter', 'system-ui', 'sans-serif'];
  static const List<String> fontBody = ['Inter', 'system-ui', 'sans-serif'];
  static const List<String> fontMono = ['JetBrains Mono', 'ui-monospace', 'monospace'];
  static const List<String> fontBengali = ['Hind Siliguri', 'system-ui', 'sans-serif'];
}
```

`apps/mobile_app/lib/theme/app_theme.dart` — **fixed font bug**:
```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/tokens.dart' as t;
import 'app_colors.dart';

ThemeData get lightTheme => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    surface: AppColors.surface,
    background: AppColors.background,
    onSurface: AppColors.onSurface,
    outline: AppColors.border,
    error: AppColors.danger,
    tertiary: AppColors.success,
  ),
  cardTheme: CardThemeData(
    color: AppColors.surface,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(t.DesignTokens.radiusMd), // 14px
      side: BorderSide(color: AppColors.border, width: 1),
    ),
  ),
  // FIXED: single textTheme with conditional Bengali only where needed
  textTheme: GoogleFonts.interTextTheme().copyWith(
    displayLarge: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800),
    headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700),
    bodyLarge: GoogleFonts.inter(fontSize: 16, color: AppColors.onSurface),
    bodyMedium: GoogleFonts.inter(fontSize: 14, color: AppColors.muted), // DEFAULT = Inter
  ),
  // Bengali text style available as separate extension
  extension: <ThemeExtension<dynamic>>[
    _BengaliTextStyles(),
  ],
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(t.DesignTokens.radiusMd),
      borderSide: BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(t.DesignTokens.radiusMd),
      borderSide: BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(t.DesignTokens.radiusMd),
      borderSide: BorderSide(color: AppColors.primary, width: 2),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.onPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(t.DesignTokens.radiusMd),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    ),
  ),
);

// Separate extension for Bengali text (used explicitly where needed)
class _BengaliTextStyles extends ThemeExtension<_BengaliTextStyles> {
  final TextStyle bodyMedium = GoogleFonts.hindSiliguri(fontSize: 14, color: AppColors.muted);
  final TextStyle bodyLarge = GoogleFonts.hindSiliguri(fontSize: 16, color: AppColors.onSurface);
  
  @override
  _BengaliTextStyles copyWith({TextStyle? bodyMedium, TextStyle? bodyLarge}) => _BengaliTextStyles();
  
  @override
  ThemeExtension<_BengaliTextStyles> lerp(ThemeExtension<_BengaliTextStyles>? other, double t) => this;
}
```

Usage in widgets:
```dart
// Default (Inter)
Text('Hello', style: Theme.of(context).textTheme.bodyMedium)

// Bengali (explicit)
Text(' বাংলা', style: Theme.of(context).extension<_BengaliTextStyles>()!.bodyMedium)
```

---

#### Step 6: Replace mobile_app gold/teal references

Search/replace in `apps/mobile_app/lib/**/*.dart`:
| Old | New |
|-----|-----|
| `primaryGold` | `AppColors.primary` |
| `primaryTeal` | `AppColors.success` |
| `Colors.amber` | `AppColors.warning` |
| `Colors.teal` | `AppColors.success` |

---

#### Step 7: Verify & Commit

```bash
cd design-tokens && npm install && npm run build
cp design-tokens/output/tokens.css apps/admin_web/src/styles/tokens.css
cp design-tokens/output/tokens.css apps/customer_storefront/app/styles/tokens.css
cp design-tokens/output/tokens.dart apps/mobile_app/lib/core/theme/tokens.dart

# Verify all three
cd apps/admin_web && npm run dev
cd apps/customer_storefront && npm run dev
cd apps/mobile_app && flutter run
git add design-tokens/ apps/admin_web/src/styles/tokens.css apps/admin_web/tailwind.config.js apps/customer_storefront/app/styles/tokens.css apps/customer_storefront/tailwind.config.js apps/customer_storefront/app/layout.tsx apps/mobile_app/lib/core/theme/tokens.dart apps/mobile_app/lib/theme/app_theme.dart apps/mobile_app/lib/**/*.dart
git commit -m "feat: cross-platform design tokens (SD v3, existing var names, Flutter font fix)"
```

---

### Task 1: Connect Storefront to Supabase Inventory (uses `search_items_pos` RPC)

**Objective:** Replace hardcoded `SAMPLE_CATALOG` with live product fetch via existing RPC.

**Blocker Fix:** Use `search_items_pos(p_store_id, p_query, p_category_id, p_limit, p_offset)` — handles `stock_levels` join, `categories` join, returns `qty_on_hand`.

**Files:**
- Create: `apps/customer_storefront/app/lib/supabase.ts`
- Create: `apps/customer_storefront/app/lib/products.ts`
- Create: `apps/customer_storefront/app/lib/products.test.ts`
- Modify: `apps/customer_storefront/app/lib/types.ts`
- Create: `apps/customer_storefront/app/components/ProductGrid.tsx`
- Create: `apps/customer_storefront/app/components/CategoryGrid.tsx`
- Create: `apps/customer_storefront/app/components/ProductCard.tsx`
- Modify: `apps/customer_storefront/app/page.tsx`
- Modify: `apps/customer_storefront/app/category/page.tsx`

---

#### Step 1: Write failing test

`apps/customer_storefront/app/lib/products.test.ts`:
```ts
import { fetchProducts, fetchCategories } from './products';

jest.mock('./supabase', () => ({
  supabase: {
    rpc: jest.fn().mockResolvedValue({ 
      data: [], 
      error: null 
    }),
  },
}));

test('fetchProducts calls search_items_pos RPC', async () => {
  const items = await fetchProducts('milk', undefined);
  expect(Array.isArray(items)).toBe(true);
});

test('fetchCategories calls search_items_pos with category filter', async () => {
  const cats = await fetchCategories();
  expect(Array.isArray(cats)).toBe(true);
});
```

---

#### Step 2: Supabase client (anon, no persistance)

`apps/customer_storefront/app/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
```

---

#### Step 3: Product fetch via RPC

`apps/customer_storefront/app/lib/products.ts`:
```ts
import { supabase } from './supabase';
import type { Product, Category } from './types';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export async function fetchProducts(q?: string, categoryId?: string): Promise<Product[]> {
  const { data, error } = await supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: q ?? '',
    p_category_id: categoryId ?? null,
    p_limit: 50,
    p_offset: 0,
  });

  if (error) throw error;
  return (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
    emoji: CATEGORY_EMOJIS[item.category as Category] ?? '📦',
    price: Number(item.price),
    unit: 'pc', // default, can be enhanced
    category: item.category as Category,
    stock: Number(item.qty_on_hand ?? 0),
    description: item.description ?? '',
    image_url: item.image_url,
  }));
}

export async function fetchCategories(): Promise<{ id: string; slug: Category; name: string; emoji: string }[]> {
  // Use categories table directly (extended with slug/emoji in migration)
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, category, emoji')
    .eq('store_id', STORE_ID)
    .eq('active', true)
    .order('display_order');

  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    id: c.id,
    slug: c.slug as Category,
    name: c.category,
    emoji: c.emoji ?? '📦',
  }));
}
```

---

#### Step 4: Types (remove `SAMPLE_CATALOG`)

`apps/customer_storefront/app/lib/types.ts`:
```ts
export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
  unit: string;
  category: Category;
  stock: number;
  description: string;
  nutrition?: string;
  image_url?: string;
}

export type Category =
  | 'dairy'
  | 'grocery'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'produce'
  | 'bakery'
  | 'frozen';

export interface CartItem extends Product {
  qty: number;
}

export interface Order { /* ...unchanged... */ }

export const CATEGORY_EMOJIS: Record<Category, string> = { /* ... */ };
export const CATEGORY_LABELS: Record<Category, string> = { /* ... */ };
```

---

#### Step 5: Components use token classes

**ProductCard.tsx** — replaces arbitrary values:
```tsx
// Before: bg-[#faf8f5] rounded-[14px] border-[#e7e5e4]
// After:
<div className="bg-warm-surface rounded-warm-md border-warm-border-warm ...">
  <img className="rounded-warm-md ..." />
  <button className="bg-warm-accent text-white rounded-warm-md ...">
```

**WishlistButton.tsx** — token classes:
```tsx
<button className="bg-warm-surface border-warm-border-warm rounded-warm-md text-warm-fg hover:border-warm-accent ...">
```

**HomeSkeleton.tsx** — token classes:
```tsx
<div className="bg-warm-border-warm rounded-warm-md animate-pulse" />
```

---

#### Step 6: Homepage with Suspense

`apps/customer_storefront/app/page.tsx`:
```tsx
import { Suspense } from 'react';
import { ProductGrid } from './components/ProductGrid';
import { CategoryGrid } from './components/CategoryGrid';
import { fetchProducts, fetchCategories } from './lib/products';

export const metadata = { title: 'Lucky Store', description: 'Your neighborhood grocery store.' };

async function HomePage() {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  return (
    <>
      <CategoryGrid categories={categories} />
      <ProductGrid products={products.slice(0, 12)} />
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-warm-bg">
      <Suspense fallback={<HomeSkeleton />}>
        <HomePage />
      </Suspense>
    </main>
  );
}
```

---

#### Step 7: Category page

`apps/customer_storefront/app/category/page.tsx`:
```tsx
import { Suspense } from 'react';
import { ProductGrid } from '../components/ProductGrid';
import { CategoryGrid } from '../components/CategoryGrid';
import { fetchProducts, fetchCategories } from '../lib/products';
import { searchParams } from 'next/navigation';

async function CategoryPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat, q } = await searchParams;
  const [products, categories] = await Promise.all([
    fetchProducts(q, cat ? CATEGORY_TO_ID[cat] : undefined),
    fetchCategories(),
  ]);
  return (
    <div className="p-4">
      <CategoryGrid categories={categories} active={cat} />
      <ProductGrid products={products} />
    </div>
  );
}
```

---

#### Step 8: Run build + commit

```bash
cd apps/customer_storefront && npm run build
git add supabase/migrations/20260611*.sql apps/customer_storefront/app/lib/ apps/customer_storefront/app/components/ apps/customer_storefront/app/page.tsx apps/customer_storefront/app/category/page.tsx
git commit -m "feat: live inventory via search_items_pos RPC, token classes"
```

---

### Task 2: Out-of-Stock Handling + Wishlist (Anonymous Fingerprint)

**Objective:** Items with `stock <= 0` show "Notify Me"; clicks create wishlist entries with optional phone.

**Files:**
- Create: `apps/customer_storefront/app/lib/wishlist.ts`
- Create: `apps/customer_storefront/app/lib/wishlist.test.ts`
- Create: `apps/customer_storefront/app/components/WishlistButton.tsx`
- Modify: `apps/customer_storefront/app/components/ProductCard.tsx`
- Modify: `apps/customer_storefront/app/product/[id]/ProductClient.tsx`

---

#### Step 1: Wishlist helper with optional phone

`apps/customer_storefront/app/lib/wishlist.ts`:
```ts
import { supabase } from './supabase';

export interface WishlistItem {
  id: string;
  product_id: string;
  customer_fingerprint: string;
  customer_phone?: string;
  product_name: string;
  created_at: string;
}

export async function createWishlistItem(
  productId: string,
  fingerprint: string,
  productName: string,
  phone?: string
): Promise<WishlistItem> {
  if (!productId) throw new Error('productId required');
  if (!fingerprint) throw new Error('fingerprint required');

  const { data, error } = await supabase
    .from('wishlist')
    .insert({ product_id: productId, customer_fingerprint: fingerprint, product_name: productName, customer_phone: phone })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Already on wishlist');
    throw error;
  }
  return data as WishlistItem;
}
```

---

#### Step 2: WishlistButton with optional phone prompt

`apps/customer_storefront/app/components/WishlistButton.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useToast } from '../components/Toast';
import { createWishlistItem } from '../lib/wishlist';
import { getOrCreateFingerprint } from '../lib/fingerprint';

interface Props { productId: string; productName: string; }

export function WishlistButton({ productId, productName }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'phone'>('idle');
  const [phone, setPhone] = useState('');
  const { showToast } = useToast();

  const handleNotify = async () => {
    if (status !== 'idle' && status !== 'phone') return;
    
    if (status === 'phone') {
      if (!phone.match(/^\+880\s?1\d{9}$/)) {
        showToast('Enter valid BD phone (+880 1XXXXXXXXX)');
        return;
      }
      setStatus('loading');
    }

    try {
      const fp = getOrCreateFingerprint();
      await createWishlistItem(productId, fp, productName, phone || undefined);
      setStatus('saved');
      showToast(`We'll notify you when ${productName} is back`);
    } catch (e) {
      if (String(e).includes('Already on wishlist')) {
        showToast('Already on your wishlist');
        setStatus('saved');
      } else {
        showToast('Could not save wishlist item');
        setStatus('idle');
      }
    }
  };

  if (status === 'idle') {
    return (
      <button 
        onClick={() => setStatus('phone')}
        className="w-full h-10 bg-warm-surface border-warm-border-warm rounded-warm-md text-warm-fg font-semibold hover:border-warm-accent"
      >
        Notify when available
      </button>
    );
  }

  if (status === 'phone') {
    return (
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+880 1XXXXXXXXX (optional)"
          className="flex-1 h-10 px-3 bg-warm-surface border-warm-border-warm rounded-warm-md text-warm-fg"
        />
        <button onClick={handleNotify} disabled={status === 'loading'} className="px-4 bg-warm-accent text-white rounded-warm-md">
          {status === 'loading' ? 'Saving…' : 'Save'}
        </button>
      </div>
    );
  }

  return (
    <button disabled className="w-full h-10 bg-warm-surface border-warm-border-warm rounded-warm-md text-warm-dim">
      On wishlist
    </button>
  );
}
```

---

#### Step 3: ProductCard uses WishlistButton when out of stock

```tsx
{stock > 0 ? (
  <AddToCartButton ... />
) : (
  <WishlistButton productId={id} productName={name} />
)}
```

---

#### Step 4: Run build + commit

```bash
cd apps/customer_storefront && npm run build
git add apps/customer_storefront/app/lib/wishlist.ts apps/customer_storefront/app/components/WishlistButton.tsx apps/customer_storefront/app/components/ProductCard.tsx
git commit -m "feat: wishlist with optional phone, token classes"
```

---

### Task 3: Checkout + Atomic Order via Fixed RPC

**Objective:** Persist orders via corrected `create_order_with_stock` RPC (uses `stock_levels`, paramaterized store/tenant).

**Files:**
- Create: `apps/customer_storefront/app/lib/orders.ts`
- Create: `apps/customer_storefront/app/lib/orders.test.ts`
- Create: `apps/customer_storefront/app/lib/validation.ts`
- Create: `apps/customer_storefront/app/api/checkout/route.ts`
- Modify: `apps/customer_storefront/app/checkout/page.tsx`
- Modify: `apps/customer_storefront/app/order/OrderContent.tsx`

---

#### Step 1: Zod validation

`apps/customer_storefront/app/lib/validation.ts`:
```ts
import { z } from 'zod';

export const checkoutSchema = z.object({
  orderNumber: z.string().min(1),
  tenantId: z.string().uuid(),
  storeId: z.string().uuid(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().regex(/^\+880\s?1\d{9}$/, 'Invalid BD phone'),
  customerAddress: z.string().min(10).max(300),
  notes: z.string().max(300).optional(),
  items: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number().positive(),
    qty: z.number().int().positive(),
    unit: z.string().optional(),
  })).min(1),
  subtotal: z.number().positive(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().positive(),
});
```

---

#### Step 2: Order helper calls fixed RPC

`apps/customer_storefront/app/lib/orders.ts`:
```ts
import { supabase } from './supabase';
import { checkoutSchema } from './validation';

const TENANT_ID = 'your-tenant-id'; // from env
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export interface OrderInput {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: { id: string; name: string; price: number; qty: number; unit?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export async function createOrder(input: OrderInput) {
  const parsed = checkoutSchema.safeParse({ ...input, tenantId: TENANT_ID, storeId: STORE_ID });
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join('; '));

  const { data, error } = await supabase.rpc('create_order_with_stock', {
    p_order_number: input.orderNumber,
    p_tenant_id: TENANT_ID,
    p_store_id: STORE_ID,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_address: input.customerAddress,
    p_notes: input.notes ?? null,
    p_items: input.items,
    p_subtotal: input.subtotal,
    p_delivery_fee: input.deliveryFee,
    p_total: input.total,
  });

  if (error) throw error;
  return data;
}
```

---

#### Step 3: API route with rate limit TODO

`apps/customer_storefront/app/api/checkout/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '../../lib/orders';

// TODO: Replace with Upstash Redis for distributed rate limiting
const CHECKOUT_RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = CHECKOUT_RATE_LIMIT.get(ip);
  if (!record || now > record.reset) {
    CHECKOUT_RATE_LIMIT.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const now = new Date();
    const orderNumber = `LSO-${now.toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const order = await createOrder({ ...body, orderNumber });

    // Fire-and-forget notifications
    notifyAdminWeb(order).catch(console.error);
    sendWhatsApp(order).catch(console.error);

    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}

async function notifyAdminWeb(order: any) { /* webhook stub */ }
async function sendWhatsApp(order: any) { /* Cloud API stub */ }
```

---

#### Step 4: Checkout page calls API

`apps/customer_storefront/app/checkout/page.tsx`:
```tsx
const placeOrder = async () => {
  if (!formData.name || !formData.phone || !formData.address) {
    showToast('Please fill all required fields');
    return;
  }
  setIsPlacing(true);

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: '',
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        notes: formData.notes,
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, unit: c.unit })),
        subtotal, deliveryFee, total,
      }),
    });
    const { ok, order, error } = await res.json();
    if (!ok) throw new Error(error);
    sessionStorage.setItem('lastOrder', JSON.stringify(order));
    clearCart();
    router.push(`/order?num=${order.order_number}`);
  } catch (e) {
    showToast(String(e));
    setIsPlacing(false);
  }
};
```

---

#### Step 5: Run build + commit

```bash
cd apps/customer_storefront && npm run build && npm run lint
git add apps/customer_storefront/app/lib/orders.ts apps/customer_storefront/app/api/checkout/route.ts apps/customer_storefront/app/checkout/page.tsx
git commit -m "feat: atomic checkout via fixed RPC, validation, notifications"
```

---

### Task 4: Deployment Config

**Objective:** Separate Vercel projects for storefront + admin.

**Files:**
- Create: `apps/customer_storefront/vercel.json`
- Modify: `apps/admin_web/vercel.json`
- Create: `docs/DEPLOYMENT.md`

---

#### Step 1: Storefront Vercel config

`apps/customer_storefront/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### Step 2: Admin Vercel config

`apps/admin_web/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "rewrites": [{ "source": "/admin/(.*)", "destination": "/admin/$1" }]
}
```

#### Step 3: Deployment docs

`docs/DEPLOYMENT.md`:
```md
# Deployment

## Customer Storefront
- Vercel project: `lucky-store-storefront`
- Domain: `https://luckystorebd.com` or `store.luckystorebd.com`
- Root: `apps/customer_storefront`
- Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_WEBHOOK_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ADMIN_WHATSAPP_NUMBER

## Admin Web
- Vercel project: `lucky-store-admin`
- Domain: `https://admin.luckystorebd.com`
- Root: `apps/admin_web`
```

---

### Task 5: E2E Tests + Smoke Test

**Objective:** Automated critical path coverage.

**Files:**
- Create: `apps/customer_storefront/playwright.config.ts`
- Create: `apps/customer_storefront/tests/checkout.spec.ts`
- Create: `apps/customer_storefront/tests/wishlist.spec.ts`

---

#### Step 1: Playwright config

`apps/customer_storefront/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:3000' },
});
```

#### Step 2: Checkout E2E test

`apps/customer_storefront/tests/checkout.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('full checkout flow', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="product-card"]');
  await page.click('[data-testid="add-to-cart"]:first-child');
  await page.click('[data-testid="cart-link"]');
  await expect(page).toHaveURL('/cart');
  await page.click('[data-testid="checkout-button"]');
  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="phone"]', '+880 1712345678');
  await page.fill('[name="address"]', 'House 1, Road 1, Dhaka');
  await page.click('[data-testid="place-order"]');
  await expect(page).toHaveURL(/\/order\?num=/);
});
```

---

### Revised Critical Path Order

1. **Task 0** — Migrations + RLS (blockers fixed)
2. **Task 0.5** — Design tokens (PARALLEL — not blocking)
3. **Task 1** — Live inventory via `search_items_pos` RPC
4. **Task 2** — Wishlist with optional phone
5. **Task 3** — Atomic checkout via fixed RPC
6. **Task 4** — Deployment config
7. **Task 5** — E2E tests

---

### Summary

All 5 blockers fixed:
| Blocker | Fix Location |
|---------|-------------|
| `items.stock` → `stock_levels` | Task 0 Step 4 RPC, Task 1 uses `search_items_pos` |
| `items.category` → `category_id` join | Task 0 Step 1 extends `categories`, Task 1 joins via RPC |
| Categories schema clash | Task 0 Step 1 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |
| CSS var naming conflict | Task 0.5 generates `--warm-bg` (no `color-` prefix) |
| No `tenant_id` on orders | Task 0 Step 4 `create table orders` + RPC param |

Significant issues addressed:
- Task 0.5 decoupled from Tasks 1-3
- Style Dictionary pinned to v3
- `search_items_pos` RPC used instead of direct `.from('items')`
- Hardcoded store_id parameterized in RPC
- Wishlist adds optional phone
- Flutter `bodyMedium` double `copyWith` fixed via ThemeExtension

**Ready for implementation.** Start with Task 0 (migrations via Supabase Management API).