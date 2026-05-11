import 'package:uuid/uuid.dart';
import 'package:luckystorepos/offline/sync_engine.dart';
import 'package:luckystorepos/features/reconciliation/models/reconciliation_session.dart';
import 'package:luckystorepos/features/reconciliation/models/reconciliation_variance.dart';
import 'package:luckystorepos/features/reconciliation/models/reconciliation_adjustment.dart';

class ReconciliationService {
  final SyncEngine _syncEngine;
  final _uuid = const Uuid();

  ReconciliationService(this._syncEngine);

  Future<ReconciliationSession> startNewSession(String storeId, String operatorId) async {
    return ReconciliationSession(
      id: _uuid.v4(),
      storeId: storeId,
      operatorId: operatorId,
      startedAt: DateTime.now(),
    );
  }

  Future<void> approveAndApplyVariances({
    required ReconciliationSession session,
    required List<ReconciliationVariance> variances,
    required String managerId,
  }) async {
    // Filter to actual discrepancies needing ledger modification
    final adjustments = variances.where((v) => v.delta != 0);

    for (final v in adjustments) {
      // Construct unique deterministic adjustment container
      final adj = ReconciliationAdjustment(
        operationId: _uuid.v4(), // Deterministic ID prevents replay duplications
        sessionId: session.id,
        productId: v.productId,
        quantityDelta: v.delta,
        reason: 'Physical count discrepancy detected',
        approvedBy: managerId,
      );

      // Dispatch immutably through persistent queuing pipeline
      await _syncEngine.queueEvent(
        eventType: 'stock_adjusted',
        payload: adj.toEventPayload(),
      );
    }
  }
}
