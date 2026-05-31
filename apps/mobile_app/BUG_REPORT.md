# Lucky Store POS Flutter — Comprehensive Bug Report

**Date:** 2026-05-31  
**Files reviewed:** ~140 source + test files  
**Total bugs found:** 82  
| Critical | Important | Nit |
|----------|-----------|-----|
| 14 | 46 | 22 |

---

## Critical (Blocks merge / Security / Crash)

### C1 — `totalAmount` ignores cart-level discount
- **File:** `lib/shared/providers/pos_provider.dart:116`
- **Bug:** Getter returns `subtotal` directly, ignoring `_cartDiscount`. Cashier applies discount → customer charged full price.
- **Fix:** `double get totalAmount => subtotal - _cartDiscount;`

### C2 — Service role key shipped in mobile binary
- **File:** `lib/core/network/network_config.dart:12,27–30`
- **Bug:** `supabaseServiceKey` exposed as static getter. Sent in `adminHeaders`. Super-admin privileges in every APK/IPA.
- **Fix:** Remove from app. Route admin ops through authenticated edge fn.

### C3 — Manager credentials auto-bootstrapped from `.env`
- **File:** `lib/shared/providers/auth_provider.dart:64–70`
- **Bug:** `MANAGER_EMAIL`/`MANAGER_PASSWORD` read from `.env` and auto-sign-in. Anyone with APK can extract.
- **Fix:** Remove bootstrap. Require manual PIN every time.

### C4 — Background sync crashes (Supabase not init'd in isolate)
- **File:** `lib/offline/manager.dart:9–13`
- **Bug:** `callbackDispatcher` calls `Supabase.instance.client` without `Supabase.initialize()`. Background sync always throws.
- **Fix:** Init Supabase inside `callbackDispatcher` with url + anonKey before using client.

### C5 — Background sync hardcodes `complete_sale` for all action types
- **File:** `lib/offline/manager.dart:26–28`
- **Bug:** Worker always calls `complete_sale` RPC regardless of `SyncActionType` (insert/update/delete). Stock adjustments submitted as sales.
- **Fix:** Switch on `actionType` and call correct RPC.

### C6 — `completeSale` `firstWhere` crash on cart/snapshot mismatch
- **File:** `lib/shared/providers/pos_provider.dart:397`
- **Bug:** `_cart.firstWhere((c) => c.item.id == s.productId)` throws `StateError` if item removed from cart after snapshot frozen. Crashes mid-transaction.
- **Fix:** Add `orElse: () => throw Exception('Item ${s.productId} missing from cart')`.

### C7 — `CustomerPhoneLookup` memory leak (no dispose)
- **File:** `lib/features/pos/customer_lookup.dart:22–23`
- **Bug:** `TextEditingController` + `FocusNode` created but `dispose()` never overridden. Leaks on every POS open/close.
- **Fix:** Override `dispose()`, call `.dispose()` on both.

### C8 — Malformed network printer endpoint URL
- **File:** `lib/core/services/printer/printer_service.dart:87`
- **Bug:** `http://$ipAddress:$port/${PortConfig.defaultPort}` appends port again as path segment.
- **Fix:** `endpoint = 'http://$ipAddress:$port/';`

### C9 — Double `_totalPrintAttempts` increment corrupts metrics
- **File:** `lib/core/services/printer/printer_service.dart:193,396–405`
- **Bug:** Caller increments, then `_updateAveragePrintTime` increments again. `successRate` and `_averagePrintTime` wrong.
- **Fix:** Remove `_totalPrintAttempts++` from `_updateAveragePrintTime`.

### C10 — Print retry queue completely non-functional
- **File:** `lib/core/services/printer/print_retry_queue.dart:342–356`
- **Bug:** `_createPrinterService()` → `_importPrinterService()` unconditionally throws `UnsupportedError`. Auto-retry never works.
- **Fix:** Refactor circular dependency. Pass `PrinterService` factory into queue constructor.

### C11 — `file_picker` API compile-time error
- **File:** `lib/features/inventory/presentation/screens/file_picker_mobile.dart:8`
- **Bug:** `FilePicker.pickFiles(...)` — v11 requires `FilePicker.platform.pickFiles(...)`.
- **Fix:** Replace with `FilePicker.platform.pickFiles(...)`.

