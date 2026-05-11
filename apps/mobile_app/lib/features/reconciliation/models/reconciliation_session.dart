import 'package:flutter/foundation.dart';

enum ReconciliationStatus { drafted, scanning, reviewed, approved, applied }

@immutable
class ReconciliationSession {
  final String id;
  final String storeId;
  final String operatorId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final ReconciliationStatus status;
  final String? notes;

  const ReconciliationSession({
    required this.id,
    required this.storeId,
    required this.operatorId,
    required this.startedAt,
    this.completedAt,
    this.status = ReconciliationStatus.drafted,
    this.notes,
  });
}
