import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/services/printer/printer_service.dart';
import '../../models/pos_models.dart';
import '../../models/party.dart';

/// Sale-level item snapshot captured at checkout freeze (for multi-currency/payment scenarios).
class SaleSnapshotItem {
  final String productId;
  final int quantity;
  final double unitPriceSnapshot;
  final double discountSnapshot;
  final int stockSnapshot;

  SaleSnapshotItem({
    required this.productId,
    required this.quantity,
    required this.unitPriceSnapshot,
    required this.discountSnapshot,
    required this.stockSnapshot,
  });

  Map<String, dynamic> toJson() => {
    'product_id': productId,
    'quantity': quantity,
    'unit_price_snapshot': unitPriceSnapshot,
    'discount_snapshot': discountSnapshot,
    'stock_snapshot': stockSnapshot,
  };
}

/// Transaction-level snapshot (header + line items) for idempotent checkout.
class SaleTransactionSnapshot {
  final List<SaleSnapshotItem> items;
  final DateTime capturedAt;
  final int? expectedRevision; // optimistic locking

  void _handleOfflineSyncUpdate() {
    _safeNotify();
  }

  /// Safely calls [notifyListeners], deferring to post-frame if a build is active.
  void _safeNotify() {
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
    } else {
      notifyListeners();
    }
  }

/// Provider for POS cart, party selection, and checkout operations.
/// Maintains a frozen snapshot at checkout to ensure consistency across payment processing.
class PosProvider extends ChangeNotifier {
  final SupabaseClient _supabase;
  PrinterService? _printerService;

  String? _storeId;
  String? get storeId => _storeId;

  Party? _selectedParty;
  Party? get selectedParty => _selectedParty;

  void setSelectedParty(Party? party) {
    _selectedParty = party;
    _safeNotify();
  }

  String? _selectedPaymentMethodId;
  String? get selectedPaymentMethodId => _selectedPaymentMethodId;

  void setSelectedPaymentMethodId(String? id) {
    _selectedPaymentMethodId = id;
    _safeNotify();
  }

  // ── Cart ───────────────────────────────────────────────────────────────────
  final List<CartItem> _cart = [];
  final Map<String, SaleSnapshotItem> _draftSnapshotItems = {};
  SaleTransactionSnapshot? _frozenCheckoutSnapshot;
  List<CartItem> get cart => List.unmodifiable(_cart);
  bool get cartIsEmpty => _cart.isEmpty;

  double _cartDiscount = 0; // sale-level discount in ৳
  double get cartDiscount => _cartDiscount;

  double get subtotal {
    return _cart.fold(0.0, (sum, item) {
      PaymentMethod? method;
      for (final m in _paymentMethods) {
        if (m.id == _selectedPaymentMethodId) {
          method = m;
          break;
        }
      }
      final isCredit = method?.name.toLowerCase().contains('credit') ?? false;
      final unitPrice = isCredit ? item.item.mrp : item.item.price;
      return sum + (unitPrice * item.qty);
    });
  }

