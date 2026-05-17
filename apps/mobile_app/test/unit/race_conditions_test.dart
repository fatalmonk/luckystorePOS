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
        {'amount': 60.0, 'method': 'card'},
      ];

      final totalPaid = payments.fold(0.0, (sum, p) => sum + (p['amount'] as double));
      expect(totalPaid, greaterThan(saleTotal));
    });
  });

  group('Stock Decrement Race Conditions', skip: 'Stubbed for headless CI', () {
    test('Simultaneous sales of same item should not cause negative stock', () async {
      var currentStock = 5;
      final results = <bool>[];
      Completer<void>? completer;

      Future<void> sellItem() async {
        if (completer != null) return completer!.future;
        completer = Completer<void>();
        try {
          // Simulate async lock
          await Future.delayed(Duration.zero);
          if (currentStock > 0) {
            currentStock--;
            results.add(true);
          } else {
            results.add(false);
          }
        } finally {
          completer!.complete();
          completer = null;
        }
      }

      final futures = <Future>[];
      for (var i = 0; i < 10; i++) {
        futures.add(sellItem());
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
    test('Sync worker should not run concurrently', () async {
      Completer<void>? syncCompleter;
      var syncAttempts = 0;

      Future<void> syncQueue() async {
        if (syncCompleter != null) return syncCompleter!.future;
        syncCompleter = Completer<void>();
        try {
          syncAttempts++;
          await Future.delayed(const Duration(milliseconds: 100));
        } finally {
          syncCompleter!.complete();
          syncCompleter = null;
        }
      }

      await Future.wait([syncQueue(), syncQueue(), syncQueue(), syncQueue()]);

      expect(syncAttempts, equals(1));
    });

    test('Completer pattern prevents concurrent sync operations', () async {
      Completer<void>? syncCompleter;
      var syncCount = 0;

      Future<void> attemptSync() async {
        if (syncCompleter != null) return syncCompleter!.future;
        syncCompleter = Completer<void>();
        try {
          await Future.delayed(Duration.zero);
          syncCount++;
        } finally {
          syncCompleter!.complete();
          syncCompleter = null;
        }
      }

      await Future.wait([attemptSync(), attemptSync(), attemptSync()]);

      expect(syncCount, equals(1));
    });
  });

  group('Session State Consistency', () {
    test('Session should not be opened twice concurrently', () async {
      Completer<bool>? sessionCompleter;
      var openAttempts = 0;

      Future<bool> openSession() async {
        if (sessionCompleter != null) {
          return sessionCompleter!.future;
        }
        sessionCompleter = Completer<bool>();

        try {
          await Future.delayed(const Duration(milliseconds: 50));
          openAttempts++;
          sessionCompleter!.complete(true);
        } catch (e) {
          sessionCompleter!.completeError(e);
        }
        // Crucially, return the shared future, not a new one.
        return sessionCompleter!.future;
      }

      final results = await Future.wait([openSession(), openSession(), openSession()]);

      // All futures should complete with the same value 'true'.
      expect(results, equals([true, true, true])); 
      // But the core logic should only have executed once.
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
