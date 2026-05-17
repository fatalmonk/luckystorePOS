# Lucky Store POS Flutter App — Full-Stack Overhaul Roadmap

> **Design System Reference:** See [UNIFIED_DESIGN_SYSTEM.md](docs/design-system/UNIFIED_DESIGN_SYSTEM.md) for cross-platform token alignment with Web Admin.

## Phase 0: Foundation & Architecture (Week 1)

### 0.1 Project Structure Refactor
```
lib/
├── core/
│   ├── theme/              # Unified light/dark theme system
│   │   ├── app_colors.dart   # Semantic tokens (primaryDefault, successDefault, etc.)
│   │   ├── app_text_styles.dart  # Hind Siliguri typography scale
│   │   ├── app_spacing.dart  # 4px base spacing scale
│   │   ├── app_radius.dart   # Border radius tokens
│   │   ├── app_shadows.dart  # Elevation tokens
│   │   └── app_theme.dart    # Light/dark ThemeData
│   ├── localization/       # English + Bengali (intl)
│   ├── constants/          # API endpoints
│   └── utils/              # Currency formatter (৳), debounce, validators
├── data/
│   ├── models/             # Product, Order, Customer, Supplier, Receipt
│   ├── repositories/       # Supabase CRUD + offline sync layer
│   └── services/           # Barcode scanner, printer, connectivity
├── presentation/
│   ├── screens/            # POS, Dashboard, Inventory, Purchase, Dues, Labels
│   ├── widgets/            # Reusable cards, buttons, search bars, empty states
│   └── providers/          # State management (Riverpod)
└── main.dart
```

### 0.2 Theme Unification (Cross-Platform Alignment)
**Reference:** [UNIFIED_DESIGN_SYSTEM.md](docs/design-system/UNIFIED_DESIGN_SYSTEM.md)

- **Decision:** Light theme primary (retail environments need brightness), dark theme optional
- **Primary color:** Gold `#E8B84B` (`AppColors.primaryDefault`) — matches Web Admin
- **Font:** Hind Siliguri (Bengali + Latin support) — matches Web Admin
- **Spacing:** 4px base scale (`--space-1` / `AppSpacing.space1`) — matches Web Admin
- **Radius:** 8px buttons, 12px cards, 16px modals — matches Web Admin
- **Elevation:** 3 shadow levels — matches Web Admin

**Implementation:**
```dart
// Use existing AppTheme in lib/theme/app_theme.dart
ThemeData light = AppTheme.lightTheme;  // Already configured
ThemeData dark = AppTheme.darkTheme;    // Already configured

// Access tokens consistently
Container(
  color: AppColors.surfaceDefault,
  padding: EdgeInsets.all(AppSpacing.space4),  // 16px
  decoration: BoxDecoration(
    borderRadius: AppRadius.borderMd,  // 12px
    boxShadow: [AppShadows.elevation2],
  ),
  child: Text('Title', style: AppTextStyles.headingMd),
)
```

**Fix:** Purchase screen currently hardcoded dark — migrate to `Theme.of(context)` with proper dark theme tokens.

### 0.3 Localization Setup (`flutter_localizations` + `intl`)
```dart
// l10n/app_en.arb
{
  "posTitle": "Point of Sale",
  "addToCart": "Add to Cart",
  "totalAmount": "Total Amount",
  "cashPayment": "Cash",
  "bkashPayment": "bKash",
  "cardPayment": "Card",
  "creditPayment": "Credit",
  "searchByNameOrSku": "Search by name or SKU",
  "inventory": "Inventory",
  "todaysSales": "Today's Sales",
  "lowStock": "Low Stock"
}

// l10n/app_bn.arb (Bengali)
{
  "posTitle": "বিক্রয় কেন্দ্র",
  "addToCart": "কার্টে যোগ করুন",
  "totalAmount": "মোট দাম",
  "cashPayment": "নগদ",
  "bkashPayment": "বিকাশ",
  "cardPayment": "কার্ড",
  "creditPayment": "বাকি",
  "searchByNameOrSku": "নাম বা SKU দিয়ে অনুসন্ধান করুন",
  "inventory": "পণ্য সম্ভার",
  "todaysSales": "আজকের বিক্রি",
  "lowStock": "কম স্টক"
}
```
- Add `LocaleProvider` with toggle in app header
- **Backend requirement:** `products` table needs `name_bn` column

