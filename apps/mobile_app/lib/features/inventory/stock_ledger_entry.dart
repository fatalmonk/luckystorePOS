import 'package:flutter/foundation.dart';

/// Stock ledger entry types
enum LedgerEntryType {
  purchase,
  sale,
  returnIn,
  returnOut,
  adjustment,
  transferIn,
  transferOut,
  voidedSale,
  inventoryCount,
}

/// Expand LedgerEntryType to String
extension LedgerEntryTypeExtension on LedgerEntryType {
  String get value {
    switch (this) {
      case LedgerEntryType.purchase:
        return 'purchase';
      case LedgerEntryType.sale:
        return 'sale';
      case LedgerEntryType.returnIn:
        return 'return_in';
      case LedgerEntryType.returnOut:
        return 'return_out';
      case LedgerEntryType.adjustment:
        return 'adjustment';
      case LedgerEntryType.transferIn:
        return 'transfer_in';
      case LedgerEntryType.transferOut:
        return 'transfer_out';
      case LedgerEntryType.voidedSale:
        return 'voided_sale';
      case LedgerEntryType.inventoryCount:
        return 'inventory_count';
    }
  }
}

/// Stock ledger entry representing a single inventory movement
@immutable
class StockLedgerEntry {
  /// Unique identifier for this ledger entry
  final String id;

  /// Store ID where the movement occurred
  final String storeId;

  /// Product/SKU identifier
  final String productId;

  /// Product name (denormalized for reporting)
  final String productName;

  /// Quantity change (positive for additions, negative for deductions)
  final int quantity;

  /// Ledger entry type
  final LedgerEntryType entryType;

  /// Reason for the movement
  final String reason;

  /// Additional metadata about the movement
  final Map<String, dynamic>? metadata;

  /// Reference ID (e.g., sale_id, purchase_order_id)
  final String? referenceId;

  /// Timestamp of when the movement was recorded
  final DateTime timestamp;

  /// User who initiated the movement
  final String? performedBy;

  /// Previous quantity before this movement
  final int? previousQuantity;

  /// New quantity after this movement
  final int? newQuantity;

  const StockLedgerEntry({
    required this.id,
    required this.storeId,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.entryType,
    required this.reason,
    this.metadata,
    this.referenceId,
    required this.timestamp,
    this.performedBy,
    this.previousQuantity,
    this.newQuantity,
  });

  /// Create from API response
  factory StockLedgerEntry.fromJson(Map<String, dynamic> json) {
    return StockLedgerEntry(
      id: json['id'] as String,
      storeId: json['store_id'] as String,
      productId: (json['item_id'] ?? json['product_id'] ?? '') as String,
      productName: json['product_name'] as String? ?? '',
      quantity: (json['quantity_delta'] ?? json['quantity'] ?? 0) as int,
      entryType: LedgerEntryType.values.firstWhere(
        (e) => e.value == (json['movement_type'] ?? json['entry_type']),
        orElse: () => LedgerEntryType.sale,
      ),
      reason: (json['notes'] ?? json['reason'] ?? '') as String,
      metadata: json['metadata'] != null
          ? Map<String, dynamic>.from(json['metadata'])
          : null,
      referenceId: json['reference_id'] as String?,
      timestamp: DateTime.parse((json['created_at'] ?? json['timestamp']) as String),
      performedBy: json['performed_by'] as String?,
      previousQuantity: json['previous_quantity'] as int?,
      newQuantity: json['new_quantity'] as int?,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'store_id': storeId,
      'product_id': productId,
      'product_name': productName,
      'quantity': quantity,
      'entry_type': entryType.value,
      'reason': reason,
      'metadata': metadata,
      'reference_id': referenceId,
      'timestamp': timestamp.toIso8601String(),
      'performed_by': performedBy,
      'previous_quantity': previousQuantity,
      'new_quantity': newQuantity,
    };
  }

  /// Check if this is a deduction
  bool get isDeduction => quantity < 0;

  /// Check if this is an addition
  bool get isAddition => quantity > 0;

  /// Calculate net impact on stock
  int get netImpact => quantity;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StockLedgerEntry &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'StockLedgerEntry('
        'id: $id, '
        'product: $productId, '
        'qty: $quantity, '
        'type: $entryType, '
        'reason: $reason, '
        'timestamp: $timestamp'
        ')';
  }
}


/// Query parameters for stock ledger queries
class StockLedgerQuery {
  final String? storeId;
  final String? productId;
  final String? entryType;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? reason;
  final int? limit;
  final int? offset;
  final String? sortBy;
  final String? sortOrder;

  const StockLedgerQuery({
    this.storeId,
    this.productId,
    this.entryType,
    this.startDate,
    this.endDate,
    this.reason,
    this.limit = 100,
    this.offset = 0,
    this.sortBy = 'timestamp',
    this.sortOrder = 'desc',
  });

  Map<String, String> toParams() {
    final params = <String, String>{};

    if (storeId != null) params['store_id.eq'] = storeId!;
    if (productId != null) params['item_id.eq'] = productId!; // Canonical: item_id
    if (entryType != null) params['movement_type.eq'] = entryType!; // Canonical: movement_type
    if (reason != null) params['notes.eq'] = reason!; // Canonical: notes
    
    // Handle sort logic realignment from 'timestamp' to 'created_at'
    final actualSortBy = (sortBy == 'timestamp') ? 'created_at' : sortBy;
    if (actualSortBy != null) params['order'] = '$actualSortBy.$sortOrder';
    if (offset != null) params['offset'] = offset!.toString();
    if (limit != null) params['limit'] = limit!.toString();

    return params;
  }
}
