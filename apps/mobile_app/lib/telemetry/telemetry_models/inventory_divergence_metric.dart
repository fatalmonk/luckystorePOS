import 'package:flutter/foundation.dart';

@immutable
class InventoryDivergenceMetric {
  final DateTime timestamp;
  final String productId;
  final int expectedQty;
  final int actualQty;

  const InventoryDivergenceMetric({
    required this.timestamp,
    required this.productId,
    required this.expectedQty,
    required this.actualQty,
  });

  int get absDelta => (actualQty - expectedQty).abs();
}
