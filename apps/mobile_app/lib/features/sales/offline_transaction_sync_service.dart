import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/sync_action_audit_log.dart';
import '../../models/sale_transaction_snapshot.dart';
import './offline_sync_operational_alert_engine.dart';

enum OfflineSyncState { pending, syncing, synced, failed, conflict }

enum SyncAckClassification {
  success,
  retryableNetworkFailure,
  retryableServerFailure,
  terminalValidationFailure,
  terminalConflictFailure,
  unknownFailure;

  bool get isRetryable =>
      this == SyncAckClassification.retryableNetworkFailure ||
      this == SyncAckClassification.retryableServerFailure;

  bool get isTerminal => !isRetryable && this != SyncAckClassification.success;
}

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

class QueuedOfflineTransaction {
  final int sequenceId;
  final String clientTransactionId;
  final String transactionTraceId;
  final String storeId;
  final String cashierId;
  final String? sessionId;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> payments;
  final double discount;
  final DateTime createdAt;
  final DateTime? syncedAt;
  final OfflineSyncState state;
  final int retryCount;
  final DateTime? nextRetryAt;
  final String? lastError;
  final String? conflictType;
  final bool requiresManagerReview;
  final DateTime? reviewedAt;
  final DateTime? conflictAcknowledgedAt;
  final Map<String, dynamic>? conflictMeta;
  final Map<String, dynamic>? snapshot;
  final String syncValidationState;
  final String fulfillmentPolicy;
  final SyncAckClassification? lastAckClassification;

  const QueuedOfflineTransaction({
    required this.sequenceId,
    required this.clientTransactionId,
    required this.transactionTraceId,
    required this.storeId,
    required this.cashierId,
    required this.sessionId,
    required this.items,
    required this.payments,
    required this.discount,
    required this.createdAt,
    required this.syncedAt,
    required this.state,
    required this.retryCount,
    required this.nextRetryAt,
    required this.lastError,
    required this.conflictType,
    required this.requiresManagerReview,
    required this.reviewedAt,
    required this.conflictAcknowledgedAt,
    required this.conflictMeta,
    required this.snapshot,
    required this.syncValidationState,
    required this.fulfillmentPolicy,
    this.lastAckClassification,
  });

  QueuedOfflineTransaction copyWith({
    DateTime? syncedAt,
    OfflineSyncState? state,
    int? retryCount,
    DateTime? nextRetryAt,
    String? lastError,
    String? conflictType,
    bool? requiresManagerReview,
    DateTime? reviewedAt,
    DateTime? conflictAcknowledgedAt,
    Map<String, dynamic>? conflictMeta,
    String? syncValidationState,
    SyncAckClassification? lastAckClassification,
  }) {
    return QueuedOfflineTransaction(
      sequenceId: sequenceId,
      clientTransactionId: clientTransactionId,
      transactionTraceId: transactionTraceId,
      storeId: storeId,
      cashierId: cashierId,
      sessionId: sessionId,
      items: items,
      payments: payments,
      discount: discount,
      createdAt: createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
      state: state ?? this.state,
      retryCount: retryCount ?? this.retryCount,
      nextRetryAt: nextRetryAt,
      lastError: lastError,
      conflictType: conflictType ?? this.conflictType,
      requiresManagerReview: requiresManagerReview ?? this.requiresManagerReview,
      reviewedAt: reviewedAt ?? this.reviewedAt,
      conflictAcknowledgedAt:
          conflictAcknowledgedAt ?? this.conflictAcknowledgedAt,
      conflictMeta: conflictMeta ?? this.conflictMeta,
      snapshot: snapshot,
      syncValidationState: syncValidationState ?? this.syncValidationState,
      fulfillmentPolicy: fulfillmentPolicy,
      lastAckClassification: lastAckClassification ?? this.lastAckClassification,
    );
  }

