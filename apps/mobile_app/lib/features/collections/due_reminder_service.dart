import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';

/// Service for sending automated due payment reminders
/// Tracks overdue payments and sends WhatsApp reminders to customers
class DueReminderService {
  final http.Client _client;
  final StreamController<ReminderEvent> _eventController;

  bool _isEnabled = true;
  bool _isProcessingReminders = false;
  int _totalRemindersSentToday = 0;
  DateTime? _lastRun;

  // Configuration
  static const int maxRemindersPerDay = 50;
  static const int minOverdueDays = 3; // Only remind after 3+ days overdue

  DueReminderService({
    http.Client? client,
  })  : _client = client ?? http.Client(),
        _eventController = StreamController<ReminderEvent>.broadcast();

  Stream<ReminderEvent> get eventStream => _eventController.stream;

  bool get isEnabled => _isEnabled;
  bool get isProcessingReminders => _isProcessingReminders;
  int get totalRemindersSentToday => _totalRemindersSentToday;
  DateTime? get lastRun => _lastRun;

  // ===== Configuration =====

  /// Enable due reminder service
  Future<Result<void>> enable() async {
    try {
      _isEnabled = true;
      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.enabled,
        message: 'Due reminder service enabled',
      ));
      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Failed to enable: $e');
    }
  }

  /// Disable due reminder service
  Future<Result<void>> disable() async {
    try {
      _isEnabled = false;
      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.disabled,
        message: 'Due reminder service disabled',
      ));
      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Failed to disable: $e');
    }
  }

  // ===== Reminder Operations =====

  /// Send reminders for all overdue payments
  Future<Result<ReminderResult>> sendAllReminders({
    DateTime? asOfDate,
  }) async {
    if (!_isEnabled) {
      return Failure<ReminderResult>('Reminder service is disabled');
    }

    if (_isProcessingReminders) {
      return Failure<ReminderResult>('Reminders already being processed');
    }

    if (_totalRemindersSentToday >= maxRemindersPerDay) {
      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.limitReached,
        message: 'Daily reminder limit ($maxRemindersPerDay) reached',
      ));
      return Failure<ReminderResult>('Daily reminder limit reached');
    }

    asOfDate ??= DateTime.now();
    _isProcessingReminders = true;

    try {
      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.scanning,
        message: 'Scanning for overdue payments...',
      ));

      // Step 1: Get overdue customer accounts
      final overdueCustomers =
          await _fetchOverdueCustomers(asOfDate, minOverdueDays);

      if (overdueCustomers.isEmpty) {
        _broadcastEvent(ReminderEvent(
          type: ReminderEventType.noOverdue,
          message: 'No overdue payments found',
        ));
        return Success<ReminderResult>(ReminderResult(
          success: true,
          sent: 0,
          skipped: 0,
          errors: 0,
          sentAt: DateTime.now(),
        ));
      }

      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.foundOverdue,
        count: overdueCustomers.length,
        message: 'Found ${overdueCustomers.length} overdue customers',
      ));

      // Step 2: Send reminders
      int sent = 0;
      int skipped = 0;
      int errors = 0;

      for (final customer in overdueCustomers) {
        // Check daily limit
        if (_totalRemindersSentToday >= maxRemindersPerDay) {
          _broadcastEvent(ReminderEvent(
            type: ReminderEventType.limitReached,
            message: 'Daily reminder limit reached',
          ));
          break;
        }

        try {
          // Get customer WhatsApp number
          final phoneNumber = _extractWhatsAppNumber(customer);

          if (phoneNumber == null) {
            skipped++;
            continue;
          }

          // Build reminder message
          final message = _buildDueReminderMessage(customer, asOfDate);

          // Send reminder
          final result = await _sendWhatsAppReminder(phoneNumber, message);

          if (result.isSuccess) {
            sent++;
            _totalRemindersSentToday++;

            _broadcastEvent(ReminderEvent(
              type: ReminderEventType.sent,
              customer: customer['id'],
              phoneNumber: phoneNumber,
              amount: customer['total_overdue'],
            ));
          } else {
            errors++;
          }
        } catch (e) {
          errors++;
          Logger.error('DueReminderService: Failed to remind customer ${customer['id']}', e);
        }
      }

      _lastRun = DateTime.now();

      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.completed,
        sent: sent,
        skipped: skipped,
        errors: errors,
        message:
            'Reminders complete: $sent sent, $skipped skipped, $errors errors',
      ));

      return Success<ReminderResult>(ReminderResult(
        success: errors == 0,
        sent: sent,
        skipped: skipped,
        errors: errors,
        totalOverdueCustomers: overdueCustomers.length,
        sentAt: DateTime.now(),
      ));
    } catch (e, stackTrace) {
      Logger.error('DueReminderService.sendAllReminders failed', e, stackTrace);
      _broadcastEvent(ReminderEvent(
        type: ReminderEventType.error,
        error: e.toString(),
        message: 'Failed to send reminders: ${e.toString()}',
      ));
      return Failure<ReminderResult>('Failed to send reminders: $e');
    } finally {
      _isProcessingReminders = false;
    }
  }

  /// Send reminder for a specific customer
  Future<Result<void>> sendReminderForCustomer(String customerId) async {
    if (!_isEnabled) {
      return Failure<void>('Reminder service is disabled');
    }

    if (_totalRemindersSentToday >= maxRemindersPerDay) {
      return Failure<void('Daily reminder limit reached');
    }

    try {
      // Fetch customer details
      final customer = await _getCustomerDetails(customerId);

      if (customer == null || (customer['total_overdue'] as double?) == 0) {
        return Failure<void('Customer not found or no overdue balance');
      }

      // Get phone number
      final phoneNumber = _extractWhatsAppNumber(customer);
      if (phoneNumber == null) {
        return Failure<void('No WhatsApp number found for customer');
      }

      // Build and send message
      final message = _buildDueReminderMessage(
        customer,
        customer['updated_at'] != null
            ? DateTime.parse(customer['updated_at'])
            : DateTime.now(),
      );

      final result = await _sendWhatsAppReminder(phoneNumber, message);

      if (result.isSuccess) {
        _totalRemindersSentToday++;
        return Success<void>(null);
      }

      return Failure<void>(result.data);
    } catch (e) {
      return Failure<void('Failed to send reminder: $e');
    }
  }

  // ===== Data Fetching =====

  /// Fetch overdue customer accounts
  Future<List<Map<String, dynamic>>> _fetchOverdueCustomers(
    DateTime asOfDate,
    int minOverdueDays,
  ) async {
    try {
      final cutoffDate = asOfDate.subtract(Duration(days: minOverdueDays));

      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/customers?'
        'active.eq=true&'
        'total_debt.gt.0&'
        'select=id,name,phone,email,total_debt,updated_at&'
        'order=updated_at.asc',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final List<dynamic> customers = json.decode(response.body);
        final overdueCustomers = <Map<String, dynamic>>[];

        for (var customer in customers) {
          final debt = (customer['total_debt'] as num).toDouble();
          if (debt > 0) {
            overdueCustomers.add({
              'id': customer['id'],
              'name': customer['name'],
              'phone': customer['phone'],
              'email': customer['email'],
              'total_overdue': debt,
              'updated_at': customer['updated_at'],
            });
          }
        }

        return overdueCustomers;
      }

      return [];
    } catch (e) {
      Logger.error('_fetchOverdueCustomers failed', e);
      return [];
    }
  }

  /// Get customer details
  Future<Map<String, dynamic>?> _getCustomerDetails(String customerId) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/customers?id=eq.$customerId&select=*',
      );

      final response = await _client
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> customers = json.decode(response.body);
        if (customers.isNotEmpty) {
          return customers.first;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // ===== Message Building =====

  /// Build due reminder WhatsApp message
  String _buildDueReminderMessage(
    Map<String, dynamic> customer,
    DateTime date,
  ) {
    final name = customer['name'] ?? 'Valued Customer';
    final amount = (customer['total_overdue'] as double).toStringAsFixed(2);
    final daysOverdue = _calculateDaysOverdue(customer['updated_at'] as String?, date);

    final now = DateTime.now();
    final greeting = now.hour < 12
        ? 'Good Morning'
        : (now.hour < 18 ? 'Good Afternoon' : 'Good Evening');

    return '''
$greeting $name! 👋

This is a friendly reminder from _Lucky Store POS_.

💰 _Your pending balance: ৳$amount_

You have been overdue for _$daysOverdue days_. Please clear your dues to avoid any interruption in service.

📞 Call us: 123-456-7890
📱 WhatsApp: Support available

Thank you for your prompt attention!
''';
  }

  /// Calculate days overdue
  int _calculateDaysOverdue(String? lastUpdated, DateTime asOfDate) {
    if (lastUpdated == null) return 0;

    try {
      final lastDate = DateTime.parse(lastUpdated);
      return asOfDate.difference(lastDate).inDays;
    } catch (e) {
      return 0;
    }
  }

  /// Extract WhatsApp number from customer
  String? _extractWhatsAppNumber(Map<String, dynamic> customer) {
    final phone = customer['phone']?.toString().trim();

    if (phone == null || phone.isEmpty) {
      return null;
    }

    // Format to international format
    String formatted = phone.replaceAll(RegExp(r'\D'), '');

    // Add Bangladesh country code if needed
    if (!formatted.startsWith('+')) {
      if (!formatted.startsWith('88')) {
        formatted = '+88$formatted';
      } else {
        formatted = '+$formatted';
      }
    }

    return formatted;
  }

  // ===== Send to WhatsApp =====

  /// Send WhatsApp reminder
  Future<Result<void>> _sendWhatsAppReminder(
    String phoneNumber,
    String message,
  ) async {
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
        'phone_number': phoneNumber,
        'message': message,
        'template': 'due_payment_reminder',
        'priority': 'normal', // normal, high, urgent
      };

      final response = await _client
          .post(url, headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Success<void>(null);
      }

      final error = json.decode(response.body);
      return Failure<void>(error['error'] ?? 'Failed to send reminder');
    } catch (e) {
      return Failure<void('Network error: ${e.toString()}');
    }
  }

  // ===== Scheduled Reminders =====

  /// Schedule daily reminders at specific time
  void scheduleDailyReminders({
    int hour = 10, // 10 AM default
    int minute = 0,
  }) {
    Logger.info('Scheduled daily due reminders for $hour:$minute');

    _broadcastEvent(ReminderEvent(
      type: ReminderEventType.scheduled,
      message: 'Daily reminders scheduled for $hour:$minute',
      data: {'hour': hour, 'minute': minute},
    ));

    // TODO: Implement with Workmanager or Flutter Schedule
  }

  // ===== Broadcast and Listen =====

  void _broadcastEvent(ReminderEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  StreamSubscription<ReminderEvent>? listenToEvents(
    void Function(ReminderEvent event) onData, {
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

  // ===== Reset Counters =====

  /// Reset daily reminder counter (call at midnight)
  void resetDailyCounter() {
    _totalRemindersSentToday = 0;
    _broadcastEvent(ReminderEvent(
      type: ReminderEventType.reset,
      message: 'Daily reminder counter reset',
    ));
  }

  // ===== Dispose =====

  void dispose() {
    _eventController.close();
    _client.close();
  }
}

// ===== Data Models =====

/// Reminder event types
enum ReminderEventType {
  enabled,
  disabled,
  scanning,
  foundOverdue,
  noOverdue,
  sent,
  skipped,
  completed,
  scheduled,
  reset,
  limitReached,
  error,
}

/// Reminder event
class ReminderEvent {
  final ReminderEventType type;
  final String? customer;
  final String? phoneNumber;
  final num? amount;
  final int? count;
  final int? sent;
  final int? skipped;
  final int? errors;
  final int? totalOverdueCustomers;
  final String? message;
  final String? error;

  const ReminderEvent({
    required this.type,
    this.customer,
    this.phoneNumber,
    this.amount,
    this.count,
    this.sent,
    this.skipped,
    this.errors,
    this.totalOverdueCustomers,
    this.message,
    this.error,
  });

  @override
  String toString() {
    return 'ReminderEvent('
        'type: $type, '
        'customer: $customer, '
        'phoneNumber: $phoneNumber, '
        'amount: $amount, '
        'message: $message'
        ')';
  }
}

/// Reminder result
class ReminderResult {
  final bool success;
  final int sent;
  final int skipped;
  final int errors;
  final int totalOverdueCustomers;
  final DateTime sentAt;

  const ReminderResult({
    required this.success,
    required this.sent,
    required this.skipped,
    required this.errors,
    required this.totalOverdueCustomers,
    required this.sentAt,
  });

  @override
  String toString() {
    return 'ReminderResult('
        'success: $success, '
        'sent: $sent, '
        'skipped: $skipped, '
        'errors: $errors, '
        'totalOverdueCustomers: $totalOverdueCustomers, '
        'sentAt: $sentAt'
        ')';
  }
}