### 0.4 Offline-First Sync Architecture
- **Local:** `sqflite` (via `drift`) for product cache, pending orders, queued sales
- **Sync layer:** Background worker (`workmanager`) pushes queued transactions to Supabase
- **Conflict resolution:** Last-write-wins for inventory, manual review for pricing conflicts
- **Dashboard metric source:** Count from local queue + Supabase sync status

---

## Phase 1: Critical POS Fixes (Week 1-2)

### 1.1 Fix Layout Overflow (P0)
**Root cause:** Right-side cart panel has fixed width exceeding screen bounds on smaller devices.

**Fix using Design System tokens:**
```dart
// pos_screen.dart
Row(
  children: [
    // Product grid — flexible
    Expanded(
      flex: 3,
      child: ProductGridView(...),
    ),
    // Cart panel — constrained + scrollable
    ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: min(380, MediaQuery.of(context).size.width * 0.4),
      ),
      child: SingleChildScrollView(
        child: CartPanel(...),
      ),
    ),
  ],
)
```
- Add `LayoutBuilder` for responsive breakpoints (<600px = cart becomes bottom sheet)
- Test on iPhone SE, iPhone 14 Pro Max, small Android devices
- **Ensure touch targets ≥40px** (Design System requirement)

### 1.2 Add Product Search (P0)
**Implementation using Design System:**
```dart
// widgets/product_search_bar.dart
TextField(
  onChanged: (query) => debounce(
    () => ref.read(productSearchProvider.notifier).search(query),
    duration: const Duration(milliseconds: 300),
  ),
  decoration: InputDecoration(
    hintText: AppLocalizations.of(context)!.searchByNameOrSku,
    hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
    prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
    suffixIcon: IconButton(
      icon: const Icon(Icons.qr_code_scanner, color: AppColors.primaryDefault),
      onPressed: () => _openBarcodeScanner(),
    ),
    filled: true,
    fillColor: AppColors.surfaceDefault,
    border: OutlineInputBorder(
      borderRadius: AppRadius.borderSm,
      borderSide: const BorderSide(color: AppColors.borderDefault),
    ),
  ),
)
```

