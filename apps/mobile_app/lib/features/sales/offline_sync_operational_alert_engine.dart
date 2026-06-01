import './offline_transaction_sync_service.dart';

class OfflineSyncOperationalAlert {
  final String code;
  final String message;
  final String severity;
  final bool notifyManager;
  final bool notifyAdmin;

  const OfflineSyncOperationalAlert({
    required this.code,
    required this.message,
    this.severity = 'critical',
    this.notifyManager = false,
    this.notifyAdmin = false,
  });
}

class OfflineSyncOperationalAlertEngine {
  const OfflineSyncOperationalAlertEngine();

  List<OfflineSyncOperationalAlert> evaluate({
    required List<QueuedOfflineTransaction> queue,
    required OfflineSyncDashboardStats stats,
    required OfflineSyncWorkerTelemetry telemetry,
  }) {
    final alerts = <OfflineSyncOperationalAlert>[];
    final pendingQueue = queue
        .where(
          (tx) =>
              tx.state == OfflineSyncState.pending ||
              tx.state == OfflineSyncState.syncing,
        )
        .length;

    if (pendingQueue > 25) {
      alerts.add(
        const OfflineSyncOperationalAlert(
          code: 'pending_queue_escalation',
          message: 'Escalation: Pending sync queue is above 25 transactions.',
          notifyManager: true,
          notifyAdmin: true,
        ),
      );
    }

    final oldestPendingAge = stats.oldestPendingSaleAge;
    if (oldestPendingAge != null && oldestPendingAge > const Duration(hours: 3)) {
      alerts.add(
        const OfflineSyncOperationalAlert(
          code: 'oldest_pending_escalation',
          message: 'Escalation: Oldest pending transaction is older than 3 hours.',
          notifyManager: true,
          notifyAdmin: true,
        ),
      );
    }

    if (telemetry.consecutiveFailures > 10) {
      alerts.add(
        OfflineSyncOperationalAlert(
          code: 'failure_streak_escalation',
          message:
              'Escalation: Sync failure streak is ${telemetry.consecutiveFailures} (>10).',
          notifyManager: true,
          notifyAdmin: true,
        ),
      );
    }

    final hasPermanentFailures = queue.any((tx) => tx.state == OfflineSyncState.failed && tx.retryCount > 10);
    if (hasPermanentFailures) {
      alerts.add(
        const OfflineSyncOperationalAlert(
          code: 'permanent_failure_alert',
          message: 'Critical: Transaction failed permanently after 10 retries.',
          notifyManager: true,
          notifyAdmin: true,
        ),
      );
    }

    if (stats.conflictsNeedingReview > 0) {
      alerts.add(
        const OfflineSyncOperationalAlert(
          code: 'conflict_present',
          message: 'Conflict detected. Manager review required.',
        ),
      );
    }

    final unresolvedOlderThan24h = queue.any(
      (tx) =>
          tx.state == OfflineSyncState.conflict &&
          tx.requiresManagerReview &&
          DateTime.now().difference(tx.createdAt) > const Duration(hours: 24),
    );
    if (unresolvedOlderThan24h) {
      alerts.add(
        const OfflineSyncOperationalAlert(
          code: 'conflict_unresolved_escalation',
          message:
              'Escalation: Conflict unresolved for more than 24 hours.',
          notifyManager: true,
          notifyAdmin: true,
        ),
      );
    }

    return alerts;
  }
}
