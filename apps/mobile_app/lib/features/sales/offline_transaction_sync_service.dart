import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/sync_action_audit_log.dart';
import '../../models/sale_transaction_snapshot.dart';
import '../../models/queued_offline_transaction.dart';
export '../../models/queued_offline_transaction.dart';
import './offline_sync_operational_alert_engine.dart';
import './conflict_resolver.dart';

class OfflineSyncDashboardStats {
  final int queuedSalesCount;
  final int syncedToday;
  final int failedSyncs;
  final int conflictsNeedingReview;
  final Duration? oldestPendingSaleAge;

  const OfflineSyncDashboardStats({
    required this.queuedSalesCount,
    required this.syncedToday,
    required this.failedSyncs,
    required this.conflictsNeedingReview,
    required this.oldestPendingSaleAge,
  });
}

class OfflineSyncWorkerTelemetry {
  final DateTime? lastRunAt;
  final DateTime? lastSuccessAt;
  final int consecutiveFailures;
  final bool currentlyProcessing;

  const OfflineSyncWorkerTelemetry({
    required this.lastRunAt,
    required this.lastSuccessAt,
    required this.consecutiveFailures,
    required this.currentlyProcessing,
  });
}

class SyncActionActor {
  final String userId;
  final String role;
  final String device;

  const SyncActionActor({
    required this.userId,
    required this.role,
    required this.device,
  });
}

class OfflineTransactionSyncService extends ChangeNotifier {
  OfflineTransactionSyncService._();
  static final OfflineTransactionSyncService instance =
      OfflineTransactionSyncService._();

  final _random = Random();
  final _queue = <QueuedOfflineTransaction>[];
  final _invalidQueueRecords = <Object?>[];
  final _auditLogs = <SyncActionAuditLog>[];
  final _alertEngine = const OfflineSyncOperationalAlertEngine();
  final _conflictResolver = ConflictResolver();

  SupabaseClient? _supabase;
  Timer? _workerTimer;
  bool _isSyncing = false;
  bool _initialized = false;
  bool _currentlyProcessing = false;
  DateTime? _lastRunAt;
  DateTime? _lastSuccessAt;
  int _consecutiveFailures = 0;

  List<QueuedOfflineTransaction> get queue => List.unmodifiable(_queue);
  int get invalidQueueRecordCount => _invalidQueueRecords.length;
  List<SyncActionAuditLog> get auditLogs => List.unmodifiable(_auditLogs);
  OfflineSyncWorkerTelemetry get telemetry => OfflineSyncWorkerTelemetry(
    lastRunAt: _lastRunAt,
    lastSuccessAt: _lastSuccessAt,
    consecutiveFailures: _consecutiveFailures,
    currentlyProcessing: _currentlyProcessing,
  );
  List<OfflineSyncOperationalAlert> operationalAlerts() => _alertEngine
      .evaluate(queue: _queue, stats: dashboardStats(), telemetry: telemetry);

  Future<void> initialize(SupabaseClient supabase) async {
    if (_initialized && identical(_supabase, supabase)) return;
    _supabase = supabase;
    await _loadQueue();
    await _loadLogs();
    _workerTimer?.cancel();
    _workerTimer = Timer.periodic(
      const Duration(seconds: 12),
      (_) => unawaited(_syncQueue()),
    );
    _initialized = true;
    notifyListeners();
  }

  String generateClientTransactionId({
    required String storeId,
    required String cashierId,
  }) {
    final millis = DateTime.now().millisecondsSinceEpoch;
    final rand = _random.nextInt(1 << 32).toRadixString(16).padLeft(8, '0');
    // I27: Pad to 8 chars before substring to prevent RangeError on short IDs
    final shortStore = storeId
        .replaceAll('-', '')
        .padRight(8, '0')
        .substring(0, 8);
    final shortCashier = cashierId
        .replaceAll('-', '')
        .padRight(8, '0')
        .substring(0, 8);
    return 'tx-$shortStore-$shortCashier-$millis-$rand';
  }

