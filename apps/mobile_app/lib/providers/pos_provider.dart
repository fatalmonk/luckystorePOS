import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pos_models.dart';
import '../models/sale_transaction_snapshot.dart';
import '../models/app_user.dart';
import '../models/party.dart';
import '../services/offline_transaction_sync_service.dart';

class PosCatalogLoadResult {
  final List<PosCategory> categories;
  final List<PosItem> items;
  final String modeUsed;
  final String? error;

  const PosCatalogLoadResult({
    required this.categories,
    required this.items,
    required this.modeUsed,
    this.error,
  });

  bool get hasError => error != null;
}

/// PosProvider manages the active POS session, cart, and sale operations.
/// Register in MultiProvider before any POS screen is accessed.
class PosProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  final _offlineSync = OfflineTransactionSyncService.instance;
  final Map<String, List<PosItem>> _searchCache = {};
  bool _offlineSafeMode = false;
  String _lastPosLoadPath = 'rpc';
  String? _lastPosLoadError;
  int _lastCategoryCount = 0;
  int _lastItemCount = 0;
  DateTime? _lastPosLoadAt;
  DateTime? _lastSuccessfulCatalogLoadAt;
  bool _catalogLoadFailed = false;
  bool get offlineSafeMode => _offlineSafeMode;
  String get posDataSourceLabel => 'RPC';
  DateTime? get lastSuccessfulCatalogLoadAt => _lastSuccessfulCatalogLoadAt;
  bool get catalogLoadFailed => _catalogLoadFailed;
  int get queuedTransactionCount =>
      _offlineSync.dashboardStats().queuedSalesCount;

  PosProvider() {
    _offlineSync.addListener(_handleOfflineSyncUpdate);
    _offlineSync.initialize(_supabase);
  }

  @override
  void dispose() {
    _offlineSync.removeListener(_handleOfflineSyncUpdate);
    super.dispose();
  }

  void _handleOfflineSyncUpdate() {
    notifyListeners();
  }

  // ── Session ────────────────────────────────────────────────────────────────
  PosSession? _session;
  PosSession? get session => _session;
  bool get hasActiveSession => _session != null;

  String? _cashierId;
  String? _cashierName;
  String? _storeId;
  String? get cashierId => _cashierId;
  String? get cashierName => _cashierName;
  String? get storeId => _storeId;

  Party? _selectedParty;
  Party? get selectedParty => _selectedParty;

  void setSelectedParty(Party? party) {
    _selectedParty = party;
    notifyListeners();
  }

  // ── Cart ───────────────────────────────────────────────────────────────────
  final List<CartItem> _cart = [];
  final Map<String, SaleSnapshotItem> _draftSnapshotItems = {};
  SaleTransactionSnapshot? _frozenCheckoutSnapshot;
  List<CartItem> get cart => List.unmodifiable(_cart);
  bool get cartIsEmpty => _cart.isEmpty;

  double _cartDiscount = 0; // sale-level discount in ৳
  double get cartDiscount => _cartDiscount;

  double get subtotal => _cart.fold(0, (sum, c) => sum + c.lineTotal);
  double get totalAmount =>
      (subtotal - _cartDiscount).clamp(0, double.infinity);
  int get itemCount => _cart.fold(0, (sum, c) => sum + c.qty);

  // ── Payment methods ────────────────────────────────────────────────────────
  List<PaymentMethod> _paymentMethods = [];
  List<PaymentMethod> get paymentMethods => _paymentMethods;

  // ── Loading / error ────────────────────────────────────────────────────────
  bool _loading = false;
  bool get loading => _loading;

  String? _error;
  String? get error => _error;

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  void _setError(String? e) {
    _error = e;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Map<String, dynamic> get posDebugSnapshot => {
        'data_source_mode': posDataSourceLabel,
        'offline_safe_mode': _offlineSafeMode,
        'store_id': _storeId,
        'cashier_id': _cashierId,
        'last_load_path': _lastPosLoadPath,
        'last_load_error': _lastPosLoadError,
        'last_category_count': _lastCategoryCount,
        'last_item_count': _lastItemCount,
        'last_loaded_at': _lastPosLoadAt?.toIso8601String(),
        'last_successful_loaded_at': _lastSuccessfulCatalogLoadAt?.toIso8601String(),
        'catalog_load_failed': _catalogLoadFailed,
      };

  void setOfflineSafeMode(bool enabled) {
    if (_offlineSafeMode == enabled) return;
    _offlineSafeMode = enabled;
    if (enabled) {
      _setError(
          'Offline-safe mode active. Using cached inventory and queued transactions.');
    } else if (_error != null && _error!.contains('Offline-safe mode active')) {
      _setError(null);
    }
    notifyListeners();
  }

  // ── Session management ─────────────────────────────────────────────────────

  /// Load cashier profile by auth user. Returns true if found.
  Future<bool> loadCashierProfile() async {
    try {
      final authId = _supabase.auth.currentUser?.id;
      if (authId == null) return false;

      final row = await _supabase
          .from('users')
          .select('id, full_name, role, store_id')
          .eq('auth_id', authId)
          .single();

      _cashierId = row['id'] as String;
      _cashierName = row['full_name'] as String? ?? 'Cashier';
      _storeId = row['store_id'] as String?;
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Could not load user profile: $e');
      return false;
    }
  }

  /// Hydrate cashier state directly from an [AppUser] that was already resolved
  /// by [AuthProvider] — eliminates the extra Supabase round-trip from
  /// [loadCashierProfile] when [StaffPinLoginScreen] is used post-login.
  Future<void> loadFromAppUser(AppUser user) async {
    debugPrint('[PosProvider] loadFromAppUser: user=${user.name}, role=${user.role}, storeId=${user.storeId}, userId=${user.id}');
    _cashierId = user.id;
    _cashierName = user.name;
    _storeId = user.storeId.isNotEmpty ? user.storeId : null; // Use user's store_id or null
    debugPrint('[PosProvider] Store context set: _storeId=$_storeId');
    notifyListeners();
    await _loadPaymentMethods();
  }

  /// Open a POS shift session. Must be called before completing any sale.
  Future<bool> openSession({double openingCash = 0}) async {
    if (_cashierId == null || _storeId == null) return false;
    _setLoading(true);
    try {
      final row = await _supabase
          .from('pos_sessions')
          .insert({
            'store_id': _storeId,
            'cashier_id': _cashierId,
            'status': 'open',
            'opening_cash': openingCash,
          })
          .select()
          .single();

      _session = PosSession.fromJson(row);
      await _loadPaymentMethods();
      _setLoading(false);
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to open session: $e');
      return false;
    }
  }

  Future<void> _loadPaymentMethods() async {
    if (_storeId == null) return;
    try {
      final rows = await _supabase
          .from('payment_methods')
          .select()
          .eq('store_id', _storeId!)
          .eq('is_active', true)
          .order('sort_order');
      _paymentMethods = (rows as List)
          .map((r) => PaymentMethod.fromJson(r as Map<String, dynamic>))
          .toList();
      notifyListeners();
    } catch (_) {}
  }

  // ── Cart operations ────────────────────────────────────────────────────────

  void addItem(PosItem item, {int qty = 1}) {
    final idx = _cart.indexWhere((c) => c.item.id == item.id);
    if (idx >= 0) {
      _cart[idx].qty += qty;
    } else {
      _cart.add(CartItem(item: item, qty: qty));
    }
    final existing = _draftSnapshotItems[item.id];
    _draftSnapshotItems[item.id] = SaleSnapshotItem(
      productId: item.id,
      quantity: (existing?.quantity ?? 0) + qty,
      unitPriceSnapshot: existing?.unitPriceSnapshot ?? item.price,
      discountSnapshot: existing?.discountSnapshot ?? 0,
      stockSnapshot: existing?.stockSnapshot ?? item.qtyOnHand,
    );
    _invalidateFrozenSnapshot();
    notifyListeners();
  }

  void removeItem(String itemId) {
    _cart.removeWhere((c) => c.item.id == itemId);
    _draftSnapshotItems.remove(itemId);
    _invalidateFrozenSnapshot();
    notifyListeners();
  }

  void setQty(String itemId, int qty) {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    final idx = _cart.indexWhere((c) => c.item.id == itemId);
    if (idx >= 0) {
      _cart[idx].qty = qty;
      final itemIdRef = _cart[idx].item.id;
      final snap = _draftSnapshotItems[itemIdRef];
      if (snap != null) {
        _draftSnapshotItems[itemIdRef] = SaleSnapshotItem(
          productId: snap.productId,
          quantity: qty,
          unitPriceSnapshot: snap.unitPriceSnapshot,
          discountSnapshot: snap.discountSnapshot,
          stockSnapshot: snap.stockSnapshot,
        );
      }
      _invalidateFrozenSnapshot();
      notifyListeners();
    }
  }

  void setLineDiscount(String itemId, double discount) {
    final idx = _cart.indexWhere((c) => c.item.id == itemId);
    if (idx >= 0) {
      _cart[idx].discount = discount;
      final itemIdRef = _cart[idx].item.id;
      final snap = _draftSnapshotItems[itemIdRef];
      if (snap != null) {
        _draftSnapshotItems[itemIdRef] = SaleSnapshotItem(
          productId: snap.productId,
          quantity: snap.quantity,
          unitPriceSnapshot: snap.unitPriceSnapshot,
          discountSnapshot: discount,
          stockSnapshot: snap.stockSnapshot,
        );
      }
      _invalidateFrozenSnapshot();
      notifyListeners();
    }
  }

  void setCartDiscount(double amount) {
    _cartDiscount = amount.clamp(0, subtotal);
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    _draftSnapshotItems.clear();
    _frozenCheckoutSnapshot = null;
    _cartDiscount = 0;
    notifyListeners();
  }

  void _invalidateFrozenSnapshot() {
    _frozenCheckoutSnapshot = null;
  }

  SaleTransactionSnapshot _buildSnapshot({
    required String clientTransactionId,
    required String transactionTraceId,
  }) {
    final items = _cart
        .map((cartItem) => _draftSnapshotItems[cartItem.item.id] ?? snapshotItemFromCart(cartItem))
        .toList(growable: false);
    return SaleTransactionSnapshot(
      clientTransactionId: clientTransactionId,
      transactionTraceId: transactionTraceId,
      storeId: _storeId!,
      userId: _cashierId!,
      items: items,
      createdAt: DateTime.now(),
      mode: _offlineSafeMode ? 'offline' : 'online',
      pricingSource: 'rpc',
      inventorySource: 'rpc',
    );
  }

  // ── Complete sale ──────────────────────────────────────────────────────────

  Future<SaleExecutionResult> completeSale(
    List<PaymentTender> tenders, {
    String fulfillmentPolicy = 'STRICT',
    String? overrideToken,
    String? overrideReason,
    required String transactionTraceId,
  }) async {
    if (_cart.isEmpty) throw Exception('Cart is empty');
    if (_cashierId == null || _storeId == null)
      throw Exception('No active session');

    final paymentsPayload = tenders
        .map((t) => {
              'payment_method_id': t.method.id,
              'amount': t.amount,
              'reference': t.reference,
            })
        .toList();
    final clientTransactionId = _offlineSync.generateClientTransactionId(
      storeId: _storeId!,
      cashierId: _cashierId!,
    );
    final snapshot = _frozenCheckoutSnapshot ??
        _buildSnapshot(
          clientTransactionId: clientTransactionId,
          transactionTraceId: transactionTraceId,
        );
    _frozenCheckoutSnapshot = snapshot;

    final itemsPayload = snapshot.items.map((s) {
      final cartLine = _cart.firstWhere((c) => c.item.id == s.productId);
      return {
        'item_id': s.productId,
        'qty': s.quantity,
        'unit_price': s.unitPriceSnapshot,
        'cost': cartLine.item.cost,
        'discount': s.discountSnapshot,
      };
    }).toList();
    final intent = SaleTransactionIntent(
      clientTransactionId: clientTransactionId,
      transactionTraceId: transactionTraceId,
      storeId: _storeId!,
      cashierId: _cashierId!,
      sessionId: _session?.id,
      items: itemsPayload
          .map((row) => SaleTransactionIntentItem.fromJson(row))
          .toList(growable: false),
      payments: paymentsPayload,
      cartDiscount: _cartDiscount,
      createdAt: DateTime.now(),
      fulfillmentPolicy: fulfillmentPolicy,
    );

    if (_offlineSafeMode) {
      await _offlineSync.enqueueSale(
        intent: intent,
        snapshot: snapshot.toJson(),
      );
      clearCart();
      notifyListeners();
      return const SaleExecutionResult(
        status: SaleExecutionStatus.success,
        conflictReason: null,
        message: 'Queued for server validation',
        adjustments: const [],
        partialFulfillment: const [],
        saleResult: null,
        transactionTraceId: null,
      );
    }

    final validation = await _supabase.rpc('validate_sale_intent', params: {
      'p_snapshot': snapshot.toJson(),
    });
    final validationMap = Map<String, dynamic>.from(validation as Map);
    final validationStatus =
        (validationMap['validation_status'] as String? ?? 'REJECTED')
            .toUpperCase();
    if (validationStatus != 'VALID') {
      return SaleExecutionResult(
        status: switch (validationStatus) {
          'REQUIRES_OVERRIDE' => SaleExecutionStatus.conflict,
          'INSUFFICIENT_STOCK' => SaleExecutionStatus.conflict,
          'PRICE_CHANGED' => SaleExecutionStatus.rejected,
          _ => SaleExecutionStatus.rejected,
        },
        conflictReason: validationStatus,
        message: validationMap['message'] as String?,
        adjustments: const [],
        partialFulfillment: const [],
        saleResult: null,
        transactionTraceId:
            validationMap['transaction_trace_id'] as String? ?? transactionTraceId,
      );
    }

    final result = await _supabase.rpc('record_sale', params: {
      'p_idempotency_key': transactionTraceId,
      'p_tenant_id': _supabase.auth.currentUser?.userMetadata?['tenant_id'], // Assuming tenant_id is in JWT
      'p_store_id': _storeId,
      'p_items': itemsPayload,
      'p_payments': paymentsPayload.map((p) => {
        ...p,
        'party_id': _selectedParty?.id, // For now, attach party to all payments if selected
      }).toList(),
      'p_notes': null,
    });
    
    final resultMap = Map<String, dynamic>.from(result as Map);
    final statusText = (resultMap['status'] as String? ?? 'REJECTED').toUpperCase();

    SaleResult? sale;
    if (statusText == 'SUCCESS') {
      final itemsForReceipt = List<CartItem>.from(_cart);
      // Construct a minimal SaleResult for the receipt screen
      sale = SaleResult(
        saleId: resultMap['batch_id'] as String,
        saleNumber: 'SALE-${DateTime.now().millisecondsSinceEpoch}',
        subtotal: subtotal,
        discount: _cartDiscount,
        totalAmount: totalAmount,
        tendered: totalAmount,
        changeDue: 0,
        items: itemsForReceipt,
      );
      clearCart();
      _selectedParty = null;
    }
    
    return SaleExecutionResult(
      status: statusText == 'SUCCESS' ? SaleExecutionStatus.success : SaleExecutionStatus.rejected,
      conflictReason: null,
      message: statusText == 'SUCCESS' ? 'Sale recorded successfully' : 'Sale failed',
      adjustments: const [],
      partialFulfillment: const [],
      saleResult: sale,
      transactionTraceId: transactionTraceId,
    );
  }

  // ── Parties ────────────────────────────────────────────────────────────────

  Future<List<Party>> searchParties(String query) async {
    try {
      final rows = await _supabase
          .from('parties')
          .select()
          .ilike('name', '%$query%')
          .limit(10);
      return (rows as List).map((r) => Party.fromJson(r as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  // ── Void sale ──────────────────────────────────────────────────────────────

  Future<void> voidSale(String saleId, String reason) async {
    await _supabase.rpc('void_sale', params: {
      'p_sale_id': saleId,
      'p_reason': reason,
    });
  }

  // ── Cash closing ─────────────────────────────────────────────────────

  Future<Map<String, dynamic>> recordCashClosing({
    required double actualCash,
    required String accountId,
  }) async {
    final idempotencyKey = 'cash_closing_${DateTime.now().millisecondsSinceEpoch}';
    final tenantId = _supabase.auth.currentUser?.userMetadata?['tenant_id'];
    final storeId = _storeId;

    if (tenantId == null || storeId == null) {
      return {'status': 'error', 'message': 'Missing tenant or store ID'};
    }

    try {
      final result = await _supabase.rpc('record_cash_closing', params: {
        'p_idempotency_key': idempotencyKey,
        'p_tenant_id': tenantId,
        'p_store_id': storeId,
        'p_account_id': accountId,
        'p_actual_cash': actualCash,
      });
      return result as Map<String, dynamic>;
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // ── Scan / search ──────────────────────────────────────────────────────────

  Future<PosItem?> scanItem(String value) async {
    if (_storeId == null) return null;
    final result = await _supabase.rpc('lookup_item_by_scan', params: {
      'p_scan_value': value,
      'p_store_id': _storeId,
    });
    if (result == null) return null;
    return PosItem.fromJson(result as Map<String, dynamic>);
  }

  Future<List<PosItem>> searchItems(String query, {String? categoryId}) async {
    if (_storeId == null) return [];
    final cacheKey = '${query.trim().toLowerCase()}::${categoryId ?? 'all'}';
    if (_offlineSafeMode) {
      return _searchCache[cacheKey] ?? const <PosItem>[];
    }
    try {
      final items = await _searchItemsRpc(query, categoryId: categoryId);
      _searchCache[cacheKey] = items;
      _catalogLoadFailed = false;
      _lastSuccessfulCatalogLoadAt = DateTime.now();
      return items;
    } catch (firstError) {
      _lastPosLoadPath = 'rpc';
      _lastPosLoadError = 'search_rpc_failed: $firstError';
      _lastPosLoadAt = DateTime.now();
      _catalogLoadFailed = true;
      notifyListeners();
      return const <PosItem>[];
    }
  }

  Future<List<PosCategory>> loadCategories() async {
    if (_storeId == null) return [];
    try {
      return await _loadCategoriesRpc();
    } catch (firstError) {
      _lastPosLoadPath = 'rpc';
      _lastPosLoadError = 'categories_rpc_failed: $firstError';
      _lastPosLoadAt = DateTime.now();
      notifyListeners();
      return [];
    }
  }

  Future<PosCatalogLoadResult> loadProductCatalog({
    String query = '',
    String? categoryId,
  }) async {
    if (_storeId == null) {
      const missingStore = 'Store context missing for POS session.';
      _lastPosLoadError = missingStore;
      _lastPosLoadAt = DateTime.now();
      _catalogLoadFailed = true;
      notifyListeners();
      return const PosCatalogLoadResult(
        categories: [],
        items: [],
        modeUsed: 'none',
        error: missingStore,
      );
    }

    try {
      final categories = await loadCategories();
      final items = await searchItems(query, categoryId: categoryId);
      const modeUsed = 'rpc';

      _catalogLoadFailed = false;
      _lastSuccessfulCatalogLoadAt = DateTime.now();

      return PosCatalogLoadResult(
        categories: categories,
        items: items,
        modeUsed: modeUsed,
        error: _lastPosLoadError,
      );
    } catch (e) {
      _lastPosLoadError = 'catalog_load_failed: $e';
      _lastPosLoadAt = DateTime.now();
      _catalogLoadFailed = true;
      notifyListeners();
      return PosCatalogLoadResult(
        categories: const [],
        items: const [],
        modeUsed: 'rpc',
        error: _lastPosLoadError,
      );
    }
  }

  Future<Map<String, int>> _loadStockByItemIds(List<String> itemIds) async {
    if (_storeId == null || itemIds.isEmpty) return const {};
    final rows = await _supabase
        .from('stock_levels')
        .select('item_id, qty_on_hand')
        .eq('store_id', _storeId!)
        .inFilter('item_id', itemIds);
    final result = <String, int>{};
    for (final raw in (rows as List)) {
      final row = raw as Map<String, dynamic>;
      final itemId = row['item_id'] as String?;
      if (itemId == null) continue;
      final qty = (row['qty_on_hand'] as num?)?.toInt() ?? 0;
      result.update(itemId, (v) => v + qty, ifAbsent: () => qty);
    }
    return result;
  }

  Future<List<PosItem>> _searchItemsRpc(String query,
      {String? categoryId}) async {
    final result = await _supabase.rpc('search_items_pos', params: {
      'p_store_id': _storeId,
      'p_query': query,
      'p_category_id': categoryId,
      'p_limit': 60,
      'p_offset': 0,
    });
    if (result == null) return [];
    final items = (result as List)
        .map((r) => PosItem.fromJson(r as Map<String, dynamic>))
        .toList();
    _lastPosLoadPath = 'rpc';
    _lastPosLoadError = null;
    _lastItemCount = items.length;
    _lastPosLoadAt = DateTime.now();
    _catalogLoadFailed = false;
    notifyListeners();
    return items;
  }

  Future<List<PosCategory>> _loadCategoriesRpc() async {
    final result = await _supabase.rpc('get_pos_categories', params: {
      'p_store_id': _storeId,
    });
    if (result == null) return [];
    final categories = (result as List)
        .map((r) => PosCategory.fromJson(r as Map<String, dynamic>))
        .toList();
    _lastPosLoadPath = 'rpc';
    _lastPosLoadError = null;
    _lastCategoryCount = categories.length;
    _lastPosLoadAt = DateTime.now();
    _catalogLoadFailed = false;
    notifyListeners();
    return categories;
  }
}