### C12 — `BarcodeListener` `RangeError` on backspace with empty buffer
- **File:** `lib/features/pos/presentation/screens/barcode_listener.dart:51–52`
- **Bug:** `_buffer.substring(0, _buffer.length - 1)` when `_buffer` is empty throws `RangeError`.
- **Fix:** Guard: `if (_buffer.isNotEmpty) _buffer = _buffer.substring(0, _buffer.length - 1);`

### C13 — `PosMainScreen` negative panel width on narrow screens
- **File:** `lib/features/pos/presentation/screens/pos_main_screen.dart:171`
- **Bug:** `leftPanelWidth = availableWidth - rightPanelWidth - 1`. If screen < 321px (rightPanel=320), width goes negative → layout crash.
- **Fix:** `max(availableWidth - rightPanelWidth - 1, 0)` or clamp rightPanelWidth.

### C14 — `CartItem.lineTotal` allows negative values
- **File:** `lib/models/pos_models.dart:80`
- **Bug:** `(item.price - discount) * qty` negative if `discount > item.price`. Refund disguised as discount.
- **Fix:** Validate `discount <= item.price` in `setLineDiscount`.

---

## Important (Reliability / Data consistency / UX)

### I1 — `ThemeMode.values[themeIndex]` can throw `RangeError`
- **File:** `lib/core/providers/theme_provider.dart:22–23`
- **Fix:** `final safeIndex = themeIndex.clamp(0, ThemeMode.values.length - 1);`

### I2 — `BaseService.isInitialized` permanently `false`
- **File:** `lib/core/services/base_service.dart:14–16`
- **Fix:** Change `_initialized` to non-final, provide protected setter.

### I3 — `CsvImportService` not re-entrant
- **File:** `lib/core/services/csv_import_service.dart:20–24`
- **Bug:** Mutable instance fields. Overlapping `parseCsv` calls corrupt results.
- **Fix:** Move mutable state into local vars inside `parseCsv`.

### I4 — CSV delimiter detection fails on `\r\n`
- **File:** `lib/core/services/csv_import_service.dart:181–186`
- **Fix:** Normalize line endings first: `content.replaceAll('\r\n', '\n').replaceAll('\r', '\n')`.

### I5 — CSV price regex strips minus signs
- **File:** `lib/core/services/csv_import_service.dart:297`
- **Bug:** `RegExp(r'[^\d.]')` strips `-`. Negative price `-10` → `10`.
- **Fix:** `RegExp(r'[^\d.-]')` then validate sign.

### I6 — `formatCurrency` accepts `int` but POS prices are `double`
- **File:** `lib/core/utils/app_utils.dart:83–88`
- **Fix:** Change signature to `double`, use `toStringAsFixed(2)`.

### I7 — `isEndOfDay` returns `true` for any past date
- **File:** `lib/core/utils/app_utils.dart:104–110`
- **Fix:** Add `date == today` check before time comparison.

### I8 — `NetworkConfig.defaultHeaders` uses anon key as Bearer
- **File:** `lib/core/network/network_config.dart:21–24`
- **Bug:** `Authorization: Bearer <anon-key>` is wrong. RLS sees anon role, denies access.
- **Fix:** Remove static headers; construct per-request with current session JWT.

### I9 — `SystemHealthMonitor` uses `stores` table for connectivity
- **File:** `lib/shared/services/system_health_service.dart:68–73`
- **Bug:** RLS on `stores` may deny access, falsely reporting no connectivity.
- **Fix:** Use no-RLS RPC (e.g., `rpc('health')`).

### I10 — `InventoryService` uses anon key as Bearer
- **File:** `lib/features/inventory/inventory_service.dart:100–103,138–142`
- **Fix:** Use current Supabase session `accessToken`.

### I11 — `deductStock` not atomic with audit logging
- **File:** `lib/features/inventory/inventory_repository.dart:32–67`
- **Bug:** Stock deducted, then audit throws → no audit trail.
- **Fix:** Wrap in local DB transaction or move audit to server RPC.

### I12 — `validateStock` makes sequential RPC calls (N+1)
- **File:** `lib/features/inventory/inventory_repository.dart:159–180`
- **Fix:** Batch validate via `rpc('validate_stock_batch', params: {...})`.

### I13 — `hasSufficientStock` returns `false` on network error
- **File:** `lib/features/inventory/inventory_repository.dart:88–98`
- **Bug:** Network down → blocks sales even when stock available.
- **Fix:** Distinguish `NetworkException` (allow with warning) from actual stock shortage.

