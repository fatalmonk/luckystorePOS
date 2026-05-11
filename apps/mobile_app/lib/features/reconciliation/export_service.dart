import 'package:luckystorepos/features/reconciliation/models/reconciliation_variance.dart';

class ReconciliationExportService {
  /// Generates a standardized plain CSV representation of variances
  /// safe for direct file output or user sharing via platform channels.
  String serializeToCSV(List<ReconciliationVariance> variances) {
    final StringBuffer buffer = StringBuffer();
    
    // Header row
    buffer.writeln('SKU,Product ID,Delta,Severity,Value Impact');

    for (final v in variances) {
      final List<String> row = [
        v.sku,
        v.productId,
        v.delta.toString(),
        v.severity.name.toUpperCase(),
        '\$${v.valueImpact.toStringAsFixed(2)}',
      ];
      // Safely join ensuring string escaping isn't required on standard alphanumeric fields
      buffer.writeln(row.join(','));
    }
    
    return buffer.toString();
  }
}
