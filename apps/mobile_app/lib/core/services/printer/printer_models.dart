import 'dart:async';

// ===== Data Models =====

/// Print event types
enum PrinterEventType {
  scanning,
  scanComplete,
  connecting,
  connected,
  disconnected,
  printing,
  printed,
  printFailed,
  printError,
  connectionFailed,
}

/// Printer event
class PrinterEvent {
  final PrinterEventType type;
  final String? printerId;
  final String? receiptId;
  final String? message;
  final String? error;
  final Map<String, dynamic>? data;

  const PrinterEvent({
    required this.type,
    this.printerId,
    this.receiptId,
    this.message,
    this.error,
    this.data,
  });

  @override
  String toString() {
    return 'PrinterEvent('
        'type: $type, '
        'printerId: $printerId, '
        'receiptId: $receiptId, '
        'message: $message, '
        'error: $error'
        ')';
  }
}

/// Print result
class PrintResult {
  final String receiptId;
  final DateTime printTime;
  final String? printerId;
  final bool success;

  const PrintResult({
    required this.receiptId,
    required this.printTime,
    this.printerId,
    required this.success,
  });
}

/// Receipt item for print job
class ReceiptItem {
  final String name;
  final int quantity;
  final double price;
  final double total;
  final double discount;

  const ReceiptItem({
    required this.name,
    required this.quantity,
    required this.price,
    required this.total,
    this.discount = 0.0,
  });
}

/// Print job structure
class ReceiptPrintJob {
  final String receiptId;
  final String commands;
  final DateTime timestamp;

  // Additional fields for printing
  final List<ReceiptItem>? items;
  final double? subtotal;
  final double? taxAmount;
  final double? discountAmount;
  final double? total;
  final String? paymentMethod;
  final String? customerId;
  final String? cashierId;

  // Retry metadata
  final int retryCount;
  final DateTime? lastRetryAt;
  final String? lastErrorMessage;

  const ReceiptPrintJob({
    required this.receiptId,
    required this.commands,
    required this.timestamp,
    this.items,
    this.subtotal,
    this.taxAmount,
    this.discountAmount,
    this.total,
    this.paymentMethod,
    this.customerId,
    this.cashierId,
    this.retryCount = 0,
    this.lastRetryAt,
    this.lastErrorMessage,
  });

  /// Create copy with updated retry metadata
  ReceiptPrintJob copyWith({
    int? retryCount,
    DateTime? lastRetryAt,
    String? lastErrorMessage,
  }) {
    return ReceiptPrintJob(
      receiptId: receiptId,
      commands: commands,
      timestamp: timestamp,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      total: total,
      paymentMethod: paymentMethod,
      customerId: customerId,
      cashierId: cashierId,
      retryCount: retryCount ?? this.retryCount,
      lastRetryAt: lastRetryAt ?? this.lastRetryAt,
      lastErrorMessage: lastErrorMessage ?? this.lastErrorMessage,
    );
  }
}

/// Retry queue event types
enum RetryQueueEventType {
  added,
  removed,
  retry,
  retryFailed,
  success,
  processing,
  processed,
  completed,
  maxRetriesReached,
  cleared,
  error,
}

/// Retry queue event
class RetryQueueEvent {
  final RetryQueueEventType type;
  final String? receiptId;
  final int? retryCount;
  final int? processed;
  final int? failed;
  final String? message;
  final String? error;

  const RetryQueueEvent({
    required this.type,
    this.receiptId,
    this.retryCount,
    this.processed,
    this.failed,
    this.message,
    this.error,
  });

  @override
  String toString() {
    return 'RetryQueueEvent('
        'type: $type, '
        'receiptId: $receiptId, '
        'retryCount: $retryCount, '
        'message: $message'
        ')';
  }
}

// ===== Exceptions =====

class PrinterConnectionException implements Exception {
  final String message;

  const PrinterConnectionException(this.message);

  @override
  String toString() => 'PrinterConnectionException: $message';
}

class PrinterNotFoundException implements Exception {
  final String printerId;

  const PrinterNotFoundException(this.printerId);

  @override
  String toString() => 'PrinterNotFoundException: $printerId not found';
}
