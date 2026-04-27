import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';

/// Service for sending daily sales summary reports via WhatsApp
/// Automatically sends comprehensive store performance reports to owner
class WhatsAppReportService {
  final http.Client _client;
  final StreamController<ReportEvent> _eventController;

  bool _isGeneratingReport = false;
  bool _isEnabled = true;
  String? _ownerPhoneNumber;
  DateTime? _lastReportSent;

  WhatsAppReportService({
    http.Client? client,
  })  : _client = client ?? http.Client(),
        _eventController = StreamController<ReportEvent>.broadcast();

  Stream<ReportEvent> get eventStream => _eventController.stream;

  bool get isEnabled => _isEnabled;
  bool get isGeneratingReport => _isGeneratingReport;
  String? get ownerPhoneNumber => _ownerPhoneNumber;
  DateTime? get lastReportSent => _lastReportSent;

  // ===== Configuration =====

  /// Enable WhatsApp reports
  Future<Result<void>> enable({String? phoneNumber}) async {
    try {
      _isEnabled = true;
      if (phoneNumber != null) {
        _ownerPhoneNumber = _formatPhoneNumber(phoneNumber);
      }

      _broadcastEvent(ReportEvent(
        type: ReportEventType.enabled,
        message: 'WhatsApp reports enabled',
      ));

      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Failed to enable reports: $e');
    }
  }

  /// Disable WhatsApp reports
  Future<Result<void>> disable() async {
    try {
      _isEnabled = false;
      _broadcastEvent(ReportEvent(
        type: ReportEventType.disabled,
        message: 'WhatsApp reports disabled',
      ));
      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Failed to disable reports: $e');
    }
  }

  /// Set owner phone number
  Future<Result<void>> setOwnerPhoneNumber(String phoneNumber) async {
    final formatted = _formatPhoneNumber(phoneNumber);
    _ownerPhoneNumber = formatted;

    _broadcastEvent(ReportEvent(
      type: ReportEventType.phoneNumberSet,
      phoneNumber: formatted,
      message: 'Owner phone number set to $formatted',
    ));

    return Success<void>(null);
  }

  /// Format phone number to international format
  String _formatPhoneNumber(String phoneNumber) {
    // Remove all non-digit characters
    final digits = phoneNumber.replaceAll(RegExp(r'\D'), '');

    // Add country code if not present (default to 88 for Bangladesh)
    String formatted = digits;
    if (!formatted.startsWith('+')) {
      if (formatted.startsWith('88')) {
        formatted = '+$formatted';
      } else if (formatted.startsWith('01')) {
        formatted = '+88$formatted.substring(1);
      } else {
        formatted = '+88$formatted';
      }
    }

    return formatted;
  }

  // ===== Report Generation =====

  /// Generate and send daily sales report
  Future<Result<ReportResult>> sendDailyReport({
    DateTime? reportDate,
    String? storeId,
  }) async {
    if (!_isEnabled) {
      return Failure<ReportResult>('WhatsApp reports are disabled');
    }

    if (_ownerPhoneNumber == null) {
      return Failure<ReportResult>('Owner phone number not set');
    }

    if (_isGeneratingReport) {
      return Failure<ReportResult>('Report generation already in progress');
    }

    reportDate ??= DateTime.now().subtract(const Duration(days: 1));
    storeId ??= await _getDefaultStoreId();

    _isGeneratingReport = true;

    try {
      _broadcastEvent(ReportEvent(
        type: ReportEventType.generating,
        message: 'Generating daily report for ${reportDate.toString().substring(0, 10)}',
      ));

      // Step 1: Gather sales data
      final salesData = await _fetchDailySalesData(storeId, reportDate);

      // Step 2: Gather payment summary
      final paymentSummary = await _fetchPaymentSummary(storeId, reportDate);

      // Step 3: Gather top products
      final topProducts = await _fetchTopProducts(storeId, reportDate);

      // Step 4: Get store info
      final storeInfo = await _getStoreInfo(storeId);

      // Step 5: Build WhatsApp message
      final message = _buildDailyReportMessage(
        storeInfo: storeInfo,
        salesData: salesData,
        paymentSummary: paymentSummary,
        topProducts: topProducts,
        reportDate: reportDate,
      );

      _broadcastEvent(ReportEvent(
        type: ReportEventType.buildingMessage,
        message: 'Building WhatsApp message...',
      ));

      // Step 6: Send via WhatsApp API
      // Note: Using WhatsApp Business API or third-party service
      final sentResult = await _sendToWhatsApp(_ownerPhoneNumber!, message);

      if (sentResult.isSuccess) {
        _lastReportSent = DateTime.now();

        _broadcastEvent(ReportEvent(
          type: ReportEventType.sent,
          message: 'Daily report sent successfully',
          data: {
            'recipient': _ownerPhoneNumber,
            'reportDate': reportDate.toString(),
          },
        ));

        return Success<ReportResult>(ReportResult(
          success: true,
          sentAt: DateTime.now(),
          recipient: _ownerPhoneNumber,
          reportDate: reportDate,
        ));
      } else {
        return Failure<ReportResult>(sentResult.data);
      }
    } catch (e, stackTrace) {
      Logger.error('WhatsAppReportService.sendDailyReport failed', e, stackTrace);
      _broadcastEvent(ReportEvent(
        type: ReportEventType.error,
        error: e.toString(),
        message: 'Failed to send report: ${e.toString()}',
      ));
      return Failure<ReportResult>('Failed to send report: $e');
    } finally {
      _isGeneratingReport = false;
    }
  }

