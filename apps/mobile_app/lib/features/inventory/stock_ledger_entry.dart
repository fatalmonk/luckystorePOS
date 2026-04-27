import 'package:flutter/foundation.dart';

/// Stock ledger entry types
enum LedgerEntryType {
  purchase,
  sale,
  return_in,
  return_out,
  adjustment,
  transfer_in,
  transfer_out,
  voided_sale,
  inventory_count,
}

/// Expand LedgerEntryType to String
extension LedgerEntryTypeExtension on LedgerEntryType {
  String get value {
    switch (this) {
      case LedgerEntryType.purchase:
        return 'purchase';
      case LedgerEntryType.sale:
        return 'sale';
      case LedgerEntryType.return_in:
        return 'return_in';
      case LedgerEntryType.return_out:
        return 'return_out';
      case LedgerEntryType.adjustment:
        return 'adjustment';
      case LedgerEntryType.transfer_in:
        return 'transfer_in';
      case LedgerEntryType.transfer_out:
        return 'transfer_out';
      case LedgerEntryType.voided_sale:
        return 'voided_sale';
      case LedgerEntryType.inventory_count:
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
      productId: json['product_id'] as String,
      productName: json['product_name'] as String? ?? '',
      quantity: json['quantity'] as int,
      entryType: LedgerEntryType.values.firstWhere(
        (e) => e.value == json['entry_type'],
        orElse: () => LedgerEntryType.sale,
      ),
      reason: json['reason'] as String? ?? '',
      metadata: json['metadata'] != null
          ? Map<String, dynamic>.from(json['metadata'])
          : null,
      referenceId: json['reference_id'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
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

/// Stock ledger summary for a specific period
@immutable
class StockLedgerSummary {
  /// Total entries
  final int totalEntries;

  /// Total deductions
  final int totalDeductions;

  /// Total additions
  final int totalAdditions;

  /// Net change
  final int netChange;

  /// Average entries per day
  final double averageDailyEntries;

  const StockLedgerSummary({
    required this.totalEntries,
    required this.totalDeductions,
    required this.totalAdditions,
    required this.netChange,
    required this.averageDailyEntries,
  });

  factory StockLedgerSummary.fromJson(Map<String, dynamic> json) {
    return StockLedgerSummary(
      totalEntries: json['total_entries'] as int,
      totalDeductions: json['total_deductions'] as int,
      totalAdditions: json['total_additions'] as int,
      netChange: json['net_change'] as int,
      averageDailyEntries: (json['average_daily_entries'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_entries': totalEntries,
      'total_deductions': totalDeductions,
      'total_additions': totalAdditions,
      'net_change': netChange,
      'average_daily_entries': averageDailyEntries,
    };
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
    if (productId != null) params['product_id.eq'] = productId!;
    if (entryType != null) params['entry_type.eq'] = entryType!;
    if (reason != null) params['reason.eq'] = reason!;
    
    if (sortBy != null) params['order'] = '$sortBy.$sortOrder';
    if (offset != null) params['offset'] = offset!.toString();
    if (limit != null) params['limit'] = limit!.toString();

    return params;
  }
}
