import 'package:flutter/foundation.dart';

@immutable
class ReconciliationAdjustment {
  final String operationId;
  final String sessionId;
  final String productId;
  final int quantityDelta;
  final String reason;
  final String approvedBy;

  const ReconciliationAdjustment({
    required this.operationId,
    required this.sessionId,
    required this.productId,
    required this.quantityDelta,
    required this.reason,
    required this.approvedBy,
  });

  Map<String, dynamic> toEventPayload() {
    return {
      'operation_id': operationId,
      'product_id': productId,
      'quantity_delta': quantityDelta,
      'movement_type': 'adjustment',
      'reference_type': 'reconciliation',
      'reference_id': sessionId,
      'notes': 'Reconciliation approval by $approvedBy. Reason: $reason',
    };
  }
}
