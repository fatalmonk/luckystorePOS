import 'package:flutter/foundation.dart';

@immutable
class RpcHealthMetric {
  final DateTime timestamp;
  final String rpcName;
  final int totalCalls;
  final int failures;

  const RpcHealthMetric({
    required this.timestamp,
    required this.rpcName,
    required this.totalCalls,
    required this.failures,
  });

  double get failureRate => totalCalls == 0 ? 0 : failures / totalCalls;
}