### I14 — `completeSale` edge-function rejects multi-tender
- **File:** `lib/shared/providers/pos_provider.dart:511–532`
- **Bug:** Throws `Exception('edge_function_single_tender_only')` for split payments. Unhandled exception.
- **Fix:** Remove exception; skip edge fn when `tenders.length > 1`.

### I15 — `voidSale` / `processRefund` no error handling
- **File:** `lib/shared/providers/pos_provider.dart:602–616`
- **Bug:** `await _supabase.rpc(...)` without try/catch. Crashes UI on error.
- **Fix:** Wrap in try/catch, return `Result<>`.

### I16 — `recordCashClosing` resolves `tenantId` inconsistently
- **File:** `lib/shared/providers/pos_provider.dart:680`
- **Bug:** Reads from `userMetadata` (may be null) while elsewhere reads from `users` table.
- **Fix:** Always resolve from `users` table, cache in provider.

### I17 — `handleScannerKeypress` 100ms too aggressive
- **File:** `lib/shared/providers/pos_provider.dart:840–858`
- **Bug:** 100ms timeout too fast for some BT scanners. `_scanBuffer` unbounded.
- **Fix:** Increase to 300–500ms; cap buffer at 128 chars.

### I18 — `searchParties` doesn't escape SQL wildcards
- **File:** `lib/shared/providers/pos_provider.dart:587–598`
- **Bug:** `query` with `%` or `_` changes search semantics.
- **Fix:** Escape wildcards: `query.replaceAll('%', r'\%').replaceAll('_', r'\_')`.

### I19 — `searchItems` / `loadCategories` silent failure
- **File:** `lib/shared/providers/pos_provider.dart:713–749`
- **Bug:** Returns `[]` on any error. UI shows "No products" instead of error.
- **Fix:** Rethrow or return `Result<>` so caller shows error banner.

### I20 — `PosItem.fromJson` crashes on null required fields
- **File:** `lib/models/pos_models.dart:47–51`
- **Bug:** `as String` / `as num` without null fallback. Server returns null → crash.
- **Fix:** Use `(json['sku'] as String?) ?? ''` or skip item.

### I21 — `PosSession.fromJson` `DateTime.parse` without fallback
- **File:** `lib/models/pos_models.dart:271`
- **Bug:** `FormatException` on unexpected date format.
- **Fix:** `DateTime.tryParse(...) ?? DateTime.now()`.

### I22 — `SaleTransactionIntent/Snapshot.fromJson` same DateTime issue
- **File:** `lib/models/sale_transaction_snapshot.dart:91,176`
- **Fix:** `DateTime.tryParse` everywhere.

### I23 — `Party.fromJson` requires non-null `tenant_id`/`type`
- **File:** `lib/models/party.dart:24–26`
- **Fix:** Add fallback values or null checks.

### I24 — `AuthProvider` has no auth-state listener
- **File:** `lib/shared/providers/auth_provider.dart`
- **Bug:** Session expires server-side → app believes it's still valid until next RPC fails.
- **Fix:** Subscribe to `_supabase.auth.onAuthStateChange` in constructor.

### I25 — `verifyManagerPin` doesn't verify active session
- **File:** `lib/shared/providers/auth_provider.dart:155–182`
- **Bug:** Calls staff PIN RPC even with no active session / expired session.
- **Fix:** Check `_supabase.auth.currentSession != null` before RPC.

### I26 — `StartupGuardService` may call `Supabase.initialize` with null
- **File:** `lib/shared/services/startup_guard_service.dart:111–114`
- **Fix:** Add explicit null/empty checks for `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### I27 — `generateClientTransactionId` throws on short store IDs
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:272–273`
- **Bug:** `substring(0, 8)` on storeId < 8 chars → `RangeError`.
- **Fix:** `padRight(8, '0').substring(0, 8)`.

### I28 — Auto-resolved conflict returns `synced` telemetry
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:521`
- **Bug:** Returns `_SyncAttemptOutcome.synced` when transaction only placed back in `pending`. Telemetry falsely healthy.
- **Fix:** Return `failed` or add `retryScheduled` outcome.

### I29 — `retrySelected` doesn't reset `retryCount`
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:326–334`
- **Bug:** Manual retry uses old backoff. Delays recovery.
- **Fix:** Add `retryCount: 0` in `copyWith`.

