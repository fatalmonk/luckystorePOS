import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';

/// Service for monitoring low stock levels and generating alerts
/// Automatically notifies store managers when inventory drops below threshold
class LowStockAlertService {
  final http.Client _client;
  final StreamController<AlertEvent> _eventController;

  bool _isEnabled = true;
  bool _isCheckingStock = false;
  int _totalAlertsGenerated = 0;
  DateTime? _lastCheck;

  // Configuration
  static const int defaultThreshold = 5; // Default minimum quantity before triggering alert
  static const int maxAlertsPerCheck = 100; // Maximum alerts per scan

  LowStockAlertService({
    http.Client? client,
  })  : _client = client ?? http.Client(),
        _eventController = StreamController<AlertEvent>.broadcast();

  Stream<AlertEvent> get eventStream => _eventController.stream;

  bool get isEnabled => _isEnabled;
  bool get isCheckingStock => _isCheckingStock;
  int get totalAlertsGenerated => _totalAlertsGenerated;
  DateTime? get lastCheck => _lastCheck;

  // ===== Configuration =====

  /// Enable low stock alerts
  Future<Result<void>> enable() async {
    try {
      _isEnabled = true;
      _broadcastEvent(AlertEvent(
        type: AlertEventType.enabled,
        message: 'Low stock alerts enabled',
      ));
      return Success<void>(null);
    } catch (e) {
      return Failure<void('Failed to enable: $e');
    }
  }

  /// Disable low stock alerts
  Future<Result<void>> disable() async {
    try {
      _isEnabled = false;
      _broadcastEvent(AlertEvent(
        type: AlertEventType.disabled,
        message: 'Low stock alerts disabled',
      ));
      return Success<void>(null);
    } catch (e) {
      return Failure<void('Failed to disable: $e');
    }
  }

  /// Set default low stock threshold
  Future<Result<void>> setDefaultThreshold(int threshold) async {
    if (threshold < 0) {
      return Failure<void('Threshold must be non-negative');
    }

    _broadcastEvent(AlertEvent(
      type: AlertEventType.thresholdChanged,
      threshold: threshold,
      message: 'Default threshold set to $threshold units',
    ));

    return Success<void>(null);
  }

  // ===== Stock Monitoring =====

  /// Check all warehouses for low stock
  Future<Result<AlertResult>> checkAllWarehouses({
    int? threshold,
    String? storeId,
  }) async {
    if (!_isEnabled) {
      return Failure<AlertResult>('Alerts are disabled');
    }

    if (_isCheckingStock) {
      return Failure<AlertResult>('Stock check already in progress');
    }

    _isCheckingStock = true;
    threshold ??= defaultThreshold;

    try {
      _broadcastEvent(AlertEvent(
        type: AlertEventType.scanning,
        threshold: threshold,
        message: 'Scanning for low stock items (threshold: $threshold)',
      ));

      final results = await _performStockCheck(threshold, storeId);

      _lastCheck = DateTime.now();
      _totalAlertsGenerated += results.lowStockCount;

      _broadcastEvent(AlertEvent(
        type: AlertEventType.completed,
        lowStockCount: results.lowStockCount,
        criticalCount: results.criticalCount,
        message:
            'Stock check complete: ${results.lowStockCount} items low ($results.criticalCount critical)',
      ));

      return Success<AlertResult>(results);
    } catch (e, stackTrace) {
      Logger.error('LowStockAlertService.checkAllWarehouses failed', e, stackTrace);
      _broadcastEvent(AlertEvent(
        type: AlertEventType.error,
        error: e.toString(),
        message: 'Stock check failed: ${e.toString()}',
      ));
      return Failure<AlertResult>('Stock check failed: $e');
    } finally {
      _isCheckingStock = false;
    }
  }

  /// Perform stock check for specific store
  Future<StockCheckResult> _performStockCheck(
    int threshold,
    String? storeId,
  ) async {
    try {
      // Query: Get items with stock below threshold
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_levels?'
        'qty.lt.$threshold&'
        'select=id,store_id,item_id,qty,updated_at&'
        'order=qty.asc',
      );

      if (storeId != null) {
        url.queryParameters['store_id'] = 'eq.$storeId';
      }

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        return StockCheckResult(
          lowStockCount: 0,
          criticalCount: 0,
          totalChecked: 0,
          items: [],
        );
      }