  Map<String, dynamic> toJson() => {
        'sequence_id': sequenceId,
        'client_transaction_id': clientTransactionId,
        'transaction_trace_id': transactionTraceId,
        'store_id': storeId,
        'cashier_id': cashierId,
        'session_id': sessionId,
        'items': items,
        'payments': payments,
        'discount': discount,
        'created_at': createdAt.toIso8601String(),
        'synced_at': syncedAt?.toIso8601String(),
        'state': state.name,
        'retry_count': retryCount,
        'next_retry_at': nextRetryAt?.toIso8601String(),
        'last_error': lastError,
        'conflict_type': conflictType,
        'requires_manager_review': requiresManagerReview,
        'reviewed_at': reviewedAt?.toIso8601String(),
        'conflict_acknowledged_at': conflictAcknowledgedAt?.toIso8601String(),
        'conflict_meta': conflictMeta,
        'snapshot': snapshot,
        'sync_validation_state': syncValidationState,
        'fulfillment_policy': fulfillmentPolicy,
        'last_ack_classification': lastAckClassification?.name,
      };

  factory QueuedOfflineTransaction.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? const []);
    final rawPayments = (json['payments'] as List<dynamic>? ?? const []);
    final createdAt = DateTime.parse(json['created_at'] as String);
    
    // Fallback to deterministic creation-time derived sequence for legacy records
    final seqId = (json['sequence_id'] as num?)?.toInt() ?? createdAt.millisecondsSinceEpoch;

    return QueuedOfflineTransaction(
      sequenceId: seqId,
      clientTransactionId: json['client_transaction_id'] as String,
      transactionTraceId: json['transaction_trace_id'] as String? ?? json['client_transaction_id'] as String,
      storeId: json['store_id'] as String,
      cashierId: json['cashier_id'] as String,
      sessionId: json['session_id'] as String?,
      items: rawItems.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      payments:
          rawPayments.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      discount: (json['discount'] as num? ?? 0).toDouble(),
      createdAt: createdAt,
      syncedAt: json['synced_at'] != null
          ? DateTime.parse(json['synced_at'] as String)
          : null,
      state: OfflineSyncState.values.firstWhere(
        (s) => s.name == (json['state'] as String? ?? 'pending'),
        orElse: () => OfflineSyncState.pending,
      ),
      retryCount: (json['retry_count'] as num? ?? 0).toInt(),
      nextRetryAt: json['next_retry_at'] != null
          ? DateTime.parse(json['next_retry_at'] as String)
          : null,
      lastError: json['last_error'] as String?,
      conflictType: json['conflict_type'] as String?,
      requiresManagerReview: json['requires_manager_review'] as bool? ?? false,
      reviewedAt: json['reviewed_at'] != null
          ? DateTime.parse(json['reviewed_at'] as String)
          : null,
      conflictAcknowledgedAt: json['conflict_acknowledged_at'] != null
          ? DateTime.parse(json['conflict_acknowledged_at'] as String)
          : null,
      conflictMeta: json['conflict_meta'] == null
          ? null
          : Map<String, dynamic>.from(json['conflict_meta'] as Map),
      snapshot: json['snapshot'] == null
          ? null
          : Map<String, dynamic>.from(json['snapshot'] as Map),
      syncValidationState:
          json['sync_validation_state'] as String? ?? 'PENDING_SERVER_VALIDATION',
      fulfillmentPolicy: json['fulfillment_policy'] as String? ?? 'STRICT',
      lastAckClassification: json['last_ack_classification'] != null
          ? SyncAckClassification.values.firstWhere(
              (e) => e.name == json['last_ack_classification'],
              orElse: () => SyncAckClassification.unknownFailure,
            )
          : null,
    );
  }
}

class OfflineTransactionSyncService extends ChangeNotifier {
  OfflineTransactionSyncService._();
  static final OfflineTransactionSyncService instance =
      OfflineTransactionSyncService._();
  static const int _queueFileVersion = 2;

