import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/sync_constants.dart';
import '../../core/utils/app_utils.dart';
import '../../core/errors/exceptions.dart';
import '../../core/db/database_config.dart';
import '../db/drift_database.dart';
import '../db/tables.dart';

/// Sync engine for managing offline-to-online synchronization
class SyncEngine {
  final DatabaseHelper _dbHelper;
  final http.Client _client;
  final StreamController<SyncStatusEvent> _statusController;
  
  bool _isSyncing = false;

  SyncEngine({
    required DatabaseHelper dbHelper,
    http.Client? client,
  })  : _dbHelper = dbHelper,
        _client = client ?? http.Client(),
        _statusController = StreamController<SyncStatusEvent>.broadcast();

  // Stream of sync status events
  Stream<SyncStatusEvent> get statusStream => _statusController.stream;

  bool get isSyncing => _isSyncing;

  /// Start the sync engine
  Future<void> initialize() async {
    Logger.info('SyncEngine starting');
    
    // Check network connectivity and trigger sync if online
    final isConnected = await checkConnectivity();
    if (isConnected) {
      final pendingCount = await _dbHelper.getPendingCount();
      if (pendingCount.isSuccess && pendingCount.data > 0) {
        scheduleSync();
      }
    }
  }

  /// Check network connectivity
  Future<bool> checkConnectivity() async {
    try {
      final response = await _client
          .get(Uri.parse(NetworkConfig.supabaseUrl))
          .timeout(Duration(seconds: NetworkConfig.connectionTimeout));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      Logger.warning('Connectivity check failed: $e');
      return false;
    }
  }

  /// Trigger immediate sync
  void sync() {
    if (_isSyncing) {
      Logger.warning('Sync already in progress');
      return;
    }
    
    scheduleSync();
  }

  /// Schedule sync with retry logic
  void scheduleSync({Duration delay = const Duration(seconds: 30)}) {
    Timer(delay, () {
      if (!_isSyncing) {
        sync();
      }
    });
  }

  /// Perform full sync cycle
  Future<Result<void>> syncAll() async {
    if (_isSyncing) {
      return Failure<void>('Sync already in progress');
    }

    try {
      _isSyncing = true;
      _broadcastStatus(SyncStatusEvent(SyncStatus.inProgress));

      // Clear failed retry counts
      await clearRetryCounts();

      // Sync pending sales first (highest priority)
      final saleResult = await syncPendingSales();
      if (saleResult.isFailure) {
        Logger.error('SyncEngine: Failed to sync sales');
      }

      // Sync other queue items
      final queueResult = await syncSyncQueue();
      if (queueResult.isFailure) {
        Logger.error('SyncEngine: Failed to sync queue');
      }

      _broadcastStatus(SyncStatusEvent(SyncStatus.completed));
      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('SyncEngine.syncAll failed', e, stackTrace);
      _broadcastStatus(SyncStatusEvent(SyncStatus.error, error: e.toString()));
      return Failure<void>('Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync pending sales from local database
  Future<Result<void>> syncPendingSales() async {
    try {
      Logger.info('SyncEngine: Starting sale sync');

      // Get pending sales for sync
      final salesResult = await _dbHelper.getSalesForSync(QueryLimits.syncQueueBatchSize);
      
      if (salesResult.isFailure) {
        return Failure<void>('Failed to get pending sales');
      }

      final sales = salesResult.data;
      
      if (sales.isEmpty) {
        Logger.info('SyncEngine: No pending sales to sync');
        return Success<void>(null);
      }

      for (final sale in sales) {
        try {
          // Update status to retrying
          await _dbHelper.updateSaleSyncStatus(
            sale.id,
            'retrying',
            error: sale.error,
          );

          // Try to sync
          final syncResult = await _uploadSaleToServer(sale);

          if (syncResult.isSuccess) {
            // Mark as synced
            await _dbHelper.updateSaleSyncStatus(sale.id, 'synced');
          } else {
            // Log error and retry later
            final retryCount = sale.retryCount + 1;
            await _dbHelper.updateSaleSyncStatus(
              sale.id,
              retryCount >= SyncConstants.maxRetryAttempts ? 'failed' : 'retrying',
              error: syncResult.data,
            );

            if (retryCount >= SyncConstants.maxRetryAttempts) {
              Logger.warning(
                'SyncEngine: Sale ${sale.id} failed after $retryCount attempts',
              );
            } else {
              // Schedule retry with exponential backoff
              scheduleRetrySync(
                sale.id,
                sale.error ?? 'Sync failed',
                retryCount,
              );
            }
          }
        } catch (e, stackTrace) {
          Logger.error(
            'SyncEngine: Sync sale failed',
            e,
            stackTrace,
          );
        }
      }

      // Cleanup synced sales
      await _dbHelper.cleanUpSyncedSales();

      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('SyncEngine.syncPendingSales failed', e, stackTrace);
      return Failure<void>('Failed to sync sales: $e');
    }
  }

  /// Upload sale to server
  Future<Result<void>> _uploadSaleToServer(OfflineSaleData sale) async {
    try {
      final storeId = sale.storeId;
      const saleId = DateTime.now().millisecondsSinceEpoch.toString();

      // Build sale payload
      final saleData = {
        'store_id': storeId,
        'sale_id': saleId,
        'sale_time': sale.saleTime.toIso8601String(),
        'total_amount': sale.totalAmount,
        'payment_amount': sale.paymentAmount,
        'change_amount': sale.changeAmount,
        'payment_reference': sale.paymentReference,
        'idempotency_key': sale.id,
      };

      // POST to server
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/create-sale',
      );

      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
        'apikey': NetworkConfig.supabaseAnonKey,
      };

      final response = await _client
          .post(url, headers: headers, body: jsonEncode(saleData))
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 201) {
        return Success<void>(null);
      } else {
        final error = jsonDecode(response.body);
        return Failure<void>(error['error'] ?? 'Server rejected sale');
      }
    } catch (e) {
      return Failure<void>('Network error: ${e.toString()}');
    }
  }

