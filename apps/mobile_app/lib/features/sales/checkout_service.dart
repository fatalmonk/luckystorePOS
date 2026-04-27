import 'dart:async';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';
import '../../features/sales/barcode_scanner_service.dart';
import '../../features/sales/cart_controller.dart';
import '../../features/inventory/inventory_repository.dart';
import '../../core/db/drift_database.dart';
import '../../core/db/tables.dart';
import '../../models/product.dart';

/// Checkout service for rapid one-tap checkout
class CheckoutService {
  final CartController cartController;
  final InventoryRepository inventoryRepository;
  final http.Client _client;
  final DatabaseHelper _db;

  bool _isProcessingCheckout = false;
  Duration _averageCheckoutTime = Duration.zero;
  int _checkoutCount = 0;
  StreamController<CheckoutEvent> _eventController;

  CheckoutService({
    required this.cartController,
    required this.inventoryRepository,
    required DatabaseHelper db,
    http.Client? client,
  })  : _client = client ?? http.Client(),
        _db = db,
        _eventController = StreamController<CheckoutEvent>.broadcast();

  Stream<CheckoutEvent> get eventStream => _eventController.stream;

  bool get isProcessingCheckout => _isProcessingCheckout;
  
  Duration get averageCheckoutTime => _averageCheckoutTime;

  /// One-tap checkout optimized for speed
  /// Flow: Validate → Deduct Stock → Create Sale → Print Receipt
  Future<Result<CheckoutResult>> oneTapCheckout({
    String? paymentReference,
    int paymentAmount = 0,
  }) async {
    if (_isProcessingCheckout) {
      return Failure<CheckoutResult>('Checkout already in progress');
    }

    final stopwatch = Stopwatch()..start();
    _isProcessingCheckout = true;

    try {
      // Step 1: Validate cart
      final validation = _validateCart();
      if (!validation.isSuccess) {
        _broadcastEvent(CheckoutEvent('validation_failed', error: validation.data));
        return validation;
      }

      // Step 2: Validate stock levels
      final stockValidation = await _validateStockLevels();
      if (!stockValidation.isSuccess) {
        _broadcastEvent(CheckoutEvent('stock_invalid', error: stockValidation.data));
        return stockValidation;
      }

      // Step 3: Deduct stock (atomic)
      final deductionResult = await _deductStockAtomic();
      if (deductionResult.isFailure) {
        _broadcastEvent(CheckoutEvent('stock_deduction_failed', error: deductionResult.data!));
        return rejection;
      }

      // Step 4: Create sale transaction
      final createResult = await _createSaleTransaction(
        stockDeductionResult: deductionResult.data!,
        paymentReference: paymentReference,
        paymentAmount: paymentAmount,
      );

      if (createResult.isFailure) {
        _broadcastEvent(CheckoutEvent('sale_creation_failed', error: createResult.data!));
        return createResult;
      }

      stopwatch.stop();
      _updateAverageCheckoutTime(stopwatch.elapsed);

      // Step 5: Mark cart items as synced
      await _cleanCartAfterSuccess();

      _broadcastEvent(CheckoutEvent('checkout_completed', saleId: createResult.data!.saleId));

      return Success<CheckoutResult>(CheckoutResult(
        saleId: createResult.data!.saleId,
        checkoutTime: stopwatch.elapsed,
        stockDeductionResult: deductionResult.data!,
        paymentAmount: paymentAmount,
        totalAmount: cartController.total,
        itemCount: cartController.itemCount,
      ));

    } catch (e, stackTrace) {
      Logger.error('CheckoutService.oneTapCheckout failed', e, stackTrace);
      _broadcastEvent(CheckoutEvent('checkout_error', error: e.toString()));
      return Failure<CheckoutResult>('Checkout failed: $e');
    } finally {
      _isProcessingCheckout = false;
    }
  }

  /// Validate cart has items
  Result<bool> _validateCart() {
    if (cartController.items.isEmpty) {
      return Failure<bool>('Cart is empty');
    }

    if (cartController.hasStockIssues) {
      return Failure<bool>('Stock issues detected');
    }

    return Success<bool>(true);
  }

  /// Validate stock levels before checkout
  Future<Result<bool>> _validateStockLevels() async {
    try {
      final storeId = cartController.storeId;

      for (final item in cartController.items) {
        final available = await inventoryRepository.getStockQuantity(
          storeId: storeId,
          productId: item.product.id,
        );

        if (available < item.quantity) {
          return Failure<bool>(
            'Insufficient stock for ${item.product.name}: available=$available, required=${item.quantity}',
          );
        }
      }

      return Success<bool>(true);
    } catch (e) {
      return Failure<bool>('Stock validation failed: $e');
    }
  }