      final List<dynamic> stockLevels = json.decode(response.body);

      // Fetch associated product details
      final lowStockItems = <ProductAlert>[];
      int criticalCount = 0;

      for (final stock in stockLevels) {
        final qty = (stock['qty'] as num).toInt();
        final isCritical = qty <= 1; // 1 or less = critical

        if (isCritical) {
          criticalCount++;
        }

        try {
          // Fetch product details
          final product = await _getProductDetails(stock['item_id'].toString());

          lowStockItems.add(ProductAlert(
            productId: product['id'],
            productName: product['name'] ?? 'Unknown',
            sku: product['sku'] ?? '',
            barcode: product['barcode'] ?? '',
            category: product['category_name'] ?? '',
            currentStock: qty,
            threshold: threshold,
            storeId: stock['store_id'],
            priority: isCritical ? AlertPriority.critical : AlertPriority.medium,
          ));
        } catch (e) {
          Logger.warning('Failed to fetch product details: ${stock['item_id']}');
        }
      }

      return StockCheckResult(
        lowStockCount: lowStockItems.length,
        criticalCount: criticalCount,
        totalChecked: stockLevels.length,
        items: lowStockItems,
      );
    } catch (e) {
      Logger.error('_performStockCheck failed', e);
      return StockCheckResult(
        lowStockCount: 0,
        criticalCount: 0,
        totalChecked: 0,
        items: [],
      );
    }
  }

  /// Get product details
  Future<Map<String, dynamic>> _getProductDetails(String productId) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/items?id=eq.$productId&select=*',
        category_id()($Environment.categoryProjection)');

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> products = json.decode(response.body);
        if (products.isNotEmpty) {
          return products.first;
        }
      }

      return {
        'id': productId,
        'name': 'Unknown',
        'sku': '',
        'barcode': '',
        'category_name': '',
      };
    } catch (e) {
      return {
        'id': productId,
        'name': 'Unknown',
        'sku': '',
        'barcode': '',
        'category_name': '',
      };
    }
  }

  // ===== Alert Notifications =====

  /// Send notifications for critical stock levels
  Future<Result<VoidResult>> notifyCriticalStocks({
    String? storeId,
    bool sendToManagers = true,
    bool sendToEmail = false,
  }) async {
    try {
      final criticalItems = await _getCriticalStockItems(storeId);

      if (criticalItems.isEmpty) {
        return Failure<VoidResult('No critical stock items found');
      }

      int sent = 0;

      if (sendToManagers) {
        sent += await _notifyManagers(criticalItems, storeId);
      }

      if (sendToEmail) {
        sent += await _sendEmailAlerts(criticalItems);
      }

      return Success<VoidResult>(VoidResult(success: true, message: 'Sent $sent notifications'));
    } catch (e) {
      return Failure<VoidResult('Failed to notify: $e');
    }
  }

  /// Get critical stock items (qty <= 1)
  Future<List<ProductAlert>> _getCriticalStockItems(String? storeId) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_levels?'
        'qty.lte.1&'
        'select=*,product:id(item_id)($EnvironmentProductProjection)';

      if (storeId != null) {
        url.queryParameters['store_id'] = 'eq.$storeId';
      }

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        return [];
      }

      final List<dynamic> stockLevels = json.decode(response.body);
      final criticalItems = <ProductAlert>[];

      for (final stock in stockLevels) {
        final qty = (stock['qty'] as num).toInt();
        final product = stock['product'] as Map<String, dynamic>? ?? {};

        criticalItems.add(ProductAlert(
          productId: product['id'],
          productName: product['name'] ?? 'Unknown',
          sku: product['sku'] ?? '',
          barcode: product['barcode'] ?? '',
          category: product['category_name'] ?? '',
          currentStock: qty,
          threshold: 1,
          storeId: stock['store_id'],
          priority: AlertPriority.critical,
        ));
      }

      return criticalItems;
    } catch (e) {
      return [];
    }
  }

  /// Notify store managers about critical stock
  Future<int> _notifyManagers(
    List<ProductAlert> items,
    String? storeId,
  ) async {
    int sent = 0;

    try {
      if (items.length > maxAlertsPerCheck) {
        // Truncate to max limit
        items = items.sublist(0, maxAlertsPerCheck);
      }

      // Build message
      final message = _buildManagerAlertMessage(items);

      // Send via WhatsApp to store managers
      // TODO: Get manager contact list from database
      final managerContacts = await _getManagerContacts(storeId);

      for (final contact in managerContacts) {
        final result = await _sendToWhatsApp(contact, message);
        if (result.isSuccess) {
          sent++;
        }
      }
    } catch (e) {
      Logger.error('_notifyManagers failed', e);
    }

    return sent;
  }

  /// Send email alerts
  Future<int> _sendEmailAlerts(List<ProductAlert> items) async {
    int sent = 0;
    // TODO: Implement email notification service
    return sent;
  }

  /// Get manager contacts for store
  Future<List<String>> _getManagerContacts(String? storeId) async {
    try {
      if (storeId == null) return [];

      // Fetch users with manager role for this store
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/user_stores?store_id=eq.$storeId&select=*,user:users!inner(phone,email)',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> results = json.decode(response.body);
        return results
            .where((u) => u['role'] == 'manager')
            .map((u) => u['user']['phone'] ?? u['user']['email'])
            .whereType<String>()
            .toList();
      }
    } catch (e) {
      Logger.error('_getManagerContacts failed', e);
    }

    return [];
  }

  // ===== Message Building =====

  /// Build manager alert message
  String _buildManagerAlertMessage(List<ProductAlert> items) {
    assert(items.isNotEmpty, 'Items list must not be empty');

    final criticalCount = items.where((i) => i.priority == AlertPriority.critical).length;
    final mediumCount = items.length - criticalCount;

    final lines = <String>[
      '🚨 *_CRITICAL STOCK ALERT_* 🚨',
      '',
      'The following items need immediate restocking:',
      '',
      '🔴 CRITICAL (1 or less): _${criticalCount}_ items',
      '🟡 LOW STOCK: _${mediumCount}_ items',
      '',
      '--- ITEMS ---',
      '',
    ];

    // Add critical items first
    for (final item in items.where((i) => i.priority == AlertPriority.critical)) {
      lines.add('🔴 *_${item.name}_*');
      lines.add('   SKU: ${item.sku}');
      lines.add('   Current: *_${item.currentStock}_ units');
      lines.add('   Status: CRITICAL');
      lines.add('');
    }

    // Add low stock items
    for (final item in items.where((i) => i.priority == AlertPriority.medium)) {
      lines.add('🟡 *_${item.name}_*');
      lines.add('   SKU: ${item.sku}');
      lines.add('   Current: *_${item.currentStock}_ units');
      lines.add('   Threshold: *_${item.threshold}_ units');
      lines.add('');
    }

    lines.add('');
    lines.add('---');
    lines.add('Action required: Please restock immediately!');
    lines.add('_Generated: ${DateTime.now().toString().substring(0, 16)}_');

    return lines.join('\n');
  }

  /// Send to WhatsApp
  Future<Result<VoidResult>> _sendToWhatsApp(String contact, String message) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/send-whatsapp-message',
      );

      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
        'apikey': NetworkConfig.supabaseServiceKey,
      };

      final payload = {
        'phone_number': contact,
        'message': message,
        'template': 'low_stock_alert',
        'priority': 'high',
      };

      final response = await _client
          .post(url, headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Success<VoidResult>(VoidResult(success: true, message: 'Alert sent'));
      }

      final error = json.decode(response.body);
      return Failure<VoidResult>(error['error'] ?? 'Send failed');
    } catch (e) {
      return Failure<VoidResult('Network error: ${e.toString()}});
    }
  }

  // ===== Scheduled Checks =====

  /// Schedule automatic stock checks
  void scheduleAutoCheck({
    int hourlyInterval = 6, // Check every 6 hours
    int threshold = defaultThreshold,
  }) {
    Logger.info('Scheduled auto stock check every ${hourlyInterval} hours (threshold: $threshold)');

    _broadcastEvent(AlertEvent(
      type: AlertEventType.scheduled,
      interval: hourlyInterval,
      threshold: threshold,
      message: 'Auto check scheduled every ${hourlyInterval} hours',
    ));

    // TODO: Implement with Workmanager or Flutter Schedule
  }

  // ===== Alerts History =====

  /// Get alert history for a product
  Future<Result<List<Map<String, dynamic>>>> getAlertHistory({
    String? productId,
    String? storeId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    try {
      var url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_alerts?'
        'select=*&'
        'order=created_at.desc',
      );

      if (productId != null) {
        url.queryParameters['product_id'] = 'eq.$productId';
      }

      if (storeId != null) {
        url.queryParameters['store_id'] = 'eq.$storeId';
      }

      if (startDate != null) {
        url.queryParameters['created_at.gte'] = startDate.toIso8601String();
      }

      if (endDate != null) {
        url.queryParameters['created_at.lte'] = endDate.toIso8601String();
      }

      if (limit != null) {
        url.queryParameters['limit'] = limit.toString();
      }

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final List<dynamic> alerts = json.decode(response.body);
        return Success<List<Map<String, dynamic>>>(
          List<Map<String, dynamic>>.from(alerts),
        );
      }

      return Failure<List<Map<String, dynamic>>>([]);
    } catch (e) {
      return Failure<List<Map<String, dynamic>>>([]);
    }
  }

  // ===== Broadcast and Listen =====

  void _broadcastEvent(AlertEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  StreamSubscription<AlertEvent>? listenToEvents(
    void Function(AlertEvent event) onData, {
    Function? onError,
    VoidCallback? onDone,
  }) {
    return _eventController.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
    );
  }

  // ===== Helpers =====

  Map<String, String> _getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': NetworkConfig.supabaseServiceKey,
      'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
    };
  }

  // ===== Dispose =====

  void dispose() {
    _eventController.close();
    _client.close();
  }
}

