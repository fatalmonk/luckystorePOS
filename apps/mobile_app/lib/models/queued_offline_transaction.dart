enum OfflineSyncState { pending, syncing, synced, failed, conflict }

class QueuedOfflineTransaction {
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

  const QueuedOfflineTransaction({
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
    List<Map<String, dynamic>>? items,
    List<Map<String, dynamic>>? payments,
    double? discount,
  }) {
    return QueuedOfflineTransaction(
      clientTransactionId: clientTransactionId,
      transactionTraceId: transactionTraceId,
      storeId: storeId,
      cashierId: cashierId,
      sessionId: sessionId,
      items: items ?? this.items,
      payments: payments ?? this.payments,
      discount: discount ?? this.discount,
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
    );
  }

  Map<String, dynamic> toJson() => {
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
      };

  factory QueuedOfflineTransaction.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? const []);
    final rawPayments = (json['payments'] as List<dynamic>? ?? const []);
    return QueuedOfflineTransaction(
      clientTransactionId: json['client_transaction_id'] as String,
      transactionTraceId: json['transaction_trace_id'] as String? ?? json['client_transaction_id'] as String,
      storeId: json['store_id'] as String,
      cashierId: json['cashier_id'] as String,
      sessionId: json['session_id'] as String?,
      items: rawItems.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      payments:
          rawPayments.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      discount: (json['discount'] as num? ?? 0).toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
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
    );
  }
}
