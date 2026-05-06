import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../network/network_config.dart';
import '../../utils/result.dart';
import '../../utils/app_utils.dart';
import '../printer_constants.dart';
import 'printer_config.dart';
import 'printer_models.dart';
import 'print_retry_queue.dart';

/// Unified Print Service for reliable receipt printing
/// Supports thermal printers, Bluetooth, and network printers
class PrinterService {
  final http.Client _client;
  final PrintRetryQueue _retryQueue;
  final StreamController<PrinterEvent> _eventController;

  bool _isConnecting = false;
  bool _isPrinting = false;
  String? _connectedPrinterId;
  Duration _averagePrintTime = Duration.zero;
  int _totalPrintAttempts = 0;
  int _successfulPrints = 0;

  PrinterService({
    http.Client? client,
    PrintRetryQueue? retryQueue,
  })  : _client = client ?? http.Client(),
        _retryQueue = retryQueue ?? PrintRetryQueue(),
        _eventController = StreamController<PrinterEvent>.broadcast();

  Stream<PrinterEvent> get eventStream => _eventController.stream;

  bool get isConnecting => _isConnecting;
  bool get isPrinting => _isPrinting;
  String? get connectedPrinterId => _connectedPrinterId;
  Duration get averagePrintTime => _averagePrintTime;
  double get successRate => _totalPrintAttempts > 0
      ? (_successfulPrints / _totalPrintAttempts) * 100
      : 0;

  // ===== Connection Management =====

  /// Connect to a printer (Bluetooth or network)
  Future<Result<String>> connect({
    required String printerId,
    required PrinterType type,
    String? bluetoothAddress,
    String? ipAddress,
    int? port,
  }) async {
    if (_isConnecting) {
      return Failure<String>('Printer connection already in progress');
    }

    try {
      _isConnecting = true;
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connecting,
        printerId: printerId,
        message: 'Connecting to printer...',
      ));

      // Test connection based on type
      bool connected = false;
      String endpoint = '';

      switch (type) {
        case PrinterType.bluetooth:
          if (bluetoothAddress == null) {
            return Failure<String>('Bluetooth address required');
          }
          // TODO: Implement Bluetooth connection
          connected = true; // Placeholder
          endpoint = 'bluetooth://$bluetoothAddress';
          break;

        case PrinterType.network:
          if (ipAddress == null) {
            return Failure<String>('IP address required');
          }
          final testResult = await _testNetworkConnection(
            ipAddress,
            port ?? PortConfig.defaultPort,
          );
          connected = testResult.isSuccess;
          endpoint = 'http://$ipAddress:$port/${PortConfig.defaultPort}';
          break;

        case PrinterType.local:
          // Local USB/thermal printer
          connected = true; // Placeholder
          endpoint = 'local://usb';
          break;
      }

      if (!connected) {
        throw PrinterConnectionException(
          'Failed to connect to printer: $endpoint',
        );
      }

