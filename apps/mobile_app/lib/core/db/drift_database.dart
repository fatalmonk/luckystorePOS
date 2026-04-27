import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'dart:io';
import 'tables.dart';
import 'database_config.dart';
import '../utils/result.dart';
import '../utils/app_utils.dart';
import 'tables.g.dart';

class ApplicationDatabase extends GeneratedDatabase {
  ApplicationDatabase(QueryExecutor e) : super(e);

  @override
  int get schemaVersion => DatabaseConfig.schemaVersion;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        Logger.debug('Database migration from version $from to $to');
        
        if (from == 1 && to == 2) {
          // Add new tables or columns here
        }
      },
    );
  }

  @override
  Future<void> close() async {
    await super.close();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final docsDir = await getApplicationDocumentsDirectory();
    final dbFile = File(
      path.join(docsDir.path, DatabaseConfig.databaseName),
    );

    final db = await driftDatabase(dbFile, DatabaseConfig.enableDebugLogging);
    
    await db.schemaManager.applySchemaToDatabase();
    
    return db;
  });
}

class DatabaseHelper {
  final ApplicationDatabase db;

  DatabaseHelper(this.db);

  // ===== Products =====

  Future<Result<int>> insertProduct(Product p) async {
    try {
      final id = await db.products.insert(p);
      return Success<int>(id);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.insertProduct failed', e, stackTrace);
      return Failure<int>('Failed to insert product: $e');
    }
  }

  Future<Result<bool>> updateProduct(Product p) async {
    try {
      await db.products.put(p);
      return Success<bool>(true);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.updateProduct failed', e, stackTrace);
      return Failure<bool>('Failed to update product: $e');
    }
  }

  Future<Result<List<Product>>> getProductsByStore(String storeId) async {
    try {
      final products = db.products
          .select(db.products)
          ..where((p) => p.storeId.equals(storeId))
          .getAll();
      return Success<List<Product>>(products);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getProductsByStore failed', e, stackTrace);
      return Failure<List<Product>>('Error fetching products: $e');
    }
  }

  Future<Result<Product>> getProduct(String productId) async {
    try {
      final product = await (db.select(db.products)
            ..where((t) => t.id.equals(productId)))
          .getSingleOrNull();
      if (product != null) {
        return Success<Product>(product);
      }
      return Failure<Product>('Product not found');
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getProduct failed', e, stackTrace);
      return Failure<Product>('Error fetching product: $e');
    }
  }

  Future<Result<List<Product>>> searchProducts(String query) async {
    try {
      final products = await (db(db.products)
          .where((p) => p.name.like('%$query%'))
          .limit(20))
          .get();
      return Success<List<Product>>(products);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.searchProducts failed', e, stackTrace);
      return Failure<List<Product>>('Error searching products: $e');
    }
  }

  // ===== Offline Sales =====

  Future<Result<int>> insertOfflineSale(OfflineSale s) async {
    try {
      final id = await db.offlineSales.insert(s);
      return Success<int>(id);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.insertOfflineSale failed', e, stackTrace);
      return Failure<int>('Failed to save offline sale: $e');
    }
  }

  Future<Result<List<OfflineSale>>> getPendingSales() async {
    try {
      final sales = await db.offlineSales
          .select(db.offlineSales)
          ..where((s) => s.syncStatus.equals('pending'))
          ..order((t) => OrderingTerm.desc(t.createdAt))
          .getAll();
      return Success<List<OfflineSale>>(sales);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getPendingSales failed', e, stackTrace);
      return Failure<List<OfflineSale>>('Error fetching pending sales: $e');
    }
  }

  Future<Result<void>> updateSaleSyncStatus(
    String saleId,
    String status, {
    String? error,
  }) async {
    try {
      await (db.update(db.offlineSales)
          ..where((t) => t.id.equals(saleId)))
          .write(OfflineSaleCompanion(
            syncStatus: Value(status),
            error: Value(error),
            updatedAt: Value(DateTime.now()),
          ));
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.updateSaleSyncStatus failed', e, stackTrace);
      return Failure<void>('Failed to update sale status: $e');
    }
  }

  Future<Result<List<OfflineSale>>> getSalesForSync(int batchLimit) async {
    try {
      final sales = await db.offlineSales
          .select(db.offlineSales)
          ..where((s) => s.syncStatus.equalsAny(['pending', 'retrying']))
          ..order((t) => OrderingTerm.asc(t.createdAt))
          ..limit(batchLimit)
          .getAll();
      return Success<List<OfflineSale>>(sales);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getSalesForSync failed', e, stackTrace);
      return Failure<List<OfflineSale>>('Error fetching sales for sync: $e');
    }
  }

  Future<Result<int>> getPendingSaleCount() async {
    try {
      final count = await (db(db.offlineSales)
          .selectWhere((s) => s.syncStatus.equals('pending'))).count().get();
      return Success<int>(count ?? 0);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getPendingSaleCount failed', e, stackTrace);
      return Failure<int>('Error counting pending sales: $e');
    }
  }

  // ===== Offline Sale Items =====

  Future<Result<void>> insertSaleItems(String saleId, List<OfflineSaleItem> items) async {
    try {
      for (final item in items) {
        await db.offlineSaleItems.insert(item);
      }
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.insertSaleItems failed', e, stackTrace);
      return Failure<void>('Failed to insert sale items: $e');
    }
  }

  Future<Result<List<OfflineSaleItem>>> getSaleItems(String saleId) async {
    try {
      final items = await db.offlineSaleItems
          .select(db.offlineSaleItems)
          ..where((i) => i.saleId.equals(saleId))
          .getAll();
      return Success<List<OfflineSaleItem>>(items);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getSaleItems failed', e, stackTrace);
      return Failure<List<OfflineSaleItem>>('Error fetching sale items: $e');
    }
  }

