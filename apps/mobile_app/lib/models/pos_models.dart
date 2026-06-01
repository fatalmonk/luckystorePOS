/// POS-specific data models for Lucky Store POS system
library;

// ---------------------------------------------------------------------------
// PosLoadState — UI state for product catalog loading
// ---------------------------------------------------------------------------
enum PosLoadState { loading, ready, empty, error }

// ---------------------------------------------------------------------------
// PosItem — product as returned by lookup_item_by_scan / search_items_pos
// ---------------------------------------------------------------------------
class PosItem {
  final String id;
  final String sku;
  final String? barcode;
  final String? shortCode;
  final String name;
  final String? brand;
  final double price;
  final double mrp;
  final double cost;
  final String? imageUrl;
  final String? category;
  final String? categoryId;
  final String? groupTag;
  final int qtyOnHand;

  const PosItem({
    required this.id,
    required this.sku,
    this.barcode,
    this.shortCode,
    required this.name,
    this.brand,
    required this.price,
    required this.mrp,
    this.cost = 0,
    this.imageUrl,
    this.category,
    this.categoryId,
    this.groupTag,
    this.qtyOnHand = 0,
  });

  factory PosItem.fromJson(Map<String, dynamic> json) {
    // I20: Add null fallbacks for required fields to prevent crashes
    final id = json['id'] as String?;
    final sku = json['sku'] as String?;
    final name = json['name'] as String?;

    if (id == null || sku == null || name == null) {
      throw FormatException('PosItem missing required fields: id=$id, sku=$sku, name=$name');
    }

    return PosItem(
      id:         id,
      sku:        sku,
      barcode:    json['barcode']     as String?,
      shortCode:  json['short_code']  as String?,
      name:       name,
      brand:      json['brand']       as String?,
      price:      (json['price'] as num?)?.toDouble() ?? (throw AssertionError('PosItem price is required and must be a valid number')),
      mrp:        (json['mrp']        as num?)?.toDouble() ?? 0.0,
      cost:       (json['cost']       as num?)?.toDouble() ?? 0.0,
      imageUrl:   json['image_url']   as String?,
      category:   json['category']    as String?,
      categoryId: json['category_id'] as String?,
      groupTag:   json['group_tag']   as String?,
      qtyOnHand:  (json['qty_on_hand'] as num?)?.toInt() ?? 0,
    );
  }

}

// ---------------------------------------------------------------------------
// CartItem — item + qty in the active cart
// ---------------------------------------------------------------------------
class CartItem {
  final PosItem item;
  int qty;
  double discount; // per-line discount in ৳

  CartItem({
    required this.item,
    this.qty = 1,
    this.discount = 0,
  });

  double get lineTotal => (item.price - discount) * qty;
  double get lineDiscount => discount * qty;
}

// ---------------------------------------------------------------------------
// PaymentMethod — rows from payment_methods table
// ---------------------------------------------------------------------------
class PaymentMethod {
  final String id;
  final String name;
  final String type; // 'cash' | 'mobile_banking' | 'card'

  const PaymentMethod({
    required this.id,
    required this.name,
    required this.type,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id:   json['id']   as String,
      name: json['name'] as String,
      type: json['type'] as String,
    );
  }
}

// ---------------------------------------------------------------------------
// PaymentTender — one tender entry in a split payment
// ---------------------------------------------------------------------------
class PaymentTender {
  final PaymentMethod method;
  double amount;
  String? reference; // bKash TrxID, card last-4, etc.

  PaymentTender({
    required this.method,
    required this.amount,
    this.reference,
  });
}

// ---------------------------------------------------------------------------
// SaleResult — returned by complete_sale() RPC
// ---------------------------------------------------------------------------
class SaleResult {
  final String saleId;
  final String saleNumber;
  final double subtotal;
  final double discount;
  final double totalAmount;
  final double tendered;
  final double changeDue;
  final List<CartItem>? items;
  final List<PricingResult> pricingResults;
  final double totalSavings;

  const SaleResult({
    required this.saleId,
    required this.saleNumber,
    required this.subtotal,
    required this.discount,
    required this.totalAmount,
    required this.tendered,
    required this.changeDue,
    this.items,
    this.pricingResults = const [],
    this.totalSavings = 0,
  });