  Future<void> enqueueSale({
    required SaleTransactionIntent intent,
    required Map<String, dynamic>? snapshot,
  }) async {
    final clientTransactionId = intent.clientTransactionId;
    final duplicate = _queue.any(
      (q) => q.clientTransactionId == clientTransactionId,
    );
    if (duplicate) return;

    _queue.add(
      QueuedOfflineTransaction(
        clientTransactionId: clientTransactionId,
        transactionTraceId: intent.transactionTraceId,
        storeId: intent.storeId,
        cashierId: intent.cashierId,
        sessionId: intent.sessionId,
        items: intent.items.map((e) => e.toJson()).toList(growable: false),
        payments: intent.payments,
        discount: intent.cartDiscount,
        createdAt: DateTime.now(),
        syncedAt: null,
        state: OfflineSyncState.pending,
        retryCount: 0,
        nextRetryAt: null,
        lastError: null,
        conflictType: null,
        requiresManagerReview: false,
        reviewedAt: null,
        conflictAcknowledgedAt: null,
        conflictMeta: null,
        snapshot: snapshot,
        syncValidationState: 'PENDING_SERVER_VALIDATION',
        fulfillmentPolicy: intent.fulfillmentPolicy,
      ),
    );
    await _persistQueue();
    notifyListeners();
  }

  Future<void> triggerSync() async => _syncQueue();

  Future<void> retrySelected(
    List<String> ids, {
    required SyncActionActor actor,
  }) async {
    for (final id in ids) {
      final i = _queue.indexWhere((q) => q.clientTransactionId == id);
      if (i < 0) continue;
      // I29: Reset retryCount to 0 for manual retry
      _queue[i] = _queue[i].copyWith(
        state: OfflineSyncState.pending,
        nextRetryAt: null,
        lastError: null,
        retryCount: 0,
      );
    }
    await _persistQueue();
    notifyListeners();
    await _syncQueue();
  }

  Future<void> retryAllFailed({required SyncActionActor actor}) async {
    final ids = _queue
        .where((q) => q.state == OfflineSyncState.failed)
        .map((q) => q.clientTransactionId)
        .toList(growable: false);
    await retrySelected(ids, actor: actor);
  }

  Future<void> acknowledgeConflict({
    required String clientTransactionId,
    required SyncActionActor actor,
  }) async {
    final i = _queue.indexWhere(
      (q) => q.clientTransactionId == clientTransactionId,
    );
    if (i < 0) return;
    _queue[i] = _queue[i].copyWith(
      state: OfflineSyncState.pending,
      requiresManagerReview: false,
      reviewedAt: DateTime.now(),
      conflictAcknowledgedAt: DateTime.now(),
    );
    await _persistQueue();
    notifyListeners();
  }

  Future<void> deleteCorruptedItem({
    required String clientTransactionId,
    required SyncActionActor actor,
  }) async {
    _queue.removeWhere((q) => q.clientTransactionId == clientTransactionId);
    await _persistQueue();
    notifyListeners();
  }

  Future<void> forceSyncNow({required SyncActionActor actor}) async =>
      _syncQueue();

  OfflineSyncDashboardStats dashboardStats() {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final activeQueue =
        _queue
            .where(
              (q) =>
                  q.state == OfflineSyncState.pending ||
                  q.state == OfflineSyncState.syncing ||
                  q.state == OfflineSyncState.failed,
            )
            .toList();
    final pendingQueue =
        _queue
            .where(
              (q) =>
                  q.state == OfflineSyncState.pending ||
                  q.state == OfflineSyncState.syncing,
            )
            .toList();
    final oldest =
        pendingQueue.isEmpty
            ? null
            : pendingQueue
                .map((q) => q.createdAt)
                .reduce((a, b) => a.isBefore(b) ? a : b);

    return OfflineSyncDashboardStats(
      queuedSalesCount: activeQueue.length,
      syncedToday:
          _queue
              .where(
                (q) =>
                    q.state == OfflineSyncState.synced &&
                    q.syncedAt != null &&
                    q.syncedAt!.isAfter(startOfDay),
              )
              .length,
      failedSyncs:
          _queue.where((q) => q.state == OfflineSyncState.failed).length,
      conflictsNeedingReview:
          _queue
              .where(
                (q) =>
                    q.state == OfflineSyncState.conflict &&
                    q.requiresManagerReview,
              )
              .length,
      oldestPendingSaleAge: oldest == null ? null : now.difference(oldest),
    );
  }

