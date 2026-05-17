import 'package:flutter/foundation.dart';

@immutable
class ReconciliationEntry {
  final String id;
  final String sessionId;
  final String productId;
  final String sku;
  final int expectedQuantity;
  final int countedQuantity;
  final DateTime recordedAt;

  const ReconciliationEntry({
    required this.id,
    required this.sessionId,
    required this.productId,
    required this.sku,
    required this.expectedQuantity,
    required this.countedQuantity,
    required this.recordedAt,
  });
}