### I30 — `acknowledgeConflict` leaves state as `conflict`
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:344–357`
- **Bug:** State remains `conflict`. Excluded from sync worker. Never retried.
- **Fix:** Set `state: OfflineSyncState.pending` in `copyWith`.

### I31 — No max retry cap for failing transactions
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:538–551`
- **Bug:** Permanent failure retries forever every 5 min. Battery drain.
- **Fix:** After `retryCount > 10`, transition to `failed` permanently + alert manager.

### I32 — Queue persistence not atomic
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:613–617`
- **Bug:** `_persistQueue` writes directly to target. Crash mid-write → corrupted/lost queue.
- **Fix:** Write to temp file, then `rename` over original.

### I33 — Queue files may be cloud-backed up
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:571–593`
- **Bug:** `getApplicationDocumentsDirectory()` included in iCloud backups. PII/sales data leaked.
- **Fix:** Use `getApplicationSupportDirectory()` or set `NSURLIsExcludedFromBackupKey`.

### I34 — Conflict resolver auto-resolves negative shortage
- **File:** `lib/features/sales/conflict_resolver.dart:258`
- **Bug:** If `totalAvailable > totalRequested`, `shortagePercent` negative → `<= maxStockShortagePercent` passes.
- **Fix:** Guard `if (shortagePercent <= 0) return ...`.

### I35 — Conflict resolver adjustment methods are no-ops
- **File:** `lib/features/sales/conflict_resolver.dart:340–388`
- **Bug:** `_applyPriceAdjustment`, `_applyStockAdjustment`, `_removeUnavailableItems` return new object with only `syncValidationState` changed. No actual data mutation. Conflict loops forever.
- **Fix:** Implement actual data mutations.

### I36 — Conflict resolver extension string mismatch
- **File:** `lib/features/sales/conflict_resolver.dart:394–402`
- **Bug:** Checks `'price_mismatch_small'` but server sends `'priceMismatch'`. Extension always returns `false`.
- **Fix:** Align strings with server enum or use typed enum.

### I37 — `offline/manager.dart` `enqueueSync` is stub
- **File:** `lib/offline/manager.dart:69–71`
- **Bug:** Only prints to console. No actual Drift insert.
- **Fix:** Implement Drift insert into `syncActions`.

### I38 — `RealtimeProvider` `init()` may throw uncaught
- **File:** `lib/features/inventory/data/realtime_provider.dart:24–50`
- **Fix:** Wrap in try/catch, expose error stream.

### I39 — `PosSearchProvider` retains stale items on error
- **File:** `lib/features/pos/presentation/providers/pos_search_provider.dart:93–100`
- **Fix:** Clear `items` and `categories` in error state copy.

### I40 — `PosSearchProvider` no debounce on search
- **File:** `lib/features/pos/presentation/providers/pos_search_provider.dart:104–136`
- **Fix:** Add `Timer` debounce (200–300ms).

### I41 — `CustomerPhoneLookup` no debounce on phone search
- **File:** `lib/features/pos/customer_lookup.dart:84`
- **Fix:** Add `Timer`-based debounce in `_search`.

### I42 — `SystemHealthCache` vulnerable to clock skew
- **File:** `lib/shared/services/system_health_service.dart:165`
- **Bug:** `DateTime.now()` vs `_expiresAt`. User changes device clock → cache stale or early expire.
- **Fix:** Use `Stopwatch` for TTL.

### I43 — `main.dart` `ChangeNotifierProxyProvider` creates throwaway `PosProvider`
- **File:** `lib/main.dart:164–170`
- **Bug:** `create` builds dummy `PosProvider()`. `update` returns stale instance without re-init.
- **Fix:** In `update`, mutate/re-init existing `PosSearchProvider` with real `pos`.

### I44 — `HindSiliguri` font never used
- **File:** `lib/core/theme/app_text_styles.dart:7` + `lib/theme/app_theme.dart:22`
- **Bug:** `fontFamilyPrimary` is system font stack. Bundled Bengali font ignored.
- **Fix:** Set `fontFamilyPrimary` to `'HindSiliguri'`.