  Future<void> _syncQueue() async {
    if (_isSyncing || _supabase == null) return;
    _isSyncing = true;
    _currentlyProcessing = true;
    _lastRunAt = DateTime.now();
    notifyListeners();
    try {
      final now = DateTime.now();
      var runHadSuccess = false;
      var runHadFailure = false;
      final candidates =
          _queue.where((tx) {
            if (tx.state == OfflineSyncState.synced ||
                tx.state == OfflineSyncState.conflict ||
                tx.state == OfflineSyncState.syncing) {
              return false;
            }
            // Exclude permanently failed transactions to prevent battery drain
            if (tx.state == OfflineSyncState.failed && tx.retryCount > 10) {
              return false;
            }
            final nextRetry = tx.nextRetryAt;
            return nextRetry == null || !nextRetry.isAfter(now);
          }).toList();

      for (final tx in candidates) {
        final outcome = await _syncSingle(tx);
        if (outcome == _SyncAttemptOutcome.failed) {
          runHadFailure = true;
        } else if (outcome == _SyncAttemptOutcome.synced) {
          runHadSuccess = true;
        }
        // retryScheduled does not reset failures, but is not counted as direct failure
      }

      if (runHadSuccess) {
        _lastSuccessAt = DateTime.now();
        _consecutiveFailures = 0;
      } else if (runHadFailure) {
        _consecutiveFailures += 1;
      }
    } finally {
      _isSyncing = false;
      _currentlyProcessing = false;
      notifyListeners();
    }
  }

  Future<_SyncAttemptOutcome> _syncSingle(QueuedOfflineTransaction tx) async {
    _replace(
      tx.clientTransactionId,
      tx.copyWith(state: OfflineSyncState.syncing, lastError: null),
    );
    await _persistQueue();
    notifyListeners();

    try {
      final result = await _supabase!.rpc(
        'complete_sale',
        params: {
          'p_store_id': tx.storeId,
          'p_cashier_id': tx.cashierId,
          'p_session_id': tx.sessionId,
          'p_items': tx.items,
          'p_payments': tx.payments,
          'p_discount': tx.discount,
          'p_client_transaction_id': tx.clientTransactionId,
          'p_snapshot': tx.snapshot,
          'p_fulfillment_policy': tx.fulfillmentPolicy,
        },
      );

      final parsed = Map<String, dynamic>.from(result as Map);
      final status = (parsed['status'] as String? ?? 'REJECTED').toUpperCase();
      if (status == 'CONFLICT' || status == 'REJECTED') {
        // Try to auto-resolve the conflict
        final resolution = _conflictResolver.resolve(
          transaction: tx,
          serverResponse: parsed,
          currentSnapshot: tx.snapshot,
        );

        if (resolution.requiresManagerReview ||
            resolution.strategy == ResolutionStrategy.manualReview) {
          // Conflict requires manual review
          _replace(
            tx.clientTransactionId,
            tx.copyWith(
              state: OfflineSyncState.conflict,
              conflictType: parsed['conflict_reason'] as String?,
              lastError: resolution.reason ?? parsed['message'] ?? 'Conflict',
              requiresManagerReview: true,
              conflictMeta: parsed,
              syncValidationState: 'MAJOR_DRIFT',
            ),
          );
          return _SyncAttemptOutcome.conflict;
        } else if (resolution.strategy == ResolutionStrategy.cancel) {
          // Transaction cancelled - remove from queue
          _queue.removeWhere(
            (q) => q.clientTransactionId == tx.clientTransactionId,
          );
          return _SyncAttemptOutcome.failed;
        } else if (resolution.resolvedTransaction != null) {
          // Auto-resolved - update transaction and retry
          _replace(
            tx.clientTransactionId,
            resolution.resolvedTransaction!.copyWith(
              state: OfflineSyncState.pending, // Reset to pending for retry
              lastError: resolution.reason,
              conflictMeta: parsed,
            ),
          );
          // Don't return - let it retry in next cycle
          return _SyncAttemptOutcome.retryScheduled; // Mark as retry scheduled
        }
        return _SyncAttemptOutcome.conflict;
      }

      _replace(
        tx.clientTransactionId,
        tx.copyWith(
          state: OfflineSyncState.synced,
          syncedAt: DateTime.now(),
          nextRetryAt: null,
          lastError: null,
          requiresManagerReview: false,
          syncValidationState: status == 'ADJUSTED' ? 'MINOR_DRIFT' : 'SAFE',
        ),
      );
      return _SyncAttemptOutcome.synced;
    } catch (e) {
      final retries = tx.retryCount + 1;
      final backoff = _computeBackoff(retries);
      _replace(
        tx.clientTransactionId,
        tx.copyWith(
          state: OfflineSyncState.failed,
          retryCount: retries,
          nextRetryAt: retries > 10 ? null : DateTime.now().add(backoff),
          lastError: e.toString(),
        ),
      );
      return _SyncAttemptOutcome.failed;
    } finally {
      await _persistQueue();
      notifyListeners();
    }
  }

