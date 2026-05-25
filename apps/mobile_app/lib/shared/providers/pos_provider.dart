import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
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

  SaleTransactionSnapshot({
    required this.items,
    this.expectedRevision,
  }) : capturedAt = DateTime.now();

  Map<String, dynamic> toJson() => {
    'items': items.map((i) => i.toJson()).toList(),
    'captured_at': capturedAt.toIso8601String(),
    'expected_revision': expectedRevision,
  };
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
    _isLoading = v;
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

  // ── Initialization ─────────────────────────────────────────────────────────

  PosProvider({required SupabaseClient supabase, PrinterService? printerService})
    : _supabase = supabase,
      _printerService = printerService;

  Future<void> init(String storeId) async {
    _storeId = storeId;
    await _loadPaymentMethods();
  }

  // ── Session Management ─────────────────────────────────────────────────────

  String? _currentSessionId;
  String? get currentSessionId => _currentSessionId;

  Future<bool> openSession({required String openedBy, required double openingBalance}) async {
    _setLoading(true);
    _setError(null);
    try {
      final result = await _supabase.rpc('open_pos_session', params: {
        'p_store_id': _storeId,
        'p_opened_by': openedBy,
        'p_opening_balance': openingBalance,
      });
      if (result != null && result['success'] == true) {
        _currentSessionId = result['session_id'] as String?;
        if (_currentSessionId != null) {
          _setLoading(false);
          notifyListeners();
          return true;
        }
      }
      _setLoading(false);
      _setError('Failed to open session');
      return false;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to open session: $e');
      return false;
    }
  }

  Future<bool> closeSession({required String closedBy, required double closingBalance, String? note}) async {
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


  // ── Party Selection ─────────────────────────────────────────────────────────

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

  void clear() {
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
    } catch (e) {
      _setLoading(false);
      _setError('Checkout failed: $e');
      return null;
    }
  }

  // ── Printer ─────────────────────────────────────────────────────────────────

  void attachPrinter(PrinterService printer) {
    _printerService = printer;
    notifyListeners();
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