### I45 — `side_drawer.dart` imports `main.dart`
- **File:** `lib/shared/widgets/side_drawer.dart:8`
- **Bug:** Anti-pattern. Causes circular deps, tree-shaking issues, hot-reload problems.
- **Fix:** Move `AppLocaleNotifier` to `lib/shared/locale/`.

### I46 — Print retry jitter math incorrect
- **File:** `lib/core/services/printer/print_retry_queue.dart:142–146`
- **Bug:** `finalMs = clampedMs + randomOffsetMs - jitterMs` biased downward. `randomOffsetMs` only 0–99 while `jitterMs` is 10% of delay.
- **Fix:** `Random().nextInt(jitterMs * 2 + 1) - jitterMs` for true ±10% uniform jitter.

### I47 — `printer_service.dart` only accepts HTTP 200
- **File:** `lib/core/services/printer/printer_service.dart:379`
- **Bug:** Valid 202/204 treated as failure.
- **Fix:** `statusCode >= 200 && statusCode < 300`.

### I48 — Race conditions test inverted assertion
- **File:** `test/unit/race_conditions_test.dart:30–38`
- **Bug:** Test titled "should not exceed" asserts `greaterThan`. Logic contradicts description.
- **Fix:** Change to `lessThanOrEqualTo`.

### I49 — `pubspec.yaml` `meta: any` unconstrained
- **File:** `pubspec.yaml:43`
- **Fix:** `meta: ^1.12.0`.

### I50 — `analysis_options.yaml` excludes `test/**`
- **File:** `analysis_options.yaml:34`
- **Fix:** Remove `test/**` from exclude.

### I51 — Integration tests in wrong directory
- **File:** `test/e2e/offline_purchase_test.dart`, `test/performance/inventory_search.dart`
- **Fix:** Move to `integration_test/`.

### I52 — `printer_test_screen.dart` scan stuck forever
- **File:** `lib/core/services/printer/printer_test_screen.dart:66–73`
- **Bug:** Relies on `onDone` of broadcast stream that never closes.
- **Fix:** Use `_printer.eventStream` or `FlutterBluePlus.isScanning` stream.

### I53 — `side_drawer.dart` hardcoded personal info
- **File:** `lib/shared/widgets/side_drawer.dart:105,110,325`
- **Bug:** "Ahmed Hossain", phone number, version `v1.2.0 • Build 104` mismatches `pubspec.yaml` (`1.0.0+1`).
- **Fix:** Read from `AuthService`/profile. Derive version from `package_info_plus`.

### I54 — `BarcodeListener` creates new `FocusNode` every build
- **File:** `lib/features/pos/presentation/screens/barcode_listener.dart:31`
- **Bug:** `KeyboardListener(focusNode: FocusNode())` created every build. Never requests focus.
- **Fix:** Store `FocusNode` in state, call `FocusScope.of(context).requestFocus(_focusNode)` in `initState`.

### I55 — `PosMainScreen` `onRemoveItemAt`/`onQtyChangedAt` closure captures stale index
- **File:** `lib/features/pos/presentation/screens/pos_main_screen.dart:406–407`
- **Bug:** Closure captures `index` at build time. If cart changes before invocation, wrong item removed.
- **Fix:** Pass item ID instead of index, resolve in callback.

### I56 — `PaymentScreen` seeds numpad with truncated total
- **File:** `lib/features/pos/presentation/screens/payment_screen.dart:57`
- **Bug:** `_numpadValue = pos.totalAmount.toStringAsFixed(0)` truncates fractional Taka. Cashier completes with wrong amount.
- **Fix:** Use `toStringAsFixed(2)`.

### I57 — `PaymentScreen` nested `addPostFrameCallback`
- **File:** `lib/features/pos/presentation/screens/payment_screen.dart:61–76`
- **Bug:** Nested callbacks cause timing issues and redundant reselection.
- **Fix:** Flatten to single callback.

### I58 — `ManagerShell` page state lost on rebuild
- **File:** `lib/features/pos/presentation/screens/manager_shell.dart:52`
- **Bug:** `late final List<Widget> _pages` recreated on every `ManagerShell` rebuild.
- **Fix:** Use `IndexedStack` or `AutomaticKeepAliveClientMixin`.

### I59 — `AuthGate` calls `setOfflineSafeMode` on every build
- **File:** `lib/features/auth/presentation/screens/auth_gate.dart:30–34`
- **Bug:** `addPostFrameCallback` fires every `AuthGate` rebuild, repeatedly calling provider.
- **Fix:** Move to `initState` of a wrapper, or gate with a flag.

