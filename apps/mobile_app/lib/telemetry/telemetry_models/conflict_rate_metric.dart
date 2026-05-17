import 'package:flutter/foundation.dart';

@immutable
class ConflictRateMetric {
  final DateTime timestamp;
  final int conflictsFound;
  final int opsProcessed;
  
  const ConflictRateMetric({
    required this.timestamp,
    required this.conflictsFound,
    required this.opsProcessed,
  });

  double get rate => opsProcessed == 0 ? 0 : conflictsFound / opsProcessed;
}
