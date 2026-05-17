import 'package:flutter/foundation.dart';

enum VarianceSeverity { none, low, elevated, critical }

@immutable
class ReconciliationVariance {
  final String productId;
  final String sku;
  final int delta;
  final double valueImpact;
  final VarianceSeverity severity;

  const ReconciliationVariance({
    required this.productId,
    required this.sku,
    required this.delta,
    required this.valueImpact,
    required this.severity,
  });

  factory ReconciliationVariance.compute(String pid, String sku, int expected, int counted, double unitPrice) {
    final diff = counted - expected;
    final val = diff * unitPrice;
    
    VarianceSeverity sev = VarianceSeverity.none;
    if (diff.abs() > 0) {
      if (val.abs() > 500 || diff.abs() > 20) {
        sev = VarianceSeverity.critical;
      } else if (val.abs() > 100 || diff.abs() > 5) {
        sev = VarianceSeverity.elevated;
      } else {
        sev = VarianceSeverity.low;
      }
    }

    return ReconciliationVariance(
      productId: pid,
      sku: sku,
      delta: diff,
      valueImpact: val,
      severity: sev,
    );
  }
}