### I60 — `pos_screen.dart` `handleScannerKeypress` double-fires on Enter
- **File:** `lib/features/pos/presentation/screens/pos_screen.dart:109–121`
- **Bug:** Every `KeyDownEvent` adds char to buffer. On Enter, adds `\n` AND calls `handleScannerKeypress('\n')`. Scanner wedge may double-process.
- **Fix:** Only pass non-Enter chars to buffer; Enter triggers flush.

### I61 — `CheckoutScreen` uses `Provider.of` instead of context.read/watch
- **File:** `lib/features/checkout/presentation/screens/checkout_screen.dart:32`
- **Bug:** `Provider.of<PosProvider>(context)` rebuilds on every provider change unnecessarily.
- **Fix:** Use `context.watch<PosProvider>()` or `context.read<PosProvider>()`.

### I62 — `DashboardScreen` error UI hidden if partial data loaded
- **File:** `lib/features/dashboard/presentation/screens/dashboard_screen.dart:154`
- **Bug:** `_error != null && _todaySales == 0 && _totalOrders == 0` — if error occurs but some data loaded, error never shown.
- **Fix:** Show error banner independently of data state.

### I63 — `InventoryImportScreen` uses `dotenv.env` directly without null check
- **File:** `lib/features/inventory/presentation/screens/inventory_import_screen.dart:180`
- **Bug:** `${dotenv.env['SUPABASE_URL']}` may be null → malformed URI.
- **Fix:** Null-check before constructing URI.

### I64 — `PosSessionSummaryScreen` outer catch swallows all errors with generic message
- **File:** `lib/features/pos/presentation/screens/pos_session_summary_screen.dart:120–127`
- **Bug:** Single outer catch returns generic "secure connection" message, hiding real errors (RLS denial, missing RPC, etc.).
- **Fix:** Distinguish error types or log original error.

### I65 — `PosSessionSummaryScreen` closing cash `TextField` no input validation
- **File:** `lib/features/pos/presentation/screens/pos_session_summary_screen.dart:147–160`
- **Bug:** `double.tryParse(val) ?? 0.0` accepts empty/invalid input silently.
- **Fix:** Use `TextInputType.numberWithOptions(decimal: true)` with input formatter.

### I66 — `SyncQueueScreen` extremely long single-line code
- **File:** `lib/features/pos/presentation/screens/sync_queue_screen.dart`
- **Bug:** Entire file is minified-style single lines. Unmaintainable.
- **Fix:** Reformat with proper line breaks and indentation.

---

## Nit / Minor

### N1 — `ThemeProvider.toggleTheme` ignores `ThemeMode.system`
- **File:** `lib/core/providers/theme_provider.dart:38–39`

### N2 — `EventBus` lacks backpressure handling
- **File:** `lib/core/events/event_bus.dart:18–22`

### N3 — `CsvImportService.parseCsv` unnecessarily `async`
- **File:** `lib/core/services/csv_import_service.dart:27`

### N4 — `tables.dart` `rawData` uses `BlobColumn` for JSON
- **File:** `lib/core/db/tables.dart:108`

### N5 — `OfflineStockLevels` timestamp type inconsistency
- **File:** `lib/core/db/tables.dart:94`

### N6 — `AccessControlLayer._isUuid` regex too strict
- **File:** `lib/shared/services/access_control_layer.dart:43–48`

### N7 — `PosProvider` client-generated sale number
- **File:** `lib/shared/providers/pos_provider.dart:562`

### N8 — `PosProvider.subtotal` recalculates payment method lookup per item
- **File:** `lib/shared/providers/pos_provider.dart:101–114`

