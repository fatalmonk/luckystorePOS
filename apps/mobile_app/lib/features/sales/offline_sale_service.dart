import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/sync_constants.dart';
import '../../core/db/drift_database.dart';
import '../../core/db/tables.dart';
import '../../features/sales/sale_repository.dart';
import '../../models/sale_transaction_snapshot.dart';
import '../../utils/app_utils.dart';

/// Service for managing offline sales operations
class OfflineSaleService {
  final DatabaseHelper _db;
  final SaleRepository _saleRepository;
  final http.Client _client;
  final StreamController<OfflineSaleEvent> _eventController;

  bool _isSyncing = false;
  StreamSubscription? _syncSubscription;

  OfflineSaleService({
    required DatabaseHelper db,
    required SaleRepository saleRepository,
    http.Client? client,
  })  : _db = db,
        _saleRepository = saleRepository,
        _client = client ?? http.Client(),
        _eventController = StreamController<OfflineSaleEvent>.broadcast();

  Stream<OfflineSaleEvent> get eventStream => _eventController.stream;

  bool get isSyncing => _isSyncing;

  /// Initialize the offline sales service
  Future<void> initialize() async {
    Logger.info('OfflineSaleService initialized');
    
    // Register for connection changes
    final isOnline = await checkConnectivity();
    if (isOnline) {
      final pendingCount = await _db.getPendingSaleCount();
      if (pendingCount.isSuccess && pendingCount.data > 0) {
        await _triggerAutoSync();
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
      Logger.debug('Connectivity check failed: $e');
      return false;
    }
  }

  /// Get pending sale count
  Future<Result<int>> getPendingSaleCount() async {
    return await _db.getPendingSaleCount();
  }

  /// Save an offline sale
  Future<Result<String>> saveOfflineSale({
    required String storeId,
    required String storeName,
    required String? cashierId,
    required String? customerId,
    required List<SaleItem> items,
    required int totalAmount,
    required int paymentAmount,
    required int changeAmount,
    required PaymentMode paymentMode,
    required String paymentReference,
    required DateTime saleTime,
    required String syncId,
  }) async {
    try {
      _broadcastEvent(OfflineSaleEvent(
        type: OfflineSaleEventType.created,
        syncId: syncId,
        message: 'Sale saved offline',
      ));

      // Build offline sale record
      final offlineSale = OfflineSalesCompanion(
        id: Value(syncId),
        storeId: Value(storeId),
        cashierId: Value(cashierId),
        customerId: Value(customerId),
        totalAmount: Value(totalAmount),
        paymentAmount: Value(paymentAmount),
        changeAmount: Value(changeAmount),
        paymentMode: Value(paymentMode.value),
        paymentReference: Value(paymentReference),
        saleTime: Value(saleTime),
        itemCount: Value(items.length),
        syncStatus: const Value('pending'),
        createdAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      );

      // Insert sale record
      await _db.offlineSales.insert(offlineSale);

      // Insert sale items
      for (final item in items) {
        final offlineItem = OfflineSaleItemsCompanion(
          id: Value('${syncId}-$item'),
          saleId: Value(syncId),
          productId: Value(item.productId),
          productName: Value(item.productName),
          quantity: Value(item.quantity),
          price: Value(item.price),
          discount: Value(item.discount),
          total: Value(item.total),
          barcode: Value(item.barcode),
        );

        await _db.offlineSaleItems.insert(offlineItem);
      }

      Logger.info('OfflineSaleService: Saved offline sale $syncId (${items.length} items)');

      _broadcastEvent(OfflineSaleEvent(
        type: OfflineSaleEventType.saved,
        syncId: syncId,
        message: '${items.length} items added',
      ));

      // Trigger immediate sync if online
      final isOnline = await checkConnectivity();
      if (isOnline) {
        await _triggerAutoSync();
      }

      return Success<String>(syncId);
    } catch (e, stackTrace) {
      Logger.error('OfflineSaleService.saveOfflineSale failed', e, stackTrace);
      return Failure<String>('Failed to save offline sale: $e');
    }
  }

  /// Get all pending sales that haven't been synced yet
  Future<Result<List<OfflineSale>>> getPendingSales() async {
    return await _db.getPendingSales();
  }

  /// Get a specific offline sale by ID
  Future<Result<OfflineSale>> getOfflineSale(String syncId) async {
    try {
      final sale = await _db.offlineSales
          .selectWhere((t) => t.id.equals(syncId))
          .getSingleOrNull();

      if (sale != null) {
        // Get sale items
        final itemsResult = await _db.offlineSaleItems
            .selectWhere((i) => i.saleId.equals(syncId))
            .get();

        sale.items = itemsResult;
        return Success<OfflineSale>(sale);
      }

      return Failure<OfflineSale>('Sale not found');
    } catch (e) {
      return Failure<OfflineSale>('Error fetching sale: $e');
    }
  }

  /// Get items for a specific sale
  Future<Result<List<OfflineSaleItem>>> getSaleItems(String syncId) async {
    return await _db.getSaleItems(syncId);
  }

  /// Retry syncing a specific sale
  Future<Result<void>> retrySync(String syncId) async {
    try {
      final saleResult = await getOfflineSale(syncId);
      
      if (saleResult.isFailure) {
        return Failure<void>('Sale not found');
      }

      final sale = saleResult.data;

      // Update status to retrying
      await _db.offlineSales.update(
        sale..syncStatus = Value('retrying')..updatedAt = Value(DateTime.now()),
      );

      // Perform sync
      await _syncSale(sale);

      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('OfflineSaleService.retrySync failed', e, stackTrace);
      return Failure<void>('Retry failed: $e');
    }
  }

  /// Manually sync a sale
  Future<Result<void>> syncSale(String syncId) async {
    try {
      final saleResult = await getOfflineSale(syncId);
      
      if (saleResult.isFailure) {
        return Failure<void>('Sale not found');
      }

      final sale = saleResult.data;

      return await _syncSale(sale);
    } catch (e, stackTrace) {
      Logger.error('OfflineSaleService.syncSale failed', e, stackTrace);
      return Failure<void>('Sync failed: $e');
    }
  }

  /// Sync all pending sales
  Future<Result<void>> syncAllPendingSales() async {
    if (_isSyncing) {
      return Failure<void>('Sync already in progress');
    }

    try {
      _isSyncing = true;
      _broadcastEvent(OfflineSaleEvent(
        type: OfflineSaleEventType.syncStarted,
        message: 'Sync started',
      ));

      final salesResult = await _db.getSalesForSync(QueryLimits.syncQueueBatchSize);
      
      if (salesResult.isFailure) {
        return Failure<void>(salesResult.data);
      }

      final sales = salesResult.data;
      int processed = 0;

      for (final sale in sales) {
        processed++;
        _broadcastEvent(OfflineSaleEvent(
          type: OfflineSaleEventType.syncing,
          syncId: sale.id,
          progress: ((processed / sales.length) * 100).toInt(),
          message: 'Syncing sale $processed/${sales.length}',
        ));

        try {
          await _syncSale(sale);
        } catch (e) {
          Logger.error('OfflineSaleService: Failed to sync sale $sale.id', e);
          // Continue with next sale
        }
      }

      _broadcastEvent(OfflineSaleEvent(
        type: OfflineSaleEventType.syncCompleted,
        message: 'Sync completed',
      ));

      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('OfflineSaleService.syncAllPendingSales failed', e, stackTrace);
      return Failure<void>('Full sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync a single sale to the server
  Future<Result<void>> _syncSale(OfflineSale sale) async {
    try {
      // Get sale items
      final itemsResult = await _db.getSaleItems(sale.id);
      
      if (itemsResult.isFailure) {
        throw Exception('Failed to get sale items');
      }

      final items = itemsResult.data;

      // Build sale payload
      final saleData = {
        'store_id': sale.storeId,
        'order_id': sale.orderId,
        'cashier_id': sale.cashierId,
        'customer_id': sale.customerId,
        'total_amount': sale.totalAmount,
        'payment_amount': sale.paymentAmount,
        'change_amount': sale.changeAmount,
        'payment_mode': sale.paymentMode,
        'payment_reference': sale.paymentReference,
        'sale_time': sale.saleTime.toIso8601String(),
        'item_count': sale.itemCount,
        'idempotency_key': sale.id,
        'items': items.map((item) => {
          'product_id': item.productId,
          'product_name': item.productName,
          'quantity': item.quantity,
          'price': item.price,
          'discount': item.discount,
          'total': item.total,
          'barcode': item.barcode,
        }).toList(),
      };

      // Prepare headers
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
        'apikey': NetworkConfig.supabaseAnonKey,
      };

      // POST to server
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/create-sale',
      );

      final response = await _client
          .post(url, headers: headers, body: jsonEncode(saleData))
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        
        // Get server sale ID
        final serverSaleId = data['success']['sale_id'] as String?;
        
        // Update sale with server ID
        await _db.offlineSales.update(
          sale..saleId = Value(serverSaleId)
              ..syncStatus = Value('synced')
              ..updatedAt = Value(DateTime.now())
              ..syncAttemptedAt = Value(DateTime.now()),
        );

        Logger.info('OfflineSaleService: Sale synced to server sale_id: $serverSaleId');

        _broadcastEvent(OfflineSaleEvent(
          type: OfflineSaleEventType.synced,
          syncId: sale.id,
          message: 'Sale synced successfully',
          data: serverSaleId,
        ));

        return Success<void>(null);
      } else {
        // Handle retry logic
        final retryCount = sale.retryCount + 1;
        final error = jsonDecode(response.body)['error'] ?? 'Unknown error';

        await _db.offlineSales.update(
          sale..syncStatus = Value(
            retryCount >= SyncConstants.maxRetryAttempts ? 'failed' : 'retrying',
          )
              ..error = Value(error)
              ..retryCount = Value(retryCount)
              ..updatedAt = Value(DateTime.now()),
        );

        if (retryCount >= SyncConstants.maxRetryAttempts) {
          _broadcastEvent(OfflineSaleEvent(
            type: OfflineSaleEventType.syncFailed,
            syncId: sale.id,
            message: 'Sale failed after $retryCount attempts',
            error: error,
          ));
        } else {
          // Schedule retry
          _scheduleRetry(sale.id, error, retryCount);
        }

        return Failure<void>(error);
      }
    } catch (e, stackTrace) {
      Logger.error('OfflineSaleService._syncSale failed', e, stackTrace);
      
      // Update failure
      final retryCount = sale.retryCount + 1;
      await _db.offlineSales.update(
        sale..syncStatus = Value('retrying')
            ..error = Value(e.toString())
            ..retryCount = Value(retryCount)
            ..updatedAt = Value(DateTime.now()),
      );

      if (retryCount < SyncConstants.maxRetryAttempts) {
        _scheduleRetry(sale.id, e.toString(), retryCount);
      }

      return Failure<void>('Sync failed: $e');
    }
  }

  /// Schedule retry with exponential backoff
  void _scheduleRetry(String syncId, String error, int retryCount) {
    final delay = Duration(
      seconds: (retryCount * 10).clamp(10, 300),
    );

    Timer(delay, () {
      Logger.info('Scheduling retry for sale $syncId (attempt ${retryCount + 1})');
      retrySync(syncId);
    });
  }

  /// Auto-sync when connection is restored
  Future<void> _triggerAutoSync() async {
    if (!_isSyncing) {
      await syncAllPendingSales();
    }
  }

  /// Broadcast event to subscribers
  void _broadcastEvent(OfflineSaleEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  /// Listen to offline sale events
  StreamSubscription<OfflineSaleEvent>? listenToEvents(
    void Function(OfflineSaleEvent event) onData, {
    Function? onError,
    VoidCallback? onDone,
  }) {
    return _eventController.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
    );
  }

  /// Dispose resources
  void dispose() {
    _syncSubscription?.cancel();
    _eventController.close();
    _client.close();
  }
}

/// Offline sale event types
enum OfflineSaleEventType {
  created, // Sale created offline
  saved, // Sale added to cart offline
  syncing, // Currently syncing
  synced, // Successfully synced
  syncStarted, // Full sync started
  syncCompleted, // Full sync completed
  syncFailed, // Sync failed
}

/// Offline sale event
class OfflineSaleEvent {
  final OfflineSaleEventType type;
  final String? syncId;
  final String? message;
  final String? error;
  final String? data;
  final int? progress;

  const OfflineSaleEvent({
    required this.type,
    this.syncId,
    this.message,
    this.error,
    this.data,
    this.progress,
  });

  @override
  String toString() {
    return 'OfflineSaleEvent('
        'type: $type, '
        'syncId: $syncId, '
        'message: $message, '
        'error: $error, '
        'data: $data, '
        'progress: $progress'
        ')';
  }
}

/// Get connection status
class ConnectionStatus {
  final bool isOnline;
  final DateTime? lastCheck;

  const ConnectionStatus({
    required this.isOnline,
    this.lastCheck,
  });

  factory ConnectionStatus.offline() {
    return const ConnectionStatus(isOnline: false);
  }

  factory ConnectionStatus.online() {
    return const ConnectionStatus(isOnline: true, lastCheck: DateTime.now());
  }
}