  Duration _computeBackoff(int retryCount) {
    const maxSeconds = 5 * 60;
    final exp = 2 << (retryCount.clamp(1, 8) - 1);
    final jitter = _random.nextInt(4);
    final seconds = (exp + jitter).clamp(2, maxSeconds);
    return Duration(seconds: seconds);
  }

  void _replace(String clientTransactionId, QueuedOfflineTransaction next) {
    final i = _queue.indexWhere(
      (q) => q.clientTransactionId == clientTransactionId,
    );
    if (i >= 0) _queue[i] = next;
  }

  Future<File> _queueFile() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/offline_transaction_queue.json');
  }

  /// Clears the queue for testing purposes only.
  @visibleForTesting
  Future<void> clearQueueForTesting() async {
    _queue.clear();
    _invalidQueueRecords.clear();
    try {
      final file = await _queueFile();
      if (await file.exists()) {
        await file.delete();
      }
    } catch (_) {
      // Ignore errors during test cleanup
    }
  }

  Future<File> _logFile() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/offline_sync_action_logs.json');
  }

  Future<void> _loadQueue() async {
    try {
      final file = await _queueFile();
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return;
      final decodedJson = jsonDecode(raw);
      if (decodedJson is! List<dynamic>) {
        await _backupInvalidQueueFile(file);
        return;
      }
      final records = decodedJson;
      final decoded = decodeQueuedTransactionRecords(records);
      _queue
        ..clear()
        ..addAll(decoded.transactions);
      _invalidQueueRecords
        ..clear()
        ..addAll(decoded.invalidRecords);
    } catch (_) {
      try {
        await _backupInvalidQueueFile(await _queueFile());
      } catch (_) {
        // Keep the current in-memory queue when unreadable data cannot be backed up.
      }
    }
  }

  /// Preserves an unreadable queue document before later writes can replace it.
  Future<void> _backupInvalidQueueFile(File file) async {
    if (await file.exists()) {
      await file.copy('${file.path}.backup');
    }
  }

  Future<void> _persistQueue() async {
    final file = await _queueFile();
    final tmpFile = File('${file.path}.tmp');
    final encoded = jsonEncode([
      ..._queue.map((e) => e.toJson()),
      ..._invalidQueueRecords,
    ]);
    await tmpFile.writeAsString(encoded, flush: true);
    await tmpFile.rename(file.path);
  }

  Future<void> _loadLogs() async {
    try {
      final file = await _logFile();
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return;
      _auditLogs
        ..clear()
        ..addAll(
          (jsonDecode(raw) as List<dynamic>).map(
            (e) => SyncActionAuditLog.fromJson(
              Map<String, dynamic>.from(e as Map),
            ),
          ),
        );
    } catch (_) {
      _auditLogs.clear();
    }
  }
}

enum _SyncAttemptOutcome { synced, conflict, failed, retryScheduled }