**Supabase query:**
```sql
-- RPC function for fuzzy search
CREATE OR REPLACE FUNCTION search_products(store_id uuid, query text)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM products
  WHERE store_id = $1
    AND (
      name ILIKE '%' || $2 || '%'
      OR sku ILIKE '%' || $2 || '%'
      OR name_bn ILIKE '%' || $2 || '%'
    )
  ORDER BY name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Implement Payment Method Selector
**New screen:** `CheckoutScreen` (navigated from POS cart)

```dart
// checkout_screen.dart
Column(
  children: [
    PaymentMethodSelector(
      methods: [
        PaymentMethod.cash,
        PaymentMethod.bkash,
        PaymentMethod.card,
        PaymentMethod.credit,
      ],
      onSelected: (method) => ref.read(paymentMethodProvider.notifier).select(method),
    ),
    if (selectedMethod == PaymentMethod.bkash)
      BkashNumberInput(...),
    if (selectedMethod == PaymentMethod.credit)
      CustomerCreditSelector(...),
    TotalSummary(subtotal: cart.subtotal, tax: cart.tax, total: cart.total),
    ElevatedButton(
      onPressed: () => _processPayment(),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primaryDefault,
        foregroundColor: AppColors.primaryOn,
        padding: EdgeInsets.symmetric(
          horizontal: AppSpacing.space6,
          vertical: AppSpacing.space3,
        ),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderSm),
      ),
      child: Text(context.l10n.confirmPayment),
    ),
  ],
)
```

**Supabase `orders` table extension:**
```sql
ALTER TABLE orders ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'bkash', 'card', 'credit'));
ALTER TABLE orders ADD COLUMN payment_reference TEXT; -- bKash trx ID or card last-4
ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id); -- for credit tracking
```

---

## Phase 2: Inventory & Catalogue (Week 2-3)

### 2.1 Product Catalogue Grid
**New screen:** `InventoryCatalogueScreen` (replace current bulk-upload-only view)

**Features:**
- Grid/list toggle view
- Stock level badges using Design System semantic colors:
  - Green (`AppColors.successDefault`) >20
  - Yellow (`AppColors.warningDefault`) 5-20
  - Red (`AppColors.dangerDefault`) <5
- Category sidebar filter (tree view)
- Quick actions: edit stock, adjust price, toggle active/inactive
- Floating action button: "Add Product" + "Bulk Import" (existing)

```dart
// inventory_catalogue_screen.dart
class InventoryCatalogueScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(inventoryProductsProvider);
    final locale = ref.watch(localeProvider);
    
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDefault,
        title: Text(context.l10n.inventory, style: AppTextStyles.headingLg),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list, color: AppColors.textSecondary),
            onPressed: () => _showFilterSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.file_upload, color: AppColors.primaryDefault),
            onPressed: () => _showBulkImport(context),
          ),
        ],
      ),
      body: products.when(
        data: (list) => ProductCatalogueGrid(
          products: list,
          displayName: (p) => locale.languageCode == 'bn' ? p.nameBn : p.name,
          onTap: (p) => _openProductDetail(p),
        ),
        loading: () => const SkeletonGridLoader(),
        error: (e, _) => ErrorRetryWidget(
          message: e.toString(),
          onRetry: () => ref.refresh(inventoryProductsProvider),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddProduct(context),
        backgroundColor: AppColors.primaryDefault,
        icon: const Icon(Icons.add),
        label: Text('Add Product', style: AppTextStyles.labelLg.copyWith(
          color: AppColors.primaryOn,
        )),
      ),
    );
  }
}
```

### 2.2 Real-Time Inventory Tracking
**Supabase realtime setup:**
```dart
// repositories/inventory_repository.dart
final subscription = supabase
    .from('products')
    .stream(primaryKey: ['id'])
    .eq('store_id', storeId)
    .listen((data) {
      ref.read(inventoryProductsProvider.notifier).syncFromRemote(data);
    });
```

**Offline queue for stock adjustments:**
```dart
// When user edits stock locally
await localDb.insertPendingStockAdjustment({
  'product_id': productId,
  'quantity_delta': delta,
  'reason': 'manual_count',
  'timestamp': DateTime.now().toIso8601String(),
  'synced': false,
});
// Background sync pushes to Supabase, updates `updated_at` trigger
```

### 2.3 Product Add/Edit Form
```dart
class ProductForm extends StatelessWidget {
  final Product? existing; // null = create
  