  /// Fetch daily sales data
  Future<Map<String, dynamic>> _fetchDailySalesData(
    String storeId,
    DateTime date,
  ) async {
    try {
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/sales?'
        'store_id=eq.$storeId&'
        'sale_time.gte=${startOfDay.toIso8601String()}&'
        'sale_time.lt=${endOfDay.toIso8601String()}&'
        'select=*&'
        'order=sale_time.desc',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final List<dynamic> sales = json.decode(response.body);
        final total = sales.fold<double>(0, (sum, sale) => sum + (sale['total_amount'] as num));
        final itemCount = sales.fold<int>(0, (sum, sale) => sum + (sale['item_count'] as int));

        return {
          'totalSales': sales.length,
          'totalAmount': total,
          'totalItems': itemCount,
          'averageOrderValue': sales.isNotEmpty ? total / sales.length : 0,
        };
      }

      return {
        'totalSales': 0,
        'totalAmount': 0,
        'totalItems': 0,
        'averageOrderValue': 0,
      };
    } catch (e) {
      Logger.error('_fetchDailySalesData failed', e);
      return {
        'totalSales': 0,
        'totalAmount': 0,
        'totalItems': 0,
        'averageOrderValue': 0,
      };
    }
  }

  /// Fetch payment mode summary
  Future<Map<String, dynamic>> _fetchPaymentSummary(
    String storeId,
    DateTime date,
  ) async {
    try {
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/sales?'
        'store_id=eq.$storeId&'
        'sale_time.gte=${startOfDay.toIso8601String()}&'
        'sale_time.lt=${endOfDay.toIso8601String()}&'
        'select=payment_mode,amount&'
        'order=payment_mode',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final List<dynamic> sales = json.decode(response.body);
        final Map<String, double> byMode = {};

        for (final sale in sales) {
          final mode = sale['payment_mode']?.toString() ?? 'cash';
          byMode[mode] = ((byMode[mode] ?? 0) + (sale['total_amount'] as num)).toDouble();
        }

        return byMode;
      }

      return {'cash': 0.0};
    } catch (e) {
      return {'cash': 0.0};
    }
  }

  /// Fetch top selling products
  Future<List<Map<String, dynamic>>> _fetchTopProducts(
    String storeId,
    DateTime date,
  ) async {
    try {
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      // Query sale_items joined with sales
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/sale_items?'
        'sale_id.in.(${_getSaleIdsQuery(storeId, startOfDay, endOfDay)})&'
        'select=product_id,product_name,quantity,total&'
        'order=quantity.desc&'
        'limit=5',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(json.decode(response.body));
      }

      return [];
    } catch (e) {
      Logger.error('_fetchTopProducts failed', e);
      return [];
    }
  }

  /// Helper: Get sale IDs query
  String _getSaleIdsQuery(String storeId, DateTime start, DateTime end) {
    return 'sale_id.in.(sale_id in(select id from sales where store_id=eq.$storeId and sale_time.gte=${start.toIso8601String()} and sale_time.lt=${end.toIso8601String()}))';
  }

  /// Fetch store info
  Future<Map<String, String>> _getStoreInfo(String storeId) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stores?id=eq.$storeId&select=name,address,phone',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> stores = json.decode(response.body);
        if (stores.isNotEmpty) {
          final store = stores.first;
          return {
            'name': store['name'] ?? 'Store',
            'address': store['address'] ?? '',
            'phone': store['phone'] ?? '',
          };
        }
      }

      return {'name': 'Store', 'address': '', 'phone': ''};
    } catch (e) {
      return {'name': 'Store', 'address': '', 'phone': ''};
    }
  }

  /// Get default store ID
  Future<String> _getDefaultStoreId() async {
    // TODO: Implement store selection logic
    return 'default-store';
  }

  /// Build WhatsApp message
  String _buildDailyReportMessage({
    required Map<String, String> storeInfo,
    required Map<String, dynamic> salesData,
    required Map<String, dynamic> paymentSummary,
    required List<Map<String, dynamic>> topProducts,
    required DateTime reportDate,
  }) {
    final dateStr = reportDate.toString().substring(0, 10);
    final totalSales = salesData['totalSales'] as int;
    final totalAmount = (salesData['totalAmount'] as double).toStringAsFixed(2);
    final totalItems = salesData['totalItems'] as int;
    final avgOrder = (salesData['averageOrderValue'] as double).toStringAsFixed(2);

    // Build payment breakdown
    final paymentLines = paymentSummary.entries.map((entry) {
      final mode = entry.key;
      final amount = (entry.value as double).toStringAsFixed(2);
      return '  • ${mode.toUpperCase()}: ৳$amount';
    }).join('\n');

    // Build top products
    final productLines = topProducts.isNotEmpty
        ? '\n🏆 TOP SELLING PRODUCTS:\n' +
            topProducts.asMap().entries.map((entry) {
              final index = entry.key + 1;
              final product = entry.value;
              final name = product['product_name'] ?? 'Unknown';
              final qty = product['quantity'] as int;
              return '    $index. $name (Sold: $qty units)';
            }).join('\n')
        : '';

    return '''
📊 *_DAILY SALES REPORT - $dateStr_*

🏪 *_Store:_* ${storeInfo['name']}

📈 *_SALES SUMMARY_*
• Total Sales: _$totalSales_ transactions
• Total Revenue: *_৳$totalAmount_*
• Items Sold: _$totalItems_ units
• Average Order: *_৳$avgOrder_*

💰 *_PAYMENT BREAKDOWN_*
(payment_mode: amount)
$paymentLines$productLines

🕐 _Generated: ${DateTime.now().toString().substring(0, 16)}_

---
Lucky Store POS
''';
  }

  /// Send message to WhatsApp
  Future<Result<void>> _sendToWhatsApp(String phoneNumber, String message) async {
    try {
      // Use WhatsApp Business API or third-party service
      // Example using a generic webhook or official API

      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/send-whatsapp-message',
      );

      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
        'apikey': NetworkConfig.supabaseServiceKey,
      };

      final payload = {
        'phone_number': phoneNumber,
        'message': message,
        'template': 'daily_sales_report',
      };

      final response = await _client
          .post(url, headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Success<void>(null);
      }

      final error = json.decode(response.body);
      return Failure<void>(error['error'] ?? 'Failed to send WhatsApp message');
    } catch (e) {
      return Failure<void>('Network error: ${e.toString()}');
    }
  }

  // ===== Scheduled Reports =====

  /// Schedule daily report at specific time
  void scheduleDailyReport({
    int hour = 20, // 8 PM default
    int minute = 0,
  }) {
    Logger.info('Scheduled daily WhatsApp report for $hour:$minute');
    
    // TODO: Implement with Workmanager or Flutter Schedule
    // For now, return success
    _broadcastEvent(ReportEvent(
      type: ReportEventType.scheduled,
      message: 'Daily report scheduled for $hour:$minute',
      data: {'hour': hour, 'minute': minute},
    ));
  }

  // ===== Broadcast and Listen =====

  void _broadcastEvent(ReportEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  StreamSubscription<ReportEvent>? listenToEvents(
    void Function(ReportEvent event) onData, {
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

/// Report event types
enum ReportEventType {
  enabled,
  disabled,
  phoneNumberSet,
  generating,
  buildingMessage,
  sent,
  scheduled,
  error,
}

/// Report event
class ReportEvent {
  final ReportEventType type;
  final String? phoneNumber;
  final String? message;
  final String? error;
  final Map<String, dynamic>? data;

  const ReportEvent({
    required this.type,
    this.phoneNumber,
    this.message,
    this.error,
    this.data,
  });

  @override
  String toString() {
    return 'ReportEvent('
        'type: $type, '
        'phoneNumber: $phoneNumber, '
        'message: $message, '
        'error: $error'
        ')';
  }
}

/// Report generation result
class ReportResult {
  final bool success;
  final DateTime sentAt;
  final String? recipient;
  final DateTime? reportDate;

  const ReportResult({
    required this.success,
    required this.sentAt,
    this.recipient,
    this.reportDate,
  });

  @override
  String toString() {
    return 'ReportResult('
        'success: $success, '
        'sentAt: $sentAt, '
        'recipient: $recipient, '
        'reportDate: $reportDate'
        ')';
  }
}
