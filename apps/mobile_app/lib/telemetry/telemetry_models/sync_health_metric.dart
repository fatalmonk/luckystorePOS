import 'package:flutter/foundation.dart';

@immutable
class SyncHealthMetric {
  final DateTime timestamp;
  final double availabilityScore; // 0.0 - 1.0
  final bool isSyncing;
  final String? lastError;

  const SyncHealthMetric({
    required this.timestamp,
    required this.availabilityScore,
    required this.isSyncing,
    this.lastError,
  });
}
