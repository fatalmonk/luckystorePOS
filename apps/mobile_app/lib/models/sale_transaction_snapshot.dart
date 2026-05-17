import 'pos_models.dart';

class SaleTransactionIntentItem {
  final String itemId;
  final int quantity;
  final double requestedUnitPrice;
  final double lineDiscount;
  final double unitCost;

  const SaleTransactionIntentItem({
    required this.itemId,
    required this.quantity,
    required this.requestedUnitPrice,
    required this.lineDiscount,
    required this.unitCost,
  });

  Map<String, dynamic> toJson() => {
        'item_id': itemId,
        'qty': quantity,
        'unit_price': requestedUnitPrice,
        'discount': lineDiscount,
        'cost': unitCost,
      };

  factory SaleTransactionIntentItem.fromJson(Map<String, dynamic> json) {
    return SaleTransactionIntentItem(
      itemId: json['item_id'] as String,
      quantity: (json['qty'] as num).toInt(),
      requestedUnitPrice: (json['unit_price'] as num).toDouble(),
      lineDiscount: (json['discount'] as num? ?? 0).toDouble(),
      unitCost: (json['cost'] as num? ?? 0).toDouble(),
    );
  }
}

class SaleTransactionIntent {
  final String clientTransactionId;
  final String transactionTraceId;
  final String storeId;
  final String cashierId;
  final String? sessionId;
  final List<SaleTransactionIntentItem> items;
  final List<Map<String, dynamic>> payments;
  final double cartDiscount;
  final DateTime createdAt;
  final String fulfillmentPolicy;

  const SaleTransactionIntent({
    required this.clientTransactionId,
    required this.transactionTraceId,
    required this.storeId,
    required this.cashierId,
    required this.sessionId,
    required this.items,
    required this.payments,
    required this.cartDiscount,
    required this.createdAt,
    this.fulfillmentPolicy = 'STRICT',
  });

  Map<String, dynamic> toJson() => {
        'client_transaction_id': clientTransactionId,
        'transaction_trace_id': transactionTraceId,
        'store_id': storeId,
        'cashier_id': cashierId,
        'session_id': sessionId,
        'items': items.map((e) => e.toJson()).toList(),
        'payments': payments,
        'cart_discount': cartDiscount,
        'created_at': createdAt.toIso8601String(),
        'fulfillment_policy': fulfillmentPolicy,
      };

  factory SaleTransactionIntent.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? const []);
    return SaleTransactionIntent(
      clientTransactionId: json['client_transaction_id'] as String,
      transactionTraceId: json['transaction_trace_id'] as String,
      storeId: json['store_id'] as String,
      cashierId: json['cashier_id'] as String,
      sessionId: json['session_id'] as String?,
      items: rawItems
          .map((e) =>
              SaleTransactionIntentItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(growable: false),
      payments: (json['payments'] as List<dynamic>? ?? const [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(growable: false),
      cartDiscount: (json['cart_discount'] as num? ?? 0).toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
      fulfillmentPolicy: json['fulfillment_policy'] as String? ?? 'STRICT',
    );
  }
}

class SaleSnapshotItem {
  final String productId;
  final int quantity;
  final double unitPriceSnapshot;
  final double discountSnapshot;
  final int stockSnapshot;

  const SaleSnapshotItem({
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

  factory SaleSnapshotItem.fromJson(Map<String, dynamic> json) {
    return SaleSnapshotItem(
      productId: json['product_id'] as String,
      quantity: (json['quantity'] as num).toInt(),
      unitPriceSnapshot: (json['unit_price_snapshot'] as num).toDouble(),
      discountSnapshot: (json['discount_snapshot'] as num? ?? 0).toDouble(),
      stockSnapshot: (json['stock_snapshot'] as num? ?? 0).toInt(),
    );
  }
}

class SaleTransactionSnapshot {
  final String clientTransactionId;
  final String transactionTraceId;
  final String storeId;
  final String userId;
  final List<SaleSnapshotItem> items;
  final DateTime createdAt;
  final String mode;
  final String pricingSource;
  final String inventorySource;

  const SaleTransactionSnapshot({
    required this.clientTransactionId,
    required this.transactionTraceId,
    required this.storeId,
    required this.userId,
    required this.items,
    required this.createdAt,
    required this.mode,
    required this.pricingSource,
    required this.inventorySource,
  });

  Map<String, dynamic> toJson() => {
        'client_transaction_id': clientTransactionId,
        'transaction_trace_id': transactionTraceId,
        'store_id': storeId,
        'user_id': userId,
        'items': items.map((e) => e.toJson()).toList(),
        'created_at': createdAt.toIso8601String(),
        'mode': mode,
        'pricing_source': pricingSource,
        'inventory_source': inventorySource,
      };

  factory SaleTransactionSnapshot.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? const []);
    return SaleTransactionSnapshot(
      clientTransactionId: json['client_transaction_id'] as String,
      transactionTraceId: json['transaction_trace_id'] as String,
      storeId: json['store_id'] as String,
      userId: json['user_id'] as String,
      items: rawItems
          .map((e) => SaleSnapshotItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      createdAt: DateTime.parse(json['created_at'] as String),
      mode: json['mode'] as String? ?? 'online',
      pricingSource: json['pricing_source'] as String? ?? 'rpc',
      inventorySource: json['inventory_source'] as String? ?? 'rpc',
    );
  }
}

SaleSnapshotItem snapshotItemFromCart(CartItem cartItem) {
  return SaleSnapshotItem(
    productId: cartItem.item.id,
    quantity: cartItem.qty,
    unitPriceSnapshot: cartItem.item.price,
    discountSnapshot: cartItem.discount,
    stockSnapshot: cartItem.item.qtyOnHand,
  );
}
