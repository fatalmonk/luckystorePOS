import 'package:flutter/foundation.dart';
import '../../models/product.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';
import '../../core/errors/exceptions.dart';

/// Cart item representation
class CartItem {
  final Product product;
  int quantity;
  final double price;
  final double discount;
  final double? discountType; // 'percentage' or null
  final String? barcode;

  CartItem({
    required this.product,
    required this.quantity,
    required this.price,
    this.discount = 0.0,
    this.discountType,
    this.barcode,
  });

  double get itemTotal {
    if (discountType == 'percentage') {
      return price * quantity * (1 - discount / 100);
    }
    return price * quantity - discount;
  }

  /// Check if item can be added more
  bool canAddMore(int maxStock) {
    return quantity < maxStock;
  }
}

/// Cart controller for centralized state management
class CartController extends ChangeNotifier {
  final List<CartItem> _items = [];
  
  // Performance metrics
  Duration _averageAddTime = Duration.zero;
  int _addCount = 0;
  
  // Offline mode support
  bool _isOfflineMode = false;
  final String _storeId;
  
  // Validation flags
  bool _hasStockIssues = false;
  bool _hasTaxCalculations = false;
  bool _isCheckoutDisabled = false;

  CartController({required String storeId}) : _storeId = storeId;

  // ===== State Getters =====

  List<CartItem> get items => List.unmodifiable(_items);
  
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  
  double get subtotal {
    return _items.fold(0.0, (sum, item) => sum + item.itemTotal);
  }
  
  double get discountTotal {
    return _items.fold(0.0, (sum, item) {
      if (item.discountType == 'percentage') {
        return sum + (item.price * item.quantity * item.discount / 100);
      }
      return sum + item.discount;
    });
  }
  
  double get taxAmount {
    // TODO: Implement proper tax calculation
    // For now, return 5% tax
    return subtotal * 0.05;
  }
  
  double get total => subtotal + taxAmount;
  
  String get storeId => _storeId;
  
  bool get isOfflineMode => _isOfflineMode;
  
  bool get hasStockIssues => _hasStockIssues;
  
  bool get isCheckoutDisabled => _isCheckoutDisabled;
  
  /// Average time to add item to cart
  Duration get averageAddTime => _averageAddTime;
  
  /// Cart performance metrics
  Map<String, dynamic> get performanceMetrics {
    return {
      'itemCount': itemCount,
      'totalItems': items.length,
      'subtotal': subtotal,
      'discountTotal': discountTotal,
      'taxAmount': taxAmount,
      'total': total,
      'averageAddTimeMs': averageAddTime.inMilliseconds,
      'isOfflineMode': _isOfflineMode,
    };
  }
  
  // ===== Core Cart Operations =====

