class SyncMetrics {
  final int pendingCount;
  final int failedCount;
  final int conflictCount;
  final int queueDepth;
  final double? averageLatencyMs;
  final DateTime? lastSyncAt;

  const SyncMetrics({
    required this.pendingCount,
    required this.failedCount,
    required this.conflictCount,
    required this.queueDepth,
    this.averageLatencyMs,
    this.lastSyncAt,
  });

  factory SyncMetrics.zero() {
    return SyncMetrics(
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      queueDepth: 0,
    );
  }

  SyncMetrics copyWith({
    int? pendingCount,
    int? failedCount,
    int? conflictCount,
    int? queueDepth,
    double? averageLatencyMs,
    DateTime? lastSyncAt,
  }) {
    return SyncMetrics(
      pendingCount: pendingCount ?? this.pendingCount,
      failedCount: failedCount ?? this.failedCount,
      conflictCount: conflictCount ?? this.conflictCount,
      queueDepth: queueDepth ?? this.queueDepth,
      averageLatencyMs: averageLatencyMs ?? this.averageLatencyMs,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }
}