      _connectedPrinterId = printerId;

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connected,
        printerId: printerId,
        message: 'Printer connected successfully',
        data: {'endpoint': endpoint},
      ));

      return Success<String>(printerId);
    } catch (e, stackTrace) {
      Logger.error('PrinterService.connect failed', e, stackTrace);
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connectionFailed,
        printerId: printerId,
        error: e.toString(),
        message: 'Connection failed: ${e.toString()}',
      ));
      return Failure<String>('Connection failed: $e');
    } finally {
      _isConnecting = false;
    }
  }

  /// Test network connection to printer
  Future<Result<void>> _testNetworkConnection(
    String ipAddress,
    int port,
  ) async {
    try {
      final response = await _client
          .get(Uri.parse('http://$ipAddress:$port/'))
          .timeout(Duration(seconds: NetworkConfig.connectionTimeout));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return Success<void>(null);
      }
      return Failure<void>('HTTP status: ${response.statusCode}');
    } catch (e) {
      return Failure<void>('Network error: ${e.toString()}');
    }
  }

  /// Disconnect from printer
  Future<Result<void>> disconnect() async {
    try {
      if (_connectedPrinterId == null) {
        return Failure<void>('No printer connected');
      }

      final printerId = _connectedPrinterId!;
      _connectedPrinterId = null;

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.disconnected,
        printerId: printerId,
        message: 'Printer disconnected',
      ));

      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Disconnect failed: $e');
    }
  }

  // ===== Printing Operations =====

  /// Print a receipt
  Future<Result<PrintResult>> printReceipt({
    required String receiptId,
    required List<ReceiptItem> items,
    required double subtotal,
    required double taxAmount,
    required double discountAmount,
    required double total,
    required String paymentMethod,
    String? customerId,
    String? cashierId,
    DateTime? timestamp,
  }) async {
    if (_isPrinting) {
      return Failure<PrintResult>('Already printing');
    }

    if (_connectedPrinterId == null) {
      return Failure<PrintResult>('No printer connected');
    }

    _isPrinting = true;
    final stopwatch = Stopwatch()..start();
    _totalPrintAttempts++;

    try {
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printing,
        printerId: _connectedPrinterId!,
        message: 'Preparing receipt...',
      ));

      // Step 1: Build print job
      final printJob = _buildReceiptPrintJob(
        receiptId: receiptId,
        items: items,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        total: total,
        paymentMethod: paymentMethod,
        customerId: customerId,
        cashierId: cashierId,
        timestamp: timestamp ?? DateTime.now(),
      );

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printing,
        printerId: _connectedPrinterId!,
        message: 'Sending to printer...',
      ));

      // Step 2: Send to printer
      final printResult = await _sendToPrinter(printJob);

      if (printResult is Success<PrintResult>) {
        _successfulPrints++;
        stopwatch.stop();
        _updateAveragePrintTime(stopwatch.elapsed);

        _broadcastEvent(PrinterEvent(
          type: PrinterEventType.printed,
          printerId: _connectedPrinterId!,
          receiptId: receiptId,
          message: 'Receipt printed successfully',
          data: {
            'printTimeMs': stopwatch.elapsed.inMilliseconds,
          },
        ));

        return Success<PrintResult>(printResult.data);
      } else if (printResult is Failure<PrintResult>) {
        // Add to retry queue
        await _retryQueue.add(printJob);

        _broadcastEvent(PrinterEvent(
          type: PrinterEventType.printFailed,
          printerId: _connectedPrinterId!,
          receiptId: receiptId,
          error: printResult.error,
          message: 'Print failed, added to retry queue',
        ));

        return Failure<PrintResult>(printResult.error);
      } else {
        return Failure<PrintResult>('Unknown print result');
      }
    } catch (e, stackTrace) {
      Logger.error('PrinterService.printReceipt failed', e, stackTrace);

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printError,
        printerId: _connectedPrinterId!,
        receiptId: receiptId,
        error: e.toString(),
        message: 'Print error: ${e.toString()}',
      ));

      return Failure<PrintResult>('Print failed: $e');
    } finally {
      _isPrinting = false;
    }
  }

  /// Build receipt print job
  ReceiptPrintJob _buildReceiptPrintJob({
    required String receiptId,
    required List<ReceiptItem> items,
    required double subtotal,
    required double taxAmount,
    required double discountAmount,
    required double total,
    required String paymentMethod,
    String? customerId,
    String? cashierId,
    required DateTime timestamp,
  }) {
    // Build ESC/POS command sequence
    final commands = StringBuffer();

    // Header
    commands.writeln('INIT');
    commands.writeln('ALIGN:CENTER');
    commands.writeln('BOLD:ON');
    commands.writeln('Store Name');
    commands.writeln('Address, City');
    commands.writeln('Phone: 123-456-7890');
    commands.writeln('');
    commands.writeln('RECEIPT: #$receiptId');
    commands.writeln('DATE: ${timestamp.toString()}');
    commands.writeln('CASHIER: ${cashierId ?? 'N/A'}');
    commands.writeln('CUSTOMER: ${customerId ?? 'Walk-in'}');
    commands.writeln('');

    // Items
    commands.writeln('ALIGN:LEFT');
    commands.writeln('BOLD:ON');
    commands.writeln('--- Items ---');
    commands.writeln('');
    commands.writeln('BOLD:OFF');

    for (final item in items) {
      commands.writeln('${item.quantity}x ${item.name}');
      commands.writeln('  ${item.price} x ${item.quantity} = ${item.total}');
      if (item.discount > 0) {
        commands.writeln('  Discount: ${item.discount}');
      }
    }

    commands.writeln('');
    commands.writeln('BOLD:ON');
    commands.writeln('--- Total ---');
    commands.writeln('Subtotal: $subtotal');
    if (taxAmount > 0) {
      commands.writeln('Tax: $taxAmount');
    }
    if (discountAmount > 0) {
      commands.writeln('Discount: -$discountAmount');
    }
    commands.writeln('TOTAL: $total');
    commands.writeln('');
    commands.writeln('PAYMENT: $paymentMethod');
    commands.writeln('');
    commands.writeln('THANK YOU FOR YOUR PURCHASE!');
    commands.writeln('');
    commands.writeln('CUT:FULL');
    commands.writeln('FEED:3');

    return ReceiptPrintJob(
      receiptId: receiptId,
      commands: commands.toString(),
      timestamp: timestamp,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      total: total,
      paymentMethod: paymentMethod,
      customerId: customerId,
      cashierId: cashierId,
    );
  }

  /// Send print job to printer
  Future<Result<PrintResult>> _sendToPrinter(ReceiptPrintJob job) async {
    try {
      if (_connectedPrinterId == null) {
        return Failure<PrintResult>('No printer connected');
      }

      // Send to printer API endpoint
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/functions/v1/print-receipt',
      );

      final headers = NetworkConfig.defaultHeaders;

      final response = await _client
          .post(
            url,
            headers: headers,
            body: jsonEncode({
              'printer_id': _connectedPrinterId,
              'receipt_id': job.receiptId,
              'commands': job.commands,
            }),
          )
          .timeout(Duration(seconds: PrinterConfig.printTimeout));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Success<PrintResult>(PrintResult(
          receiptId: job.receiptId,
          printTime: DateTime.now(),
          printerId: _connectedPrinterId,
          success: true,
        ));
      } else {
        final error = jsonDecode(response.body);
        return Failure<PrintResult>(error['error'] ?? 'Print failed');
      }
    } catch (e) {
      return Failure<PrintResult>('Network error: ${e.toString()}');
    }
  }

  /// Update average print time
  void _updateAveragePrintTime(Duration printTime) {
    _totalPrintAttempts++;
    _averagePrintTime = Duration(
      milliseconds: (
        (_averagePrintTime.inMilliseconds * (_totalPrintAttempts - 1) +
                printTime.inMilliseconds) /
            _totalPrintAttempts
      ).round(),
    );
  }

  // ===== Retry Queue Management =====

  /// Process retry queue
  Future<void> processRetryQueue() async {
    await _retryQueue.processQueue(this);
  }

  /// Retry failed print
  Future<Result<void>> retryPrint(String receiptId) async {
    final job = _retryQueue.getJob(receiptId);
    if (job == null) {
      return Failure<void>('Print job not found in queue');
    }

    return printReceipt(
      receiptId: receiptId,
      items: job.items ?? <ReceiptItem>[],
      subtotal: job.subtotal ?? 0,
      taxAmount: job.taxAmount ?? 0,
      discountAmount: job.discountAmount ?? 0,
      total: job.total ?? 0,
      paymentMethod: job.paymentMethod ?? 'Unknown',
      customerId: job.customerId,
      cashierId: job.cashierId,
      timestamp: job.timestamp,
    ).then((_) => const Success<void>(null));
  }

  /// Clear retry queue
  Future<Result<void>> clearRetryQueue() async {
    await _retryQueue.clear();
    return Success<void>(null);
  }

  // ===== Broadcast and Listen =====

  void _broadcastEvent(PrinterEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  StreamSubscription<PrinterEvent>? listenToEvents(
    void Function(PrinterEvent event) onData, {
    Function? onError,
    void Function()? onDone,
  }) {
    return _eventController.stream.listen(
      onData,
      onError: onError,
      onDone: onDone,
    );
  }

  // ===== Dispose =====

  void dispose() {
    _eventController.close();
    _client.close();
    _retryQueue.dispose();
  }
}
