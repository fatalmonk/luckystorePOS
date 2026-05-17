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
      'p_operation_id': operationId,
      'p_item_id': productId,
      'p_quantity_delta': quantityDelta,
      'p_movement_type': 'adjustment',
      'p_reference_type': 'reconciliation',
      'p_reference_id': sessionId,
      'p_notes': 'Reconciliation approval by $approvedBy. Reason: $reason',
    };
  }
}