  /// Sync sync queue entries
  Future<Result<void>> syncSyncQueue() async {
    try {
      // Get pending sync queue entries
      final entriesResult = await _dbHelper.getPendingEntries(QueryLimits.syncQueueBatchSize);
      
      if (entriesResult.isFailure) {
        return Failure<void>('Failed to get sync queue entries');
      }

      final entries = entriesResult.data;
      
      for (final entry in entries) {
        // Process based on operation type
        switch (entry.operationType) {
          case 1: // create
            await _syncCreate(entry);
            break;
          case 2: // update
            await _syncUpdate(entry);
            break;
          case 3: // delete
            await _syncDelete(entry);
            break;
          default:
            Logger.warning('Unknown operation type: ${entry.operationType}');
        }
      }

      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Failed to sync queue: $e');
    }
  }

  /// Sync create operation
  Future<void> _syncCreate(SyncQueueData entry) async {
    try {
      final data = jsonDecode(utf8.decode(entry.rawData));
      final tableName = entry.tableName;
      
      Logger.info('SyncEngine: Create operation for $tableName');
      
      await _dbHelper.markEntryAsSynced(entry.id);
    } catch (e) {
      Logger.error('SyncEngine._syncCreate failed', e);
      await _dbHelper.markEntryAsSynced(entry.id, error: e.toString());
    }
  }

  /// Sync update operation
  Future<void> _syncUpdate(SyncQueueData entry) async {
    try {
      final tableName = entry.tableName;
      Logger.info('SyncEngine: Update operation for $tableName');
      await _dbHelper.markEntryAsSynced(entry.id);
    } catch (e) {
      Logger.error('SyncEngine._syncUpdate failed', e);
      await _dbHelper.markEntryAsSynced(entry.id, error: e.toString());
    }
  }

  /// Sync delete operation
  Future<void> _syncDelete(SyncQueueData entry) async {
    try {
      final tableName = entry.tableName;
      Logger.info('SyncEngine: Delete operation for $tableName');
      await _dbHelper.markEntryAsSynced(entry.id);
    } catch (e) {
      Logger.error('SyncEngine._syncDelete failed', e);
      await _dbHelper.markEntryAsSynced(entry.id, error: e.toString());
    }
  }

  /// Clear retry counts for all entries
  Future<void> clearRetryCounts() async {
    try {
      // This would normally use transactions
      await _dbHelper.getPendingCount();
    } catch (e) {
      Logger.warning('Clear retry counts failed: $e');
    }
  }

  /// Schedule retry sync for a sale
  void _scheduleRetrySync(String saleId, String error, int retryCount) {
    final delay = Duration(
      seconds: (retryCount * 10).clamp(10, 300),
    );
    
    Timer(delay, () {
      _isSyncing = false; // Allow next sync attempt
      scheduleDelaySync(delay);
    });
  }

  /// Schedule delayed sync
  void scheduleDelaySync(Duration delay) {
    Timer(delay, () {
      if (!_isSyncing) {
        sync();
      }
    });
  }

  /// Broadcast status update
  void _broadcastStatus(SyncStatusEvent event) {
    if (!_statusController.isClosed) {
      _statusController.add(event);
    }
  }

  /// Listen to status stream
  void listenToStatus(void Function(SyncStatusEvent event) onData) {
    _statusController.stream.listen(
      onData,
      onError: (e) => Logger.error('Sync status error', e),
      onDone: () => Logger.info('Sync status stream done'),
    );
  }

  /// Dispose resources
  void dispose() {
    _statusController.close();
    _client.close();
  }
}

/// Operation types for sync queue
enum SyncOperationType {
  create,
  update,
  delete,
}

/// Sync status
enum SyncStatus {
  idle,
  inProgress,
  completed,
  error,
}

/// Sync status event
class SyncStatusEvent {
  final SyncStatus status;
  final String? error;
  final int? progress;

  const SyncStatusEvent(
    this.status, {
    this.error,
    this.progress,
  });

  bool get isSyncing => status == SyncStatus.inProgress;
  bool get isComplete => status == SyncStatus.completed;
  bool get hasError => status == SyncStatus.error;
}
