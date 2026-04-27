/// Sync-related utilities and constants
class SyncConstants {
  /// Maximum retry attempts for sync failure
  static const int maxRetryAttempts = 3;
  
  /// Initial delay before first retry in milliseconds
  static const int initialRetryDelay = 1000;
  
  /// Maximum delay between retries in milliseconds
  static const int maxRetryDelay = 30000;
  
  /// Exponential backoff multiplier
  static const double backoffMultiplier = 2.0;
  
  /// Sync check interval in milliseconds (for polling)
  static const int syncPollingInterval = 5000;
  
  /// Maximum pending sync operations
  static const int maxPendingSyncOps = 1000;
  
  /// Grace period for sync operation completion in milliseconds
  static const int syncGracePeriod = 60000;
  
  /// Sync operation types
  static const String create = 'create';
  static const String update = 'update';
  static const String delete = 'delete';
  static const String merge = 'merge';
  
  /// Sync priority levels
  static const int criticalPriority = 1;
  static const int highPriority = 5;
  static const int normalPriority = 10;
  static const int lowPriority = 15;
  
  /// Sync status constants
  static const String pending = 'pending';
  static const String inProgress = 'in_progress';
  static const String completed = 'completed';
  static const String failed = 'failed';
  static const String retrying = 'retrying';
}

/// Sync queue status
class SyncQueueStatus {
  final int totalOperations;
  final int pendingOperations;
  final int inProgressOperations;
  final int completedOperations;
  final int failedOperations;
  
  const SyncQueueStatus({
    required this.totalOperations,
    required this.pendingOperations,
    required this.inProgressOperations,
    required this.completedOperations,
    required this.failedOperations,
  });
  
  bool get isIdle => pendingOperations == 0 && inProgressOperations == 0;
  bool get isProcessing => inProgressOperations > 0;
  bool get hasFailures => failedOperations > 0;
}
