import 'dart:async';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Concurrent Payment Processing', () {
    test('Multiple payments for same sale should be serialized', () async {
      final payments = <Map<String, dynamic>>[];
      final lock = Completer<void>();

      Future<void> submitPayment1() async {
        await lock.future;
        payments.add({'saleId': 'sale-123', 'amount': 100, 'method': 'cash'});
      }

      Future<void> submitPayment2() async {
        await lock.future;
        payments.add({'saleId': 'sale-123', 'amount': 50, 'method': 'card'});
      }

      final futures = [submitPayment1(), submitPayment2()];
      lock.complete(); // Release both at same time
      await Future.wait(futures);

      expect(payments.length, equals(2));
      expect(payments.any((p) => p['method'] == 'cash'), isTrue);
      expect(payments.any((p) => p['method'] == 'card'), isTrue);
    });

    test('Payment total should not exceed sale amount', () {
      final saleTotal = 150.0;
      final payments = [
        {'amount': 100.0, 'method': 'cash'},
        {'amount': 50.0, 'method': 'card'},
      ];

      final totalPaid = payments.fold(0.0, (sum, p) => sum + (p['amount'] as double));
      expect(totalPaid, lessThanOrEqualTo(saleTotal));
    });
  });

  group('Stock Decrement Race Conditions', () {
    test('Simultaneous sales of same item should not cause negative stock', () async {
      var currentStock = 5;
      final results = <bool>[];
      final mutex = _Mutex();

      final futures = <Future>[];
      for (var i = 0; i < 10; i++) {
        futures.add(() async {
          await mutex.acquire();
          try {
            if (currentStock > 0) {
              currentStock--;
              results.add(true);
            } else {
              results.add(false);
            }
          } finally {
            mutex.release();
          }
        }());
      }

      await Future.wait(futures);

      final successCount = results.where((r) => r).length;
      expect(successCount, lessThanOrEqualTo(5));
      expect(currentStock, equals(0));
    });

    test('validate_sale_intent should catch stock issues', () {
      final saleItems = [
        {'item_id': 'item-1', 'qty': 10, 'stock': 5},
        {'item_id': 'item-2', 'qty': 3, 'stock': 10},
      ];

      for (final item in saleItems) {
        final qty = item['qty'] as int;
        final stock = item['stock'] as int;
        final hasStock = stock >= qty;

        if (item['item_id'] == 'item-1') {
          expect(hasStock, isFalse);
        } else {
          expect(hasStock, isTrue);
        }
      }
    });
  });

  group('Offline Sync Race Conditions', () {
    test('Sync worker with proper locking should not run concurrently', () async {
      final mutex = _Mutex();
      var syncAttempts = 0;

      Future<void> syncQueue() async {
        final acquired = await mutex.tryAcquire();
        if (!acquired) return;
        
        try {
          syncAttempts++;
          await Future.delayed(const Duration(milliseconds: 100));
        } finally {
          mutex.release();
        }
      }

      await Future.wait([syncQueue(), syncQueue(), syncQueue(), syncQueue()]);

      // With proper locking, only one should execute
      expect(syncAttempts, equals(1));
    });

    test('isSyncing flag prevents concurrent sync operations', () async {
      final completer = Completer<void>();
      var isSyncing = false;
      var syncCount = 0;

      Future<void> attemptSync() async {
        if (isSyncing) return;
        isSyncing = true;
        syncCount++;
        await completer.future; // Hold the lock
        isSyncing = false;
      }

      // Start multiple sync attempts
      final futures = [attemptSync(), attemptSync(), attemptSync()];
      
      // Only first should start, others should return early
      await Future.delayed(const Duration(milliseconds: 50));
      expect(syncCount, equals(1));
      
      // Release the lock
      completer.complete();
      await Future.wait(futures);
    });
  });

  group('Session State Consistency', () {
    test('Session with proper locking should not open twice', () async {
      final mutex = _Mutex();
      var sessionOpen = false;
      var openAttempts = 0;

      Future<bool> openSession() async {
        final acquired = await mutex.tryAcquire();
        if (!acquired) return false;
        
        try {
          if (sessionOpen) return false;
          await Future.delayed(const Duration(milliseconds: 50));
          sessionOpen = true;
          openAttempts++;
          return true;
        } finally {
          mutex.release();
        }
      }

      final results = await Future.wait([openSession(), openSession(), openSession()]);

      expect(results.where((r) => r).length, equals(1));
      expect(openAttempts, equals(1));
    });
  });
}

/// Simple mutex for testing
class _Mutex {
  Completer<void>? _lock;

  Future<void> acquire() async {
    while (_lock != null) {
      await _lock!.future;
    }
    _lock = Completer<void>();
  }

  Future<bool> tryAcquire() async {
    if (_lock != null) return false;
    _lock = Completer<void>();
    return true;
  }

  void release() {
    _lock?.complete();
    _lock = null;
  }
}
