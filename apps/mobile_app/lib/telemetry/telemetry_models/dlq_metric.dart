import 'package:flutter/foundation.dart';

@immutable
class DlqMetric {
  final DateTime timestamp;
  final int count;
  final String? reasonTrend; // "conflict", "timeout", "parsing"

  const DlqMetric({
    required this.timestamp,
    required this.count,
    this.reasonTrend,
  });
}
