import 'package:flutter/foundation.dart';

@immutable
class OfflineSessionMetric {
  final DateTime startTime;
  final DateTime? endTime;
  final int operationsQueued;

  const OfflineSessionMetric({
    required this.startTime,
    this.endTime,
    this.operationsQueued = 0,
  });

  Duration get duration => (endTime ?? DateTime.now()).difference(startTime);
}
