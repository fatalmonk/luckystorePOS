import 'package:flutter/foundation.dart';

@immutable
class ReplayLatencyMetric {
  final DateTime timestamp;
  final String operationId;
  final Duration duration;
  final bool success;

  const ReplayLatencyMetric({
    required this.timestamp,
    required this.operationId,
    required this.duration,
    required this.success,
  });
}