  // Fields: name, name_bn, sku, category_id, unit_price, cost_price, 
  //         stock_quantity, min_stock_level, barcode, image_upload
}
```
- Image upload to Supabase Storage bucket `product-images`
- Barcode generation if empty, scan to auto-fill

---

## Phase 3: Barcode & Scanning (Week 3)

### 3.1 Barcode Scanner Integration
**Package:** `mobile_scanner` (ML Kit, supports QR + 1D barcodes)

```dart
// widgets/barcode_scanner_overlay.dart
class BarcodeScannerScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDefault,
        title: Text('Scan Barcode', style: AppTextStyles.headingLg),
      ),
      body: MobileScanner(
        onDetect: (barcodeCapture) {
          final code = barcodeCapture.barcodes.first.rawValue;
          if (code != null) {
            Navigator.pop(context, code);
          }
        },
        overlay: const ScannerOverlay(), // Custom painter with corner brackets
      ),
    );
  }
}
```

**Usage flows:**
1. **POS search:** Tap QR icon → scan → auto-add to cart if found, else show "Product not found" with quick-create option
2. **Inventory:** Scan to pull up product detail for stock adjustment
3. **Purchase receipt:** Scan to auto-fill item row

### 3.2 Barcode Label Printing
**Package:** `flutter_bluetooth_serial` or `esc_pos_utils` for thermal printers
- Generate barcode images from SKU using `barcode` package
- Print product labels from Inventory screen (connects to dashboard "Labels" tab)

---

## Phase 4: Dashboard & Analytics (Week 3-4)

### 4.1 Wire Dashboard Cards to Real Data
**Supabase RPC functions for aggregations:**
```sql
-- Today's sales
CREATE OR REPLACE FUNCTION get_today_sales(store_id uuid)
RETURNS TABLE(total_sales numeric, order_count int) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)::int
  FROM orders
  WHERE store_id = $1
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Low stock count
CREATE OR REPLACE FUNCTION get_low_stock_count(store_id uuid)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::int FROM products
    WHERE store_id = $1 AND stock_quantity <= min_stock_level
  );
END;
$$ LANGUAGE plpgsql;

-- Sync status
CREATE OR REPLACE FUNCTION get_sync_status(store_id uuid)
RETURNS TABLE(
  synced_today int,
  failed_syncs int,
  queued_sales int,
  oldest_pending_age interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::int FROM sync_logs WHERE store_id = $1 AND status = 'success' AND created_at >= CURRENT_DATE),
    (SELECT COUNT(*)::int FROM sync_logs WHERE store_id = $1 AND status = 'failed' AND created_at >= CURRENT_DATE),
    (SELECT COUNT(*)::int FROM pending_orders WHERE store_id = $1),
    (SELECT NOW() - MIN(created_at) FROM pending_orders WHERE store_id = $1);
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Dashboard UI Polish using Design System
```dart
// dashboard_screen.dart
class DashboardScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metrics = ref.watch(dashboardMetricsProvider);
    
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dashboardMetricsProvider.future),
        child: ListView(
          padding: EdgeInsets.all(AppSpacing.space4),
          children: [
            MetricsGrid(
              children: [
                MetricCard(
                  title: context.l10n.todaysSales,
                  value: metrics.todaysSales,
                  icon: Icons.payments,
                  color: AppColors.successDefault,
                  format: (v) => '৳${NumberFormat('#,##0').format(v)}',
                ),
                MetricCard(
                  title: context.l10n.lowStock,
                  value: metrics.lowStockCount,
                  icon: Icons.warning_amber,
                  color: metrics.lowStockCount > 0 
                    ? AppColors.dangerDefault 
                    : AppColors.textMuted,
                  onTap: metrics.lowStockCount > 0 
                    ? () => _navigateToLowStockInventory(context) 
                    : null,
                ),
                // ... remaining cards
              ],
            ),
            SizedBox(height: AppSpacing.space6),
            RecentActivityList(orders: metrics.recentOrders),
          ],
        ),
      ),
    );
  }
}
```

---

## Phase 5: Dues & Credit Management (Week 4)

### 5.1 Customer Credit Tracking
**Supabase schema:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  name TEXT NOT NULL,
  phone TEXT,
  total_credit DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  status TEXT CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Dues Screen Implementation
- Searchable customer list with outstanding balance
- Tap customer → see due history + record payment
- Payment recording updates `customer_dues` and creates a `due_payments` row
- Overdue highlighting using `AppColors.dangerDefault` badge if past `due_date`

---

## Phase 6: Purchase Receipt Polish (Week 4)

### 6.1 Theme Consistency
- Migrate Purchase screen to use shared `AppTheme` instead of hardcoded dark colors
- Maintain dark mode option but derive from `Theme.of(context)`
- Use Design System tokens: `AppColors.surfaceDefault`, `AppColors.textPrimary`, etc.

