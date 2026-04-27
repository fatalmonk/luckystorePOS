import 'package:drift/drift.dart';

/// Initialize database connection
class DatabaseConfig {
  /// Drift database version
  static const int schemaVersion = 1;
  
  /// Database name for local SQLite
  static const String databaseName = 'luckystore.db';
  
  /// Enable verbose logging for development
  static const bool enableDebugLogging = false;
  
  /// WAL mode to improve concurrency
  static const bool enableWAL = true;
  
  /// Journal mode for better performance
  static const String journalMode = 'WAL';
  
  /// Cache size in KB
  static const int cacheSize = 5000;
}

/// Database constants for tables
class Tables {
  static const String products = 'products';
  static const String categories = 'categories';
  static const String parties = 'parties';
  static const String sales = 'sales';
  static const String saleItems = 'sale_items';
  static const String inventory = 'inventory';
  static const String stockLedger = 'stock_ledger';
  static const String collections = 'collections';
  static const String stockMovements = 'stock_movements';
  static const String users = 'users';
  static const String settings = 'settings';
  static const String syncQueue = 'sync_queue';
}

/// Database query limits
class QueryLimits {
  /// Default page size for pagination
  static const int pageSize = 50;
  
  /// Maximum page size allowed
  static const int maxPageSize = 1000;
  
  /// Batch size for bulk operations
  static const int batchSize = 100;
  
  /// Sync queue batch size
  static const int syncQueueBatchSize = 50;
}
