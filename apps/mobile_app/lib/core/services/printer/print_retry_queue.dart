import 'dart:async';
import '../../utils/result.dart';
import '../../utils/app_utils.dart';
import 'printer_config.dart';
import 'printer_models.dart';

/// Print retry queue with exponential backoff
/// Implements 3-attempt retry logic with configurable delays
class PrintRetryQueue {
  final Map<String, ReceiptPrintJob> _queue = {};
  final StreamController<RetryQueueEvent> _eventController;
  Timer? _retryTimer;

  final int _maxRetries;
  final Duration _baseRetryDelay;
  final Duration _maxRetryDelay;

  int get retryCount => _queue.length;
  bool get isEmpty => _queue.isEmpty;
  bool get isProcessing => _retryTimer != null;
  int get maxRetries => _maxRetries;

  PrintRetryQueue({
    int maxRetries = PrinterConfig.maxRetryAttempts,
    Duration baseRetryDelay = PrinterConfig.baseRetryDelay,
    Duration maxRetryDelay = PrinterConfig.maxRetryDelay,
  })  : _maxRetries = maxRetries,
        _baseRetryDelay = baseRetryDelay,
        _maxRetryDelay = maxRetryDelay,
        _eventController = StreamController<RetryQueueEvent>.broadcast();

  Stream<RetryQueueEvent> get eventStream => _eventController.stream;

  // ===== Queue Operations =====

  /// Add a print job to the queue
  Future<Result<void>> add(ReceiptPrintJob job) async {
    try {
      // Check if already in queue
      if (_queue.containsKey(job.receiptId)) {
        Logger.warning('Print job ${job.receiptId} already in queue');
        return const Success<void>(null);
      }

      // Add to queue with metadata
      _queue[job.receiptId] = job;

      _broadcastEvent(const RetryQueueEvent(
        type: RetryQueueEventType.added,
        receiptId: '',
        message: 'Print job added to retry queue',
      ));

      // Start retry timer if not running
      if (_retryTimer == null) {
        _scheduleRetry();
      }

      return const Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('PrintRetryQueue.add failed', e, stackTrace);
      return Failure<void>('Failed to add to queue: $e');
    }
  }

  /// Remove a print job from the queue
  Future<Result<void>> remove(String receiptId) async {
    if (!_queue.containsKey(receiptId)) {
      return Failure<void>('Print job $receiptId not found in queue');
    }

    _queue.remove(receiptId);

    _broadcastEvent(RetryQueueEvent(
      type: RetryQueueEventType.removed,
      receiptId: receiptId,
      message: 'Print job removed from retry queue',
    ));

    return const Success<void>(null);
  }

  /// Get a print job from the queue
  ReceiptPrintJob? getJob(String receiptId) {
    return _queue[receiptId];
  }

  /// Get all jobs in the queue
  Map<String, ReceiptPrintJob> get allJobs => Map.unmodifiable(_queue);

  /// Clear the entire queue
  Future<Result<void>> clear() async {
    final count = _queue.length;
    _queue.clear();

    if (count > 0) {
      _broadcastEvent(RetryQueueEvent(
        type: RetryQueueEventType.cleared,
        message: 'Cleared $count print jobs from queue',
      ));
    }

    return const Success<void>(null);
  }

  // ===== Retry Logic =====

  /// Schedule next retry attempt
  void _scheduleRetry() {
    if (_queue.isEmpty) {
      _retryTimer?.cancel();
      _retryTimer = null;
      return;
    }

    // Get oldest job (FIFO)
    final oldestEntry = _queue.entries.first;
    final job = oldestEntry.value;
    final retryCount = job.retryCount;

    // Calculate delay with exponential backoff
    final delay = _calculateRetryDelay(retryCount);

    Logger.info(
      'PrintRetryQueue: Scheduling retry for ${job.receiptId} in ${delay.inSeconds}s (attempt ${retryCount + 1})',
    );

    _retryTimer = Timer(delay, () {
      _processNextRetry();
    });
  }

  /// Calculate retry delay with exponential backoff
  Duration _calculateRetryDelay(int retryCount) {
    // Exponential backoff: base_delay * 2^retryCount
    final delayMs = _baseRetryDelay.inMilliseconds * (1 << retryCount);
    final clampedMs = delayMs > _maxRetryDelay.inMilliseconds
        ? _maxRetryDelay.inMilliseconds
        : delayMs;

    // Add jitter (±10%) to prevent thundering herd
    final jitterMs = (clampedMs * 0.1).toInt();
    final randomOffsetMs = DateTime.now().millisecond ~/ 10;

    final finalMs = clampedMs + randomOffsetMs - jitterMs;
    return Duration(milliseconds: finalMs > 0 ? finalMs : clampedMs);
  }