  final _random = Random();
  final _queue = <QueuedOfflineTransaction>[];
  final _auditLogs = <SyncActionAuditLog>[];
  final _alertEngine = const OfflineSyncOperationalAlertEngine();

  SupabaseClient? _supabase;
  Timer? _workerTimer;
  bool _isSyncing = false;
  bool _initialized = false;
  bool _currentlyProcessing = false;
  DateTime? _lastRunAt;
  DateTime? _lastSuccessAt;
  int _consecutiveFailures = 0;
  int _nextSequenceId = 1;

  List<QueuedOfflineTransaction> get queue => List.unmodifiable(_queue);
  List<SyncActionAuditLog> get auditLogs => List.unmodifiable(_auditLogs);
  OfflineSyncWorkerTelemetry get telemetry => OfflineSyncWorkerTelemetry(
        lastRunAt: _lastRunAt,
        lastSuccessAt: _lastSuccessAt,
        consecutiveFailures: _consecutiveFailures,
        currentlyProcessing: _currentlyProcessing,
      );
  List<OfflineSyncOperationalAlert> operationalAlerts() => _alertEngine.evaluate(
        queue: _queue,
        stats: dashboardStats(),
        telemetry: telemetry,
      );

  Future<void> initialize(SupabaseClient supabase) async {
    if (_initialized && identical(_supabase, supabase)) return;
    _supabase = supabase;
    await _loadQueue();
    await _loadLogs();
    _workerTimer?.cancel();
    _workerTimer =
        Timer.periodic(const Duration(seconds: 12), (_) => unawaited(_syncQueue()));
    _initialized = true;
    notifyListeners();
  }

  String generateClientTransactionId({
    required String storeId,
    required String cashierId,
  }) {
    final millis = DateTime.now().millisecondsSinceEpoch;
    final rand = _random.nextInt(1 << 32).toRadixString(16).padLeft(8, '0');
    final shortStore = storeId.replaceAll('-', '').substring(0, 8);
    final shortCashier = cashierId.replaceAll('-', '').substring(0, 8);
    return 'tx-$shortStore-$shortCashier-$millis-$rand';
  }