  factory SaleResult.fromJson(Map<String, dynamic> json, {List<CartItem>? items}) {
    final pricingRaw = (json['pricing_results'] as List<dynamic>? ?? const []);
    return SaleResult(
      saleId:      json['sale_id']      as String,
      saleNumber:  json['sale_number']  as String,
      subtotal:    (json['subtotal']    as num).toDouble(),
      discount:    (json['discount']    as num? ?? 0).toDouble(),
      totalAmount: (json['total_amount'] as num).toDouble(),
      tendered:    (json['tendered']    as num).toDouble(),
      changeDue:   (json['change_due']  as num).toDouble(),
      items:       items,
      pricingResults: pricingRaw
          .map((row) => PricingResult.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList(growable: false),
      totalSavings: (json['total_savings'] as num? ?? 0).toDouble(),
    );
  }
}

class PricingResult {
  final String itemId;
  final int qty;
  final double mrp;
  final double sellingPrice;
  final double unitDiscount;
  final double totalSavings;

  const PricingResult({
    required this.itemId,
    required this.qty,
    required this.mrp,
    required this.sellingPrice,
    required this.unitDiscount,
    required this.totalSavings,
  });

  factory PricingResult.fromJson(Map<String, dynamic> json) {
    return PricingResult(
      itemId: json['item_id'] as String,
      qty: (json['qty'] as num? ?? 0).toInt(),
      mrp: (json['mrp'] as num? ?? 0).toDouble(),
      sellingPrice: (json['selling_price'] as num? ?? 0).toDouble(),
      unitDiscount: (json['unit_discount'] as num? ?? 0).toDouble(),
      totalSavings: (json['total_savings'] as num? ?? 0).toDouble(),
    );
  }
}

enum SaleExecutionStatus { success, adjusted, rejected, conflict }

class SaleExecutionResult {
  final SaleExecutionStatus status;
  final String? conflictReason;
  final String? message;
  final List<Map<String, dynamic>> adjustments;
  final List<Map<String, dynamic>> partialFulfillment;
  final SaleResult? saleResult;
  final String? transactionTraceId;

  const SaleExecutionResult({
    required this.status,
    required this.conflictReason,
    required this.message,
    required this.adjustments,
    required this.partialFulfillment,
    required this.saleResult,
    required this.transactionTraceId,
  });

  bool get isSuccess =>
      status == SaleExecutionStatus.success ||
      status == SaleExecutionStatus.adjusted;
}

// ---------------------------------------------------------------------------
// PosCategory — for filter chips
// ---------------------------------------------------------------------------
class PosCategory {
  final String id;
  final String name;
  final int itemCount;

  const PosCategory({
    required this.id,
    required this.name,
    required this.itemCount,
  });

  factory PosCategory.fromJson(Map<String, dynamic> json) {
    return PosCategory(
      id:        json['id']         as String,
      name:      json['name']       as String,
      itemCount: (json['item_count'] as num? ?? 0).toInt(),
    );
  }
}

// ---------------------------------------------------------------------------
// PosSession — cashier shift session
// ---------------------------------------------------------------------------
class PosSession {
  final String id;
  final String sessionNumber;
  final String cashierId;
  final String storeId;
  final DateTime openedAt;

  const PosSession({
    required this.id,
    required this.sessionNumber,
    required this.cashierId,
    required this.storeId,
    required this.openedAt,
  });

  factory PosSession.fromJson(Map<String, dynamic> json) {
    final openedAtStr = json['opened_at'] as String?;
    if (openedAtStr == null) {
      throw AssertionError('PosSession opened_at is required');
    }
    final openedAt = DateTime.tryParse(openedAtStr);
    if (openedAt == null) {
      throw AssertionError('PosSession opened_at must be a valid ISO 8601 datetime');
    }

    final id = json['id'] as String?;
    if (id == null || id.isEmpty) {
      throw AssertionError('PosSession id is required');
    }
    final sessionNumber = json['session_number'] as String?;
    if (sessionNumber == null || sessionNumber.isEmpty) {
      throw AssertionError('PosSession session_number is required');
    }
    final cashierId = json['cashier_id'] as String?;
    if (cashierId == null || cashierId.isEmpty) {
      throw AssertionError('PosSession cashier_id is required');
    }
    final storeId = json['store_id'] as String?;
    if (storeId == null || storeId.isEmpty) {
      throw AssertionError('PosSession store_id is required');
    }

    return PosSession(
      id:            id,
      sessionNumber: sessionNumber,
      cashierId:     cashierId,
      storeId:       storeId,
      openedAt:      openedAt,
    );
  }
}