  double get totalAmount => subtotal;
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
    _safeNotify();
  }

  void _setError(String? e) {
    _error = e;
    _safeNotify();
  }

  void clearError() {
    _error = null;
    _safeNotify();
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
    _safeNotify();
  }

  // ── Session Management ─────────────────────────────────────────────────────

  String? _currentSessionId;
  String? get currentSessionId => _currentSessionId;

  Future<bool> openSession({required String openedBy, required double openingBalance}) async {
    _setLoading(true);
    _setError(null);
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
      _safeNotify();
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to open session: $e');
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
    if (user.storeId.isNotEmpty) {
      _storeId = user.storeId;
    } else {
      // Fallback: fetch first store ID from Supabase
      try {
        final rows = await _supabase.from('stores').select('id').limit(1).single();
        _storeId = rows['id'] as String?;
        debugPrint('[PosProvider] Fallback store fetched: $_storeId');
      } catch (e) {
        debugPrint('[PosProvider] No store ID available: $e');
        _storeId = null;
      }
    }
    debugPrint('[PosProvider] Store context set: _storeId=$_storeId');
    _safeNotify();
    await _loadPaymentMethods();
  }

  /// Open a POS shift session. Must be called before completing any sale.
  Future<bool> openSession({double openingCash = 0}) async {
    if (_cashierId == null || _storeId == null) return false;
    _setLoading(true);
    _setError(null);
    try {
      final result = await _supabase.rpc('close_pos_session', params: {
        'p_session_id': _currentSessionId,
        'p_closed_by': closedBy,
        'p_closing_balance': closingBalance,
        'p_note': note,
      });
      if (result != null && result['success'] == true) {
        _currentSessionId = null;
        clear();
        _setLoading(false);
        notifyListeners();
        return true;
      }
      _setLoading(false);
      _setError('Failed to close session');
      return false;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to close session: $e');
      return false;
    }
  }

  // ── Payment Methods ────────────────────────────────────────────────────────

  List<PaymentMethod> _paymentMethods = [];
  List<PaymentMethod> get paymentMethods => _paymentMethods;

  Future<void> _loadPaymentMethods() async {
    try {
      debugPrint('[PosProvider] _loadPaymentMethods: querying for storeId=$_storeId');
      var rows = await _supabase
          .from('payment_methods')
          .select()
          .eq('store_id', _storeId!)
          .order('sort_order');
      if ((rows as List).isEmpty) {
        debugPrint('[PosProvider] No methods for storeId, fetching global methods');
        rows = await _supabase.from('payment_methods').select().order('sort_order');
      }
      debugPrint('[PosProvider] _loadPaymentMethods: got ${(rows as List).length} rows');
      _paymentMethods = (rows as List)
          .map((r) => PaymentMethod.fromJson(r as Map<String, dynamic>))
          .toList();
      debugPrint('[PosProvider] _loadPaymentMethods: parsed ${_paymentMethods.length} methods');
      _safeNotify();
    } catch (e, st) {
      debugPrint('[PosProvider] _loadPaymentMethods ERROR: $e\n$st');
    }
  }

  /// Public refresh — called from PaymentScreen.initState to ensure methods are always fresh.
  Future<void> refreshPaymentMethods() => _loadPaymentMethods();


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
    _safeNotify();
  }

  void removeItem(String itemId) {
    _cart.removeWhere((c) => c.item.id == itemId);
    _draftSnapshotItems.remove(itemId);
    _invalidateFrozenSnapshot();
    _safeNotify();
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
      _safeNotify();
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
      _safeNotify();
    }
  }

  void setCartDiscount(double amount) {
    _cartDiscount = amount.clamp(0, subtotal);
    _safeNotify();
  }

  void clearCart() {
    _cart.clear();
    _draftSnapshotItems.clear();
    _frozenCheckoutSnapshot = null;
    _selectedParty = null;
    _cartDiscount = 0;
    _safeNotify();
  }

  // ── Snapshot / Freeze ──────────────────────────────────────────────────────

  void _invalidateFrozenSnapshot() {
    _frozenCheckoutSnapshot = null;
  }

  /// Captures a frozen snapshot for idempotent checkout. Returns null if cart is empty.
  SaleTransactionSnapshot? freezeSnapshot() {
    if (_cart.isEmpty) return null;
    final items = _cart.map((c) {
      final draft = _draftSnapshotItems[c.item.id];
      return SaleSnapshotItem(
        productId: c.item.id,
        quantity: c.qty,
        unitPriceSnapshot: draft?.unitPriceSnapshot ?? c.item.price,
        discountSnapshot: draft?.discountSnapshot ?? 0,
        stockSnapshot: draft?.stockSnapshot ?? c.item.qtyOnHand,
      );
      clearCart();
      _safeNotify();
      return const SaleExecutionResult(
        status: SaleExecutionStatus.success,
        conflictReason: null,
        message: 'Queued for server validation',
        adjustments: [],
        partialFulfillment: [],
        saleResult: null,
        transactionTraceId: null,
      );
    }

    // Resolve tenant_id from the users table (not JWT — claim is not set in Supabase config).
    String? tenantId;
    try {
      final authId = _supabase.auth.currentUser?.id;
      if (authId != null) {
        final userRow = await _supabase
            .from('users')
            .select('tenant_id')
            .eq('auth_id', authId)
            .maybeSingle();
        tenantId = userRow?['tenant_id'] as String?;
      }
    } catch (e) {
      debugPrint('[PosProvider] Could not resolve tenant_id: $e');
    }

    if (tenantId == null) {
      return SaleExecutionResult(
        status: SaleExecutionStatus.rejected,
        conflictReason: 'tenant_id_missing',
        message: 'Could not resolve tenant. Please sign out and sign in again.',
        adjustments: [],
        partialFulfillment: [],
        saleResult: null,
        transactionTraceId: null,
      );
    }

    // Build payments payload matching record_sale's expected shape:
    // {account_id UUID (ledger_accounts), amount NUMERIC, party_id UUID?}
    // The DB has resolve_payment_ledger_account() that maps payment_method → ledger account.
    final recordSalePayments = <Map<String, dynamic>>[];
    for (final t in tenders) {
      String? ledgerAccountId;
      try {
        final resolved = await _supabase.rpc('resolve_payment_ledger_account', params: {
          'p_store_id': _storeId,
          'p_payment_method_id': t.method.id,
        });
        ledgerAccountId = resolved as String?;
      } catch (e) {
        debugPrint('[PosProvider] resolve_payment_ledger_account failed: $e');
      }
      if (ledgerAccountId == null) {
        return SaleExecutionResult(
          status: SaleExecutionStatus.rejected,
          conflictReason: 'payment_account_not_configured',
          message: 'Ledger account not found for "${t.method.name}". Contact manager.',
          adjustments: const [],
          partialFulfillment: const [],
          saleResult: null,
          transactionTraceId: transactionTraceId,
        );
      }
      recordSalePayments.add({
        'account_id': ledgerAccountId,
        'amount': t.amount,
        'party_id': _selectedParty?.id,
      });
    }

    final recordSaleItems = snapshot.items.map((s) {
      return <String, dynamic>{
        'item_id': s.productId,
        'quantity': s.quantity,
        'unit_price': s.unitPriceSnapshot,
      };
    }).toList();
    _frozenCheckoutSnapshot = SaleTransactionSnapshot(items: items);
    return _frozenCheckoutSnapshot;
  }

  SaleTransactionSnapshot? get frozenSnapshot => _frozenCheckoutSnapshot;

  // ── Checkout ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> completeSale(
    List<PaymentTender> tenders, {
    String? notes,
    String? transactionTraceId,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final frozen = freezeSnapshot();
      if (frozen == null) {
        _setLoading(false);
        _setError('Cart is empty');
        return null;
      }

      final paymentMethodsJson = tenders.map((t) => {
        'method_id': t.method.id,
        'amount': t.amount,
        'reference': t.reference,
      }).toList();

      final result = await _supabase.rpc('complete_sale_transaction', params: {
        'p_store_id': _storeId,
        'p_session_id': _currentSessionId,
        'p_party_id': _selectedParty?.id,
        'p_payment_methods': paymentMethodsJson,
        'p_notes': notes,
        'p_snapshot': frozen.toJson(),
        if (transactionTraceId != null) 'p_trace_id': transactionTraceId,
      });

      if (result != null && result['success'] == true) {
        _cart.clear();
        _draftSnapshotItems.clear();
        _frozenCheckoutSnapshot = null;
        _selectedParty = null;
        _cartDiscount = 0;
        _setLoading(false);
        notifyListeners();
        return result;
      } else {
        _setLoading(false);
        _setError(result?['error']?.toString() ?? 'Transaction failed');
        return null;
      }
      _catalogLoadFailed = false;
      _lastSuccessfulCatalogLoadAt = DateTime.now();
      return items;
    } catch (firstError) {
      _lastPosLoadPath = 'rpc';
      _lastPosLoadError = 'search_rpc_failed: $firstError';
      _lastPosLoadAt = DateTime.now();
      _catalogLoadFailed = true;
      _safeNotify();
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
      _safeNotify();
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
      _safeNotify();
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
      _safeNotify();
      return PosCatalogLoadResult(
        categories: const [],
        items: const [],
        modeUsed: 'rpc',
        error: _lastPosLoadError,
      );
    }
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
    _safeNotify();
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
    _safeNotify();
    return categories;
  }

  PrinterService? get printerService => _printerService;

  /// Safely notifies listeners only when not locked (prevents exceptions when notifyListeners is disallowed)
  void _safeNotify() {
    try {
      notifyListeners();
    } catch (_) {
      // Ignore when _debugLocked is true
    }
  }
}