### N9 — `offline_transaction_sync_service` double notify
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:421,454`

### N10 — `changeDue` clamps negative to 0
- **File:** `lib/shared/providers/pos_provider.dart:567`

### N11 — `CsvImportService._hasRequiredColumns` non-null assertion
- **File:** `lib/core/services/csv_import_service.dart:222`

### N12 — `edge_function_sale_service` only handles HTTP 200
- **File:** `lib/shared/services/edge_function_sale_service.dart:47–49`

### N13 — `PosProvider._buildSnapshot` uses `!` on nullable IDs
- **File:** `lib/shared/providers/pos_provider.dart:354–355`

### N14 — `Category` ID type inconsistent with `PosCategory`
- **File:** `lib/models/category.dart:2` vs `lib/models/pos_models.dart:228`

### N15 — `PosSearchProvider._cleanError` false positive for "403"
- **File:** `lib/features/pos/presentation/providers/pos_search_provider.dart:160`

### N16 — `AuthProvider` `debugPrint` leaks sensitive data
- **File:** `lib/shared/providers/auth_provider.dart:138`

### N17 — `AppAccessController` may skip rapid auth updates
- **File:** `lib/shared/controllers/app_access_controller.dart:67`

### N18 — `offline_transaction_sync_service` telemetry not reset on queue clear
- **File:** `lib/features/sales/offline_transaction_sync_service.dart:577–588`

### N19 — `app_radius.dart` `BorderRadius` helpers allocate new object every access
- **File:** `lib/core/theme/app_radius.dart:15–20`

### N20 — `printer_test_screen.dart` stream subscription never canceled
- **File:** `lib/core/services/printer/printer_test_screen.dart:28–51`

### N21 — `demo_products.dart` inconsistent dataset
- **File:** `lib/demo/demo_products.dart:119–135`

### N22 — Two classes named `LabelPrinterService`
- **File:** `lib/shared/services/printer_service.dart:147` vs `lib/core/services/printer/label_printer_service.dart:10`

### N23 — `file_picker_stub.dart` return type mismatch
- **File:** `lib/features/inventory/presentation/screens/file_picker_stub.dart:5`

### N24 — `printer_service.dart` comment misleading about ESC/POS
- **File:** `lib/core/services/printer/printer_service.dart:291–335`

### N25 — `printer_models.dart` leading blank line
- **File:** `lib/core/services/printer/printer_models.dart:1`

### N26 — `printer_service.dart` `retryPrint` discards typed result
- **File:** `lib/core/services/printer/printer_service.dart:432`

---

## Security & Architecture Red Flags

1. **Service role key in mobile binary** — Remove entirely.
2. **Manager credentials in `.env`** — Remove entirely.
3. **Anon key used as Bearer token** — Fix across `NetworkConfig`, `InventoryService`.
4. **No certificate pinning** — `http.Client` and Supabase client susceptible to MITM.
5. **No root-of-trust for offline sales** — Offline transactions queued on-device with no HSM/secure signature.

---

## Priority Action Items

| Priority | Item | File |
|----------|------|------|
| P0 | Fix billing bug (`totalAmount`) | `pos_provider.dart:116` |
| P0 | Remove service key + manager creds from mobile | `network_config.dart`, `auth_provider.dart` |
| P0 | Fix `file_picker` compile error | `file_picker_mobile.dart:8` |
| P0 | Fix background sync Supabase init | `offline/manager.dart:9` |
| P0 | Fix background sync action type routing | `offline/manager.dart:26` |
| P1 | Fix `firstWhere` crash in `completeSale` | `pos_provider.dart:397` |
| P1 | Fix print retry queue (non-functional) | `print_retry_queue.dart:342` |
| P1 | Fix double print attempts increment | `printer_service.dart:193` |
| P1 | Fix barcode listener `RangeError` | `barcode_listener.dart:51` |
| P1 | Fix negative panel width crash | `pos_main_screen.dart:171` |
| P1 | Fix `CartItem` negative line total | `pos_models.dart:80` |
| P1 | Fix queue persistence atomicity | `offline_transaction_sync_service.dart:613` |
| P1 | Fix conflict resolver no-ops | `conflict_resolver.dart:340` |
| P2 | Add debounce to all search fields | `pos_search_provider.dart`, `customer_lookup.dart` |
| P2 | Fix all `DateTime.parse` without fallback | `pos_models.dart`, `sale_transaction_snapshot.dart`, `party.dart` |
| P2 | Fix auth-state listener | `auth_provider.dart` |
| P2 | Fix `enqueueSync` stub | `offline/manager.dart:69` |
| P3 | Use `HindSiliguri` font | `app_text_styles.dart` |
| P3 | Move `AppLocaleNotifier` out of `main.dart` | `side_drawer.dart` |
| P3 | Re-enable analyzer on `test/**` | `analysis_options.yaml` |
| P3 | Move integration tests to correct dir | `test/e2e/`, `test/performance/` |
