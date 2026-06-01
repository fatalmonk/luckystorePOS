import 'dart:async';
import 'dart:math';
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

  // C10 FIX: Factory function to create PrinterService, breaking circular dependency
  final Future<dynamic> Function() _printerServiceFactory;

  int get retryCount => _queue.length;
  bool get isEmpty => _queue.isEmpty;
  bool get isProcessing => _retryTimer != null;
  int get maxRetries => _maxRetries;

  PrintRetryQueue({
    int maxRetries = PrinterConfig.maxRetryAttempts,
    Duration baseRetryDelay = PrinterConfig.baseRetryDelay,
    Duration maxRetryDelay = PrinterConfig.maxRetryDelay,
    Future<dynamic> Function()? printerServiceFactory,
  })  : _maxRetries = maxRetries,
        _baseRetryDelay = baseRetryDelay,
        _maxRetryDelay = maxRetryDelay,
        _printerServiceFactory = printerServiceFactory ?? (() async => throw UnimplementedError('PrintRetryQueue requires printerServiceFactory for retries')),
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

    // C46 FIX: Correct jitter calculation (±10% uniform distribution)
    final jitterMs = (clampedMs * 0.1).toInt();
    final randomOffsetMs = Random().nextInt(jitterMs * 2 + 1) - jitterMs;

    final finalMs = clampedMs + randomOffsetMs;
    return Duration(milliseconds: finalMs > 0 ? finalMs.toInt() : clampedMs);
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

    // Create printer service for retry using factory
    try {
      final printerService = await _printerServiceFactory();

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

        // Check if max retries exceeded
        if (retryCount + 1 >= _maxRetries) {
          await remove(receiptId);
          _broadcastEvent(RetryQueueEvent(
            type: RetryQueueEventType.maxRetriesReached,
            receiptId: receiptId,
            message: 'Print job $receiptId failed after $_maxRetries attempts',
          ));
        } else {
          _scheduleRetry();
        }
      }
    } catch (e, stackTrace) {
      Logger.error('PrintRetryQueue retry failed', e, stackTrace);

      // Increment retry count and reschedule
      final updatedJob = job.copyWith(retryCount: retryCount + 1);
      _queue[receiptId] = updatedJob;

      // Check if max retries exceeded
      if (retryCount + 1 >= _maxRetries) {
        await remove(receiptId);
        _broadcastEvent(RetryQueueEvent(
          type: RetryQueueEventType.maxRetriesReached,
          receiptId: receiptId,
          message: 'Print job $receiptId failed after $_maxRetries attempts',
        ));
      } else {
        _scheduleRetry();
      }
    }
  }

  // ===== Event Broadcasting =====

  void _broadcastEvent(RetryQueueEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  // ===== Dispose =====

  void dispose() {
    _retryTimer?.cancel();
    _eventController.close();
  }
}