  // ===== Stock Levels =====

  Future<Result<void>> insertOrUpdateStockLevel(OfflineStockLevel level) async {
    try {
      await db.offlineStockLevels.put(level);
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.insertOrUpdateStockLevel failed', e, stackTrace);
      return Failure<void>('Failed to update stock level: $e');
    }
  }

  Future<Result<List<OfflineStockLevel>>> getStockLevels(String storeId) async {
    try {
      final levels = await db.offlineStockLevels
          .select(db.offlineStockLevels)
          ..where((t) => t.storeId.equals(storeId))
          .getAll();
      return Success<List<OfflineStockLevel>>(levels);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getStockLevels failed', e, stackTrace);
      return Failure<List<OfflineStockLevel>>('Error fetching stock levels: $e');
    }
  }

  // ===== Sync Queue =====

  Future<Result<int>> addSyncQueueEntry(SyncQueue e) async {
    try {
      final id = await db.syncQueue.insert(e);
      return Success<int>(id);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.addSyncQueueEntry failed', e, stackTrace);
      return Failure<int>('Failed to add to sync queue: $e');
    }
  }

  Future<Result<List<SyncQueue>>> getPendingEntries(int limit) async {
    try {
      final entries = await db.syncQueue
          .select(db.syncQueue)
          ..where((s) => s.syncStatus.equals('pending'))
          ..order((t) => OrderingTerm.asc([t.priority, t.createdAt]))
          ..limit(limit)
          .getAll();
      return Success<List<SyncQueue>>(entries);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getPendingEntries failed', e, stackTrace);
      return Failure<List<SyncQueue>>('Error fetching sync queue entries: $e');
    }
  }

  Future<Result<void>> markEntryAsSynced(String entryId, {String? error}) async {
    try {
      await (db.update(db.syncQueue)
          ..where((t) => t.id.equals(entryId)))
          .write(SyncQueueCompanion(
            syncStatus: Value('synced'),
            lastRetryAt: Value(error != null ? DateTime.now() : null),
          ));
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.markEntryAsSynced failed', e, stackTrace);
      return Failure<void>('Failed to mark entry as synced: $e');
    }
  }

  Future<Result<int>> getPendingCount() async {
    try {
      final count = await (db(db.syncQueue)
          .selectWhere((s) =>
              s.syncStatus.equalsAny(['pending', 'retrying']))).count().get();
      return Success<int>(count ?? 0);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getPendingCount failed', e, stackTrace);
      return Failure<int>('Error counting pending entries: $e');
    }
  }

  // ===== Offline Settings =====

  Future<Result<List<OfflineSetting>>> getAllSettings() async {
    try {
      final settings = await db.offlineSettings.getAll();
      return Success<List<OfflineSetting>>(settings);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getAllSettings failed', e, stackTrace);
      return Failure<List<OfflineSetting>>('Error fetching settings: $e');
    }
  }

  Future<Result<void>> saveSetting(String key, String value, {String? description}) async {
    try {
      await db.offlineSettings.insertOnConflictUpdate(
        OfflineSettingCompanion(
          key: Value(key),
          value: Value(value),
          description: Value(description),
          updatedAt: Value(DateTime.now()),
        ),
      );
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.saveSetting failed', e, stackTrace);
      return Failure<void>('Failed to save setting: $e');
    }
  }

  Future<Result<OfflineSetting>> getSetting(String key) async {
    try {
      final setting = await (db(db.offlineSettings)
          .selectWhere((s) => s.key.equals(key)))
          .getSingleOrNull();
      if (setting != null) {
        return Success<OfflineSetting>(setting);
      }
      return Failure<OfflineSetting>('Setting not found');
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.getSetting failed', e, stackTrace);
      return Failure<OfflineSetting>('Error fetching setting: $e');
    }
  }

  // ===== Cleanup =====

  Future<Result<void>> cleanUpSyncedSales() async {
    try {
      // Get synced sales
      final syncedSales = await db.offlineSales
          .select(db.offlineSales)
          ..where((s) => s.syncStatus.equals('synced'))
          .getAll();
      
      if (syncedSales.isNotEmpty) {
        // Delete items first
        final saleIds = syncedSales.map((s) => s.id).toList();
        for (final item in await db.offlineSaleItems
            .select(db.offlineSaleItems)
            ..where((i) => i.saleId.equalsAny(saleIds))
            .getAll()) {
          await db.offlineSaleItems.deleteWhere((t) => t.id.equals(item.id));
        }
        
        // Then delete sales
        for (final sale in syncedSales) {
          await db.offlineSales.deleteWhere((t) => t.id.equals(sale.id));
        }
      }
      
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('DatabaseHelper.cleanUpSyncedSales failed', e, stackTrace);
      return Failure<void>('Failed to cleanup synced data: $e');
    }
  }
}

/// Helper function to setup drift database
Future<GeneratedDatabase> driftDatabase(File dbFile, bool enableLogging) async {
  if (enableLogging) {
    return GeneratedDatabase(await FlutterSqlFork.open(
      () => Sqlite.open(dbFile.path),
      statements: [
        'PRAGMA journal_mode = WAL',
        'PRAGMA foreign_keys = ON',
      ],
    ));
  } else {
    return GeneratedDatabase(await FlutterSqlFork.open(
      () => Sqlite.open(dbFile.path),
      statements: [
        'PRAGMA journal_mode = WAL',
        'PRAGMA foreign_keys = ON',
      ],
      logEvents: (type, message) {},
    ));
  }
}