  Future<void> enqueueSale({
    required SaleTransactionIntent intent,
    required Map<String, dynamic>? snapshot,
  }) async {
    final clientTransactionId = intent.clientTransactionId;
    final duplicate =
        _queue.any((q) => q.clientTransactionId == clientTransactionId);
    if (duplicate) return;

    final seqId = _nextSequenceId++;

    _queue.add(
      QueuedOfflineTransaction(
        sequenceId: seqId,
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
      _queue[i] = _queue[i].copyWith(
        state: OfflineSyncState.pending,
        nextRetryAt: null,
        lastError: null,
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
    final i = _queue.indexWhere((q) => q.clientTransactionId == clientTransactionId);
    if (i < 0) return;
    _queue[i] = _queue[i].copyWith(
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

  Future<void> forceSyncNow({required SyncActionActor actor}) async => _syncQueue();

  OfflineSyncDashboardStats dashboardStats() {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final activeQueue = _queue
        .where(
          (q) =>
              q.state == OfflineSyncState.pending ||
              q.state == OfflineSyncState.syncing ||
              q.state == OfflineSyncState.failed,
        )
        .toList();
    final pendingQueue = _queue
        .where(
          (q) =>
              q.state == OfflineSyncState.pending ||
              q.state == OfflineSyncState.syncing,
        )
        .toList();
    final oldest = pendingQueue.isEmpty
        ? null
        : pendingQueue
            .map((q) => q.createdAt)
            .reduce((a, b) => a.isBefore(b) ? a : b);

    return OfflineSyncDashboardStats(
      queuedSalesCount: activeQueue.length,
      syncedToday: _queue
          .where(
            (q) =>
                q.state == OfflineSyncState.synced &&
                q.syncedAt != null &&
                q.syncedAt!.isAfter(startOfDay),
          )
          .length,
      failedSyncs:
          _queue.where((q) => q.state == OfflineSyncState.failed).length,
      conflictsNeedingReview: _queue
          .where(
            (q) =>
                q.state == OfflineSyncState.conflict && q.requiresManagerReview,
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
      final candidates = _queue.where((tx) {
        if (tx.state == OfflineSyncState.synced ||
            tx.state == OfflineSyncState.conflict ||
            tx.state == OfflineSyncState.syncing) {
          return false;
        }
        final nextRetry = tx.nextRetryAt;
        return nextRetry == null || !nextRetry.isAfter(now);
      }).toList();

      for (final tx in candidates) {
        final outcome = await _syncSingle(tx);
        if (outcome == SyncAckClassification.success) {
          runHadSuccess = true;
        } else {
          runHadFailure = true;
        }
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

  SyncAckClassification _classifyRpcResponse(Map<String, dynamic> response) {
    final status = (response['status'] as String? ?? 'REJECTED').toUpperCase();
    if (status == 'SUCCESS' || status == 'ADJUSTED') {
      return SyncAckClassification.success;
    }
    if (status == 'CONFLICT') {
      return SyncAckClassification.terminalConflictFailure;
    }
    return SyncAckClassification.terminalValidationFailure;
  }

  SyncAckClassification _classifyException(Object e) {
    if (e is SocketException || e is TimeoutException || e is HandshakeException) {
      return SyncAckClassification.retryableNetworkFailure;
    }
    if (e is HttpException) {
      return SyncAckClassification.retryableNetworkFailure;
    }
    if (e is PostgrestException) {
      final code = e.code;
      if (code == '40001' || code == '40P01') {
        return SyncAckClassification.retryableServerFailure;
      }
      if (code != null && code.startsWith('5')) {
        return SyncAckClassification.retryableServerFailure;
      }
      return SyncAckClassification.terminalValidationFailure;
    }
    return SyncAckClassification.unknownFailure;
  }

  Future<SyncAckClassification> _syncSingle(QueuedOfflineTransaction tx) async {
    _replace(
      tx.clientTransactionId,
      tx.copyWith(
        state: OfflineSyncState.syncing,
        lastError: null,
      ),
    );
    await _persistQueue();
    notifyListeners();

    try {
      final result = await _supabase!.rpc('complete_sale', params: {
        'p_store_id': tx.storeId,
        'p_cashier_id': tx.cashierId,
        'p_session_id': tx.sessionId,
        'p_items': tx.items,
        'p_payments': tx.payments,
        'p_discount': tx.discount,
        'p_client_transaction_id': tx.clientTransactionId,
        'p_snapshot': tx.snapshot,
        'p_fulfillment_policy': tx.fulfillmentPolicy,
      });

      final parsed = Map<String, dynamic>.from(result as Map);
      final classification = _classifyRpcResponse(parsed);

      if (classification == SyncAckClassification.success) {
        final status = (parsed['status'] as String? ?? '').toUpperCase();
        _replace(
          tx.clientTransactionId,
          tx.copyWith(
            state: OfflineSyncState.synced,
            syncedAt: DateTime.now(),
            nextRetryAt: null,
            lastError: null,
            requiresManagerReview: false,
            syncValidationState: status == 'ADJUSTED' ? 'MINOR_DRIFT' : 'SAFE',
            lastAckClassification: classification,
          ),
        );
        return classification;
      } else {
        _replace(
          tx.clientTransactionId,
          tx.copyWith(
            state: OfflineSyncState.conflict,
            conflictType: parsed['conflict_reason'] as String?,
            lastError: parsed['message'] as String? ?? 'Conflict',
            requiresManagerReview: true,
            conflictMeta: parsed,
            syncValidationState: 'MAJOR_DRIFT',
            lastAckClassification: classification,
            nextRetryAt: null,
          ),
        );
        return classification;
      }
    } catch (e) {
      final retries = tx.retryCount + 1;
      final baseClassification = _classifyException(e);
      
      // Establish hard cap to block silent infinite retry storms
      final classification = retries >= 15 
          ? SyncAckClassification.unknownFailure 
          : baseClassification;
      
      if (classification.isRetryable) {
        final backoff = _computeBackoff(retries);
        _replace(
          tx.clientTransactionId,
          tx.copyWith(
            state: OfflineSyncState.failed,
            retryCount: retries,
            nextRetryAt: DateTime.now().add(backoff),
            lastError: e.toString(),
            lastAckClassification: classification,
          ),
        );
      } else {
        _replace(
          tx.clientTransactionId,
          tx.copyWith(
            state: OfflineSyncState.conflict,
            conflictType: 'UNRECOVERABLE_SYNC_EXCEPTION',
            lastError: e.toString(),
            requiresManagerReview: true,
            lastAckClassification: classification,
            nextRetryAt: null,
          ),
        );
      }
      return classification;
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
    final i =
        _queue.indexWhere((q) => q.clientTransactionId == clientTransactionId);
    if (i >= 0) _queue[i] = next;
  }

  Future<File> _queueFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/offline_transaction_queue.json');
  }

  Future<File> _legacyQueueBackupFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/offline_transaction_queue.legacy_v1.json');
  }

  Future<File> _logFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/offline_sync_action_logs.json');
  }

  Future<void> _loadQueue() async {
    try {
      final file = await _queueFile();
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return;

      final decoded = jsonDecode(raw);

      if (decoded is List<dynamic>) {
        await _invalidateLegacyQueueFile(file, raw);
        _queue.clear();
        return;
      }

      if (decoded is! Map<String, dynamic>) {
        await _rewriteQueueFile(file);
        _queue.clear();
        return;
      }

      final version = decoded['version'];
      final transactions = decoded['transactions'];
      if (version != _queueFileVersion || transactions is! List<dynamic>) {
        await _rewriteQueueFile(file);
        _queue.clear();
        return;
      }

      _queue
        ..clear()
        ..addAll(transactions.map(
          (e) => QueuedOfflineTransaction.fromJson(
            Map<String, dynamic>.from(e as Map),
          ),
        ));
      _sortQueueBySequenceId();
      _nextSequenceId = _queue.isEmpty
          ? 1
          : _queue.map((e) => e.sequenceId).reduce((a, b) => max(a, b)) + 1;
    } catch (_) {
      _queue.clear();
    }
  }

  void _sortQueueBySequenceId() {
    _queue.sort((a, b) => a.sequenceId.compareTo(b.sequenceId));
  }

  Future<void> _persistQueue() async {
    _sortQueueBySequenceId();
    final file = await _queueFile();
    final encoded = jsonEncode({
      'version': _queueFileVersion,
      'transactions': _queue.map((e) => e.toJson()).toList(),
    });
    await file.writeAsString(encoded, flush: true);
  }

  Future<void> _invalidateLegacyQueueFile(File file, String raw) async {
    final backup = await _legacyQueueBackupFile();
    await backup.writeAsString(raw, flush: true);
    await _rewriteQueueFile(file);
  }

  Future<void> _rewriteQueueFile(File file) async {
    final encoded = jsonEncode({
      'version': _queueFileVersion,
      'transactions': const <Map<String, dynamic>>[],
    });
    await file.writeAsString(encoded, flush: true);
  }

  Future<void> _loadLogs() async {
    try {
      final file = await _logFile();
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return;
      _auditLogs
        ..clear()
        ..addAll((jsonDecode(raw) as List<dynamic>).map(
          (e) => SyncActionAuditLog.fromJson(Map<String, dynamic>.from(e as Map)),
        ));
    } catch (_) {
      _auditLogs.clear();
    }
  }
}