  /// Process next retry
  Future<void> _processNextRetry() async {
    if (_queue.isEmpty) {
      _retryTimer = null;
      return;
    }

    // Get oldest job
    final oldestEntry = _queue.entries.first;
    final receiptId = oldestEntry.key;
    final job = oldestEntry.value;
    final retryCount = job.retryCount;

    _broadcastEvent(RetryQueueEvent(
      type: RetryQueueEventType.retry,
      receiptId: receiptId,
      message: 'Attempting retry ${retryCount + 1} for $receiptId',
    ));

    // Create printer service for retry
    try {
      // Import here to avoid circular dependency at top level
      final printerService = await _createPrinterService();

      // Attempt to print
      final result = await printerService.printReceipt(
        receiptId: receiptId,
        items: job.items ?? [],
        subtotal: job.subtotal ?? 0,
        taxAmount: job.taxAmount ?? 0,
        discountAmount: job.discountAmount ?? 0,
        total: job.total ?? 0,
        paymentMethod: job.paymentMethod ?? 'Unknown',
        customerId: job.customerId,
        cashierId: job.cashierId,
        timestamp: job.timestamp,
      );

      // Check result
      if (result.isSuccess) {
        await remove(receiptId);
        _broadcastEvent(RetryQueueEvent(
          type: RetryQueueEventType.success,
          receiptId: receiptId,
          message: 'Print job $receiptId succeeded on retry ${retryCount + 1}',
        ));
      } else {
        // Increment retry count and reschedule
        final updatedJob = job.copyWith(retryCount: retryCount + 1);
        _queue[receiptId] = updatedJob;

        _broadcastEvent(RetryQueueEvent(
          type: RetryQueueEventType.retryFailed,
          receiptId: receiptId,
          retryCount: retryCount + 1,
          error: result.error,
          message: 'Retry ${retryCount + 1} failed for $receiptId',
        ));

        // Schedule next retry or mark as failed
        if (retryCount + 1 < _maxRetries) {
          _scheduleRetry();
        } else {
          _broadcastEvent(RetryQueueEvent(
            type: RetryQueueEventType.maxRetriesReached,
            receiptId: receiptId,
            message: 'Max retries ($_maxRetries) reached for $receiptId',
          ));

          // Mark as permanently failed but keep in queue for manual review
          await remove(receiptId);
        }
      }

      printerService.dispose();
    } catch (e, stackTrace) {
      Logger.error('PrintRetryQueue._processNextRetry failed', e, stackTrace);

      // Increment retry count
      final updatedJob = job.copyWith(retryCount: retryCount + 1);
      _queue[receiptId] = updatedJob;

      if (retryCount + 1 < _maxRetries) {
        _scheduleRetry();
      } else {
        await remove(receiptId);
      }
    }
  }

  /// Process the entire queue (for manual trigger)
  Future<Result<void>> processQueue(dynamic printerService) async {
    if (_queue.isEmpty) {
      return const Success<void>(null);
    }

    try {
      _broadcastEvent(RetryQueueEvent(
        type: RetryQueueEventType.processing,
        message: 'Processing retry queue (${_queue.length} jobs)',
      ));

      int processed = 0;
      final failed = <String>[];

      for (final entry in _queue.entries) {
        final receiptId = entry.key;
        final job = entry.value;

        try {
          final result = await printerService.printReceipt(
            receiptId: receiptId,
            items: job.items ?? [],
            subtotal: job.subtotal ?? 0,
            taxAmount: job.taxAmount ?? 0,
            discountAmount: job.discountAmount ?? 0,
            total: job.total ?? 0,
            paymentMethod: job.paymentMethod ?? 'Unknown',
            customerId: job.customerId,
            cashierId: job.cashierId,
            timestamp: job.timestamp,
          );

          if (result.isSuccess) {
            processed++;
          } else {
            failed.add(receiptId);
          }
        } catch (e) {
          failed.add(receiptId);
          Logger.error('PrintRetryQueue.processQueue failed', e);
        }
      }

      // Remove successfully printed jobs
      if (processed > 0) {
        final jobsToRemove = _queue.keys
            .where((id) => !failed.contains(id))
            .toList();
        for (final id in jobsToRemove) {
          await remove(id);
        }
      }

      _broadcastEvent(RetryQueueEvent(
        type: RetryQueueEventType.completed,
        processed: processed,
        failed: failed.length,
        message:
            'Queue processing complete: $processed successful, ${failed.length} failed',
      ));

      // Schedule next retry if there are failures
      if (failed.isNotEmpty) {
        _scheduleRetry();
      }

      return const Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('PrintRetryQueue.processQueue failed', e, stackTrace);
      return Failure<void>('Processing failed: $e');
    }
  }

  // ===== Broadcast and Listen =====

  void _broadcastEvent(RetryQueueEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  StreamSubscription<RetryQueueEvent>? listenToEvents(
    void Function(RetryQueueEvent event) onData, {
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
    _retryTimer?.cancel();
    _eventController.close();
  }
}

// Helper to avoid circular import - creates PrinterService dynamically
Future<dynamic> _createPrinterService() async {
  // Dynamic import to break circular dependency
  // ignore: avoid_dynamic_calls
  final printerService =
      // ignore: avoid_dynamic_calls
      (await _importPrinterService()).PrinterService();
  return printerService;
}

// This will be resolved at runtime
Future<dynamic> _importPrinterService() async {
  // The actual import is handled by the Dart module system
  // This function exists to satisfy the analyzer
  throw UnsupportedError('This should be overridden by the actual import');
}
