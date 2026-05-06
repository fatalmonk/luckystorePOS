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
    this.cost = 0,
    this.imageUrl,
    this.category,
    this.categoryId,
    this.groupTag,
    this.qtyOnHand = 0,
  });

  factory PosItem.fromJson(Map<String, dynamic> json) {
    return PosItem(
      id:         json['id']          as String,
      sku:        json['sku']         as String,
      barcode:    json['barcode']     as String?,
      shortCode:  json['short_code']  as String?,
      name:       json['name']        as String,
      brand:      json['brand']       as String?,
      price:      (json['price']      as num).toDouble(),
      cost:       (json['cost']       as num? ?? 0).toDouble(),
      imageUrl:   json['image_url']   as String?,
      category:   json['category']    as String?,
      categoryId: json['category_id'] as String?,
      groupTag:   json['group_tag']   as String?,
      qtyOnHand:  (json['qty_on_hand'] as num? ?? 0).toInt(),
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
    return PosSession(
      id:            json['id']             as String,
      sessionNumber: json['session_number'] as String,
      cashierId:     json['cashier_id']     as String,
      storeId:       json['store_id']       as String,
      openedAt:      DateTime.parse(json['opened_at'] as String),
    );
  }
}