  /// Atomic stock deduction with error handling
  Future<Result<StockDeductionResult>> _deductStockAtomic() async {
    final storeId = cartController.storeId;
    final saleId = DateTime.now().millisecondsSinceEpoch.toString();

    // Prepare batch request
    final requests = cartController.items.map((item) {
      return StockDeductionRequest(
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        saleId: saleId,
      );
    }).toList();

    // Batch deduct stock
    final deductionResult = await inventoryRepository.batchDeductStock(
      storeId: storeId,
      requests: requests,
    );

    if (deductionResult.isFailure) {
      Logger.error('Stock deduction failed: ${deductionResult.data}');
      return Failure<StockDeductionResult>(deductionResult.data);
    }

    return Success<StockDeductionResult>(StockDeductionResult(
      movementId: saleId,
      newQuantity: 0,
      previousQuantity: 0,
      deducted: 0,
    ));
  }

  /// Create sale transaction after stock deduction
  Future<Result<SaleCreationResult>> _createSaleTransaction({
    required StockDeductionResult stockDeductionResult,
    required String? paymentReference,
    required int paymentAmount,
  }) async {
    try {
      final storeId = cartController.storeId;
      const saleId = DateTime.now().millisecondsSinceEpoch.toString();

      // Build sale payload
      final saleData = {
        'store_id': storeId,
        'sale_id': saleId,
        'sale_time': DateTime.now().toIso8601String(),
        'total_amount': cartController.total,
        'subtotal': cartController.subtotal,
        'discount_total': cartController.discountTotal,
        'tax_amount': cartController.taxAmount,
        'item_count': cartController.itemCount,
        'payment_amount': paymentAmount, // Customer pays this amount
        'change_amount': paymentAmount - cartController.total,
        'payment_reference': paymentReference,
        'payment_mode': 1, // 1 = cash, 2 = bkash, 3 = card
        'idempotency_key': saleId,
        'items': cartController.items.map((item) => {
          'product_id': item.product.id,
          'product_name': item.product.name,
          'quantity': item.quantity,
          'price': item.price,
          'discount': item.discount,
          'discount_type': item.discountType,
          'total': item.itemTotal,
          'barcode': item.barcode,
        }).toList(),
      };

      // Post to server
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/create-sale',
      );

      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
        'apikey': NetworkConfig.supabaseAnonKey,
      };

      final response = await _client
          .post(url, headers: headers, body: json.encode(saleData))
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        final serverSaleId = data['success']['sale_id'];

        return Success<SaleCreationResult>(SaleCreationResult(
          saleId: serverSaleId,
          idempotencyKey: saleId,
          timestamp: DateTime.now(),
        ));
      } else {
        final error = json.decode(response.body);
        return Failure('Failed to create sale: ${error['error']}');
      }
    } catch (e, stackTrace) {
      Logger.error('CheckoutService._createSaleTransaction failed', e, stackTrace);
      return Failure('Transaction failed: $e');
    }
  }

  /// Clean up cart after successful checkout
  Future<void> _cleanCartAfterSuccess() async {
    // Store cart for recovery in case of issues
    final savedCart = cartController.saveState();
    
    // Clear cart
    cartController.clear();
    
    // Save to database for offline recovery
    try {
      await _db.offlineSales.insert(OfflineSalesCompanion(
        id: Value(savedCart.id),
        syncStatus: const Value('processed'),
        updatedAt: Value(DateTime.now()),
      ));
    } catch (e) {
      Logger.warning('Failed to save cart recovery data: $e');
    }
  }

  /// Broadcast checkout event
  void _broadcastEvent(CheckoutEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  /// Listen to checkout events
  StreamSubscription<CheckoutEvent>? listenToEvents(
    void Function(CheckoutEvent event) onData, {
    Function? onError,
    VoidCallback? onDone,
  }) {
    return _eventController.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
    );
  }

  /// Update average checkout time
  void _updateAverageCheckoutTime(Duration time) {
    _checkoutCount++;
    _averageCheckoutTime = Duration(
      milliseconds: (
        (_averageCheckoutTime.inMilliseconds * (_checkoutCount - 1) +
                time.inMilliseconds) /
            _checkoutCount
      ).round(),
    );
  }

  /// Dispose
  void dispose() {
    _eventController.close();
    _client.close();
  }
}

/// Checkout result
class CheckoutResult {
  final String saleId;
  final Duration checkoutTime;
  final StockDeductionResult stockDeductionResult;
  final int paymentAmount;
  final double totalAmount;
  final int itemCount;

  const CheckoutResult({
    required this.saleId,
    required this.checkoutTime,
    required this.stockDeductionResult,
    required this.paymentAmount,
    required this.totalAmount,
    required this.itemCount,
  });

  bool get isFast => checkoutTime.inMilliseconds < 2000; // <2s is fast
}

/// Sale creation result
class SaleCreationResult {
  final String saleId;
  final String idempotencyKey;
  final DateTime timestamp;

  const SaleCreationResult({
    required this.saleId,
    required this.idempotencyKey,
    required this.timestamp,
  });
}

/// Checkout event types
class CheckoutEvent {
  final String type;
  final String? error;
  final String? saleId;
  final Map<String, dynamic>? data;

  CheckoutEvent(
    this.type, {
    this.error,
    this.saleId,
    this.data,
  });

  @override
  String toString() {
    return 'CheckoutEvent('
        'type: $type, '
        'error: $error, '
        'saleId: $saleId'
        ')';
  }
}
