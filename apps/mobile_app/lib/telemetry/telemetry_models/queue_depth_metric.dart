import 'package:flutter/foundation.dart';

@immutable
class QueueDepthMetric {
  final DateTime timestamp;
  final int count;

  const QueueDepthMetric({
    required this.timestamp,
    required this.count,
  });
}