  /// Add item to cart (optimized for instant speed)
  /// Returns: Result with added item or error
  Future<Result<CartItem>> addItem({
    required Product product,
    int quantity = 1,
    double? customPrice,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    try {
      // Step 1: Check if item already exists in cart
      final existingIndex = _items.indexWhere((item) => item.product.id == product.id);
      
      if (existingIndex != -1) {
        // Update existing item quantity
        final existingItem = _items[existingIndex];
        
        if (existingItem.canAddMore(product.stock)) {
          _items[existingIndex] = CartItem(
            product: existingItem.product,
            quantity: _items[existingIndex].quantity + quantity,
            price: customPrice ?? existingItem.price,
            discount: existingItem.discount,
            discountType: existingItem.discountType,
          );
        } else {
          _hasStockIssues = true;
          return Failure<CartItem>(
            'Insufficient stock for ${product.name}',
            metadata: {
              'productId': product.id,
              'requested': quantity,
              'available': product.stock,
            },
          );
        }
      } else {
        // Add new item to cart
        _items.add(CartItem(
          product: product,
          quantity: quantity,
          price: customPrice ?? product.sellingPrice ?? product.mrp ?? 0.0,
          barcode: product.barcode,
        ));
      }

      stopwatch.stop();
      _updateAverageTime(stopwatch.elapsed);
      
      if (_isOfflineMode) {
        await _syncCartItemAdded(product.id, quantity);
      }

      notifyListeners();
      
      return Success<CartItem>(_items.last);
    } catch (e, stackTrace) {
      Logger.error('CartController.addItem failed', e, stackTrace);
      return Failure<CartItem>('Failed to add item: ${e.toString()}');
    }
  }

  /// Remove item from cart
  void removeItem(int index) {
    if (index >= 0 && index < _items.length) {
      _items.removeAt(index);
      _hasStockIssues = false;
      notifyListeners();
    }
  }

  /// Remove specific item
  void removeItemByProductId(String productId) {
    final index = _items.indexWhere((item) => item.product.id == productId);
    if (index != -1) {
      removeItem(index);
    }
  }

  /// Update item quantity
  void updateItemQuantity(int index, int quantity) {
    if (index < 0 || index >= _items.length || quantity <= 0) {
      return;
    }

    final item = _items[index];
    
    if (item.canAddMore(item.product.stock)) {
      final updatedItem = CartItem(
        product: item.product,
        quantity: quantity,
        price: item.price,
        discount: item.discount,
        discountType: item.discountType,
        barcode: item.barcode,
      );
      
      _items[index] = updatedItem;
      _hasStockIssues = false;
      notifyListeners();
    } else {
      _hasStockIssues = true;
    }
  }

  /// Apply discount to item
  void applyDiscount(int index, double discount, {String? discountType}) {
    if (index < 0 || index >= _items.length) {
      return;
    }

    final item = _items[index];
    final updatedItem = CartItem(
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      discount: discount,
      discountType: discountType,
      barcode: item.barcode,
    );

    _items[index] = updatedItem;
    notifyListeners();
  }

  /// Apply discount to all items
  void applyDiscountToAll(double discount, {String? discountType}) {
    for (int i = 0; i < _items.length; i++) {
      applyDiscount(i, discount, discountType: discountType);
    }
  }

  /// Clear cart
  void clear() {
    _items.clear();
    _hasStockIssues = false;
    _isCheckoutDisabled = false;
    notifyListeners();
  }

  /// Checkout ready validation
  bool validateCheckout() {
    if (_items.isEmpty) {
      _isCheckoutDisabled = true;
      return false;
    }

    if (_hasStockIssues) {
      _isCheckoutDisabled = true;
      return false;
    }

    return true;
  }

  // ===== Offline Mode Operations =====

  /// Enable offline mode
  void enableOfflineMode() {
    _isOfflineMode = true;
    _syncPendingCart();
    notifyListeners();
  }

  /// Disable offline mode
  void disableOfflineMode() {
    _isOfflineMode = false;
    _syncPendingCart();
    notifyListeners();
  }

  /// Sync cart to server when back online
  Future<void> _syncPendingCart() async {
    // TODO: Implement cart sync with server for collaborative shopping
    Logger.debug('Cart synced (offline mode: $_isOfflineMode)');
  }

  /// Sync cart item added event
  Future<void> _syncCartItemAdded(String productId, int quantity) async {
    // TODO: Implement sync of cart changes
    Logger.debug('Synced cart add: $productId x$quantity');
  }

  // ===== Performance Optimizations =====

  /// Optimize cart for fast checkout
  void optimizeForFastCheckout() {
    // Remove items with zero quantity
    _items.removeWhere((item) => item.quantity <= 0);
    
    // Sort by recent additions first
    // TODO: Add timestamp to each item for better sorting
    
    _hasStockIssues = false;
    _isCheckoutDisabled = false;
    notifyListeners();
  }

  /// Pre-calculate tax for performance
  void precalculateTax(double taxRate) {
    // For future use, pre-calculate tax amounts
    for (var item in _items) {
      // TODO: Set item tax
    }
    _hasTaxCalculations = true;
    notifyListeners();
  }

  // ===== History & Recovery =====

  /// Get last scanned barcode (for instant repeat scan)
  String? lastScannedBarcode;

  /// Set last scanned barcode
  void setLastScanned(Product product) {
    lastScannedBarcode = product.barcode;
  }

  // ===== Utility Methods =====

  /// Get item total with formatting
  String getItemTotalFormatted(int index) {
    if (index < 0 || index >= _items.length) return '৳0';
    return '৳${_items[index].itemTotal.toStringAsFixed(2)}';
  }

  /// Quick add common quantities
  void quickAddCommonQuantity(int quantity) {
    if (lastScannedBarcode != null) {
      // TODO: Find product by barcode and add
      Logger.debug('Quick add: $lastScannedBarcode x$quantity');
    }
  }

  // ===== Private Methods =====

  void _updateAverageTime(Duration addTime) {
    _addCount++;
    _averageAddTime = Duration(
      milliseconds: (
        (_averageAddTime.inMilliseconds * (_addCount - 1) +
                addTime.inMilliseconds) /
            _addCount
      ).round(),
    );
  }

  /// Save cart state for session recovery
  CartState saveState() {
    return CartState(
      items: _items.map((i) => i.toJson()).toList(),
      isOfflineMode: _isOfflineMode,
      lastScannedBarcode: lastScannedBarcode,
    );
  }

  /// Restore cart state from saved session
  void restoreState(CartState state) {
    _items.clear();
    for (final itemJson in state.items) {
      final item = CartItem.fromJson(itemJson);
      _items.add(item);
    }
    _isOfflineMode = state.isOfflineMode;
    lastScannedBarcode = state.lastScannedBarcode;
    _hasStockIssues = state.hasStockIssues;
    notifyListeners();
  }

  // ===== Dispose =====

  void dispose() {
    _items.clear();
  }
}

/// Cart item JSON for serialization
class CartItemJson {
  final Map<String, dynamic> product;
  final int quantity;
  final double price;
  final double discount;
  final String? discountType;
  final String? barcode;

  CartItemJson({
    required this.product,
    required this.quantity,
    required this.price,
    required this.discount,
    this.discountType,
    this.barcode,
  });

  factory CartItemJson.fromJson(Map<String, dynamic> json) {
    return CartItemJson(
      product: Map<String, dynamic>.from(json['product'] as Object),
      quantity: json['quantity'] as int,
      price: (json['price'] as num).toDouble(),
      discount: (json['discount'] as num?).toDouble() ?? 0.0,
      discountType: json['discount_type'] as String?,
      barcode: json['barcode'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'product': product,
    'quantity': quantity,
    'price': price,
    'discount': discount,
    'discount_type': discountType,
    'barcode': barcode,
  };
}

/// Cart state for saving/restoring session
class CartState {
  final List<Map<String, dynamic>> items;
  final bool isOfflineMode;
  final String? lastScannedBarcode;
  final bool hasStockIssues;

  CartState({
    required this.items,
    required this.isOfflineMode,
    this.lastScannedBarcode,
    this.hasStockIssues = false,
  });
}