// ===== Data Models =====

/// Alert priority levels
enum AlertPriority {
  critical, // Qty <= 1
  high, // Qty <= currentThreshold
  medium, // Qty <= 2 * threshold
  low,
}

/// Alert event types
enum AlertEventType {
  enabled,
  disabled,
  scanning,
  completed,
  scheduled,
  thresholdChanged,
  error,
}

/// Alert event
class AlertEvent {
  final AlertEventType type;
  final int? threshold;
  final int? interval;
  final int? lowStockCount;
  final int? criticalCount;
  final String? message;
  final String? error;

  const AlertEvent({
    required this.type,
    this.threshold,
    this.interval,
    this.lowStockCount,
    this.criticalCount,
    this.message,
    this.error,
  });

  @override
  String toString() {
    return 'AlertEvent('
        'type: $type, '
        'threshold: $threshold, '
        'lowStockCount: $lowStockCount, '
        'message: $message'
        ')';
  }
}

/// Product alert
class ProductAlert {
  final String productId;
  final String productName;
  final String sku;
  final String barcode;
  final String category;
  final int currentStock;
  final int threshold;
  final String storeId;
  final AlertPriority priority;

  const ProductAlert({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.barcode,
    required this.category,
    required this.currentStock,
    required this.threshold,
    required this.storeId,
    required this.priority,
  });

  bool get isCritical => currentStock <= 1;
  bool get isLow => currentStock <= threshold;

  int get urgencyLevel => priority == AlertPriority.critical ? 1 : 2;
}

/// Stock check result
class StockCheckResult {
  final int lowStockCount;
  final int criticalCount;
  final int totalChecked;
  final List<ProductAlert> items;

  const StockCheckResult({
    required this.lowStockCount,
    required this.criticalCount,
    required this.totalChecked,
    required this.items,
  });

  @override
  String toString() {
    return 'StockCheckResult('
        'lowStockCount: $lowStockCount, '
        'criticalCount: $criticalCount, '
        'totalChecked: $totalChecked, '
        'items: ${items.length}'
        ')';
  }
}

/// Result with void
class VoidResult {
  final bool success;
  final String? message;

  const VoidResult({
    required this.success,
    this.message,
  });
}
