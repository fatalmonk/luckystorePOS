# Lucky Store POS Flutter
Stack: Flutter, Dart, Supabase, sqflite, Riverpod
Current: CartPanel, ProductGridItem, CheckoutDialog widgets created
Done: 
  - pos_screen.dart with proper provider architecture
  - PosSearchProvider extracted to dedicated file
  - AppBreakpoints for responsive design constants
  - FavoritesRow widget with onTap handler
  - main.dart updated with PosSearchProvider registration
  - cart_panel.dart with qty controls, totals, checkout button, sync badge
  - product_grid_item.dart with MRP strikethrough, stock badge, add button
  - checkout_dialog.dart with cash tendered, change calculation
Blockers: None
Next: Test POS screen with new widgets

# Lucky Store POS - Implementation Context

## Current Status: Phase 1.2 Complete

### Completed Tasks
1. **Phase 0: Foundation**
   - Theme audit complete
   - l10n files (en, bn)
   - LocaleProvider, ThemeProvider

2. **Phase 1.1: POS Layout Overflow Fix**
   - @[apps/mobile_app/lib/features/pos/presentation/screens/pos_main_screen.dart]
   - Changed Expanded to Flexible + ConstrainedBox
   - Added minWidth constraints (left: 200-320px, right: 180-280px)
   - Responsive top bar (<400px hides cashier icon)

3. **Phase 1.2: POS Screen Architecture Fix**
   - @[apps/mobile_app/lib/features/pos/presentation/screens/pos_screen.dart]
   - @[apps/mobile_app/lib/features/pos/presentation/providers/pos_search_provider.dart]
   - @[apps/mobile_app/lib/core/theme/app_breakpoints.dart]
   - @[apps/mobile_app/lib/features/pos/presentation/widgets/favorites_row.dart]
   - Extracted posSearchProvider to dedicated ChangeNotifier
   - Replaced client-side filtering with provider-managed state
   - Added AppBreakpoints constants (smallPhone, phone, tablet, largeTablet, desktop)
   - Created FavoritesRow widget with proper onTap handler
   - Updated main.dart with PosSearchProvider registration
   - Uses Selector for granular rebuilds

### Commits
- [15de1aa]: Phase 0 - Foundation
- [976e03c]: Phase 1.1 - Layout overflow fix
- [pending]: Phase 1.2 - POS architecture fix

### Next: Phase 1.3
Add ProductSearchBar widget with debounce