### 6.2 Receipt Posting Flow
- Validate: supplier selected, at least 1 item, payment ≤ total cost
- On post: insert `purchase_orders` + `purchase_order_items`, update `products.stock_quantity` via trigger
- Print receipt via thermal printer (esc/pos commands)
- Generate PDF backup using `pdf` + `printing` packages

---

## Phase 7: Testing & Deployment (Week 5)

### 7.1 Testing Matrix
| Test | Method |
|------|--------|
| Overflow on iPhone SE (375px width) | Simulator + real device |
| Bengali text rendering | Check `name_bn` with complex Unicode |
| Offline sync queue | Airplane mode → add sale → reconnect → verify sync |
| Barcode scan speed | 10 products/minute target |
| Payment flow end-to-end | Mock bKash API + real cash transactions |
| Dashboard real-time updates | Two devices, same store, simultaneous sales |
| **Design System consistency** | Compare colors/spacing with Web Admin |

### 7.2 Design System Consistency Checklist
Before shipping, verify:
- [ ] Colors match Web Admin (Gold primary `#E8B84B`)
- [ ] Typography uses Hind Siliguri consistently
- [ ] Spacing follows 4px scale (`AppSpacing.space1-16`)
- [ ] Border radius matches (`AppRadius.borderSm/Md/Lg`)
- [ ] Elevation shadows match Web (`AppShadows.elevation1-3`)
- [ ] Dark theme uses same surface colors as Web
- [ ] Bengali text renders correctly in both themes

### 7.3 Supabase RLS (Row Level Security)
```sql
-- Ensure store isolation
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_products ON products
  FOR ALL USING (store_id = auth.uid()::uuid); -- or jwt claim
```

### 7.4 Performance
- Product grid pagination: 20 items/page with `supabase.range()`
- Image caching: `cached_network_image` with 7-day TTL
- Debounce search: 300ms to reduce Supabase RPC calls

---

## Implementation Order Summary

| Week | Focus | Deliverables |
|------|-------|-------------|
| **1** | Foundation | Theme system aligned with Web Admin, localization scaffold, offline sync layer |
| **1-2** | POS critical | Overflow fix, search bar, checkout with 4 payment methods |
| **2-3** | Inventory | Catalogue grid, product CRUD, real-time stock badges |
| **3** | Scanning | Barcode scanner, auto-add to cart/purchase, label printing |
| **3-4** | Dashboard | RPC aggregations, wired metric cards, recent activity |
| **4** | Dues + Purchase | Customer credit tracking, receipt posting, theme unify |
| **5** | QA + Deploy | Device testing, RLS audit, Play Store / TestFlight |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Riverpod** over Bloc | Less boilerplate, built-in caching, good for reactive dashboard |
| **Supabase RPC** over client-side filtering | Faster aggregations, less bandwidth on mobile |
| **sqflite** over Hive for inventory | Relational data (products, categories, stock) fits SQL better |
| **mobile_scanner** over flutter_barcode_scanner | ML Kit is faster, better low-light performance for retail |
| **Light theme default** | Retail staff work under fluorescent lighting; dark screens cause glare |
| **Design System tokens** | Ensures visual consistency with Web Admin app |

---

## Cross-Platform Alignment

| Element | Web Admin | Mobile App |
|---------|-----------|------------|
| **Primary Color** | `#E8B84B` | `AppColors.primaryDefault` |
| **Font Family** | Hind Siliguri | Hind Siliguri |
| **Spacing Base** | 4px | 4px (`AppSpacing.space1`) |
| **Card Radius** | 12px | `AppRadius.borderMd` (12px) |
| **Button Radius** | 8px | `AppRadius.borderSm` (8px) |
| **Elevation 1** | `0px 1px 3px rgba(15,23,42,0.08)` | `AppShadows.elevation1` |
| **Success Color** | `#22C55E` | `AppColors.successDefault` |
| **Danger Color** | `#EF4444` | `AppColors.dangerDefault` |

**Estimated total effort:** 4-5 weeks for one senior Flutter dev + Supabase backend support. The critical path is POS stability (overflow + search) — everything else can ship incrementally.
