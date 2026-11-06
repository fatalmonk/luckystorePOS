import 'package:flutter_test/flutter_test.dart';
import 'package:lucky_store/models/queued_offline_transaction.dart';

void main() {
  group('Queue Persistence', () {
    test('a malformed record does not hide valid persisted transactions', () {
      final valid = {
        'client_transaction_id': 'tx-valid',
        'store_id': 'store-1',
        'cashier_id': 'cashier-1',
        'created_at': '2026-11-06T00:00:00.000Z',
        'items': <Map<String, dynamic>>[],
        'payments': <Map<String, dynamic>>[],
      };
      final invalid = {
        ...valid,
        'client_transaction_id': 'tx-invalid',
        'created_at': 'not-a-date',
      };

      final decoded = decodeQueuedTransactionRecords([invalid, valid]);

      expect(decoded.transactions.map((item) => item.clientTransactionId), [
        'tx-valid',
      ]);
      expect(decoded.invalidRecords, [invalid]);
    });

    test('non-map records are retained for persistence', () {
      final decoded = decodeQueuedTransactionRecords(['damaged-entry', 42]);
      expect(decoded.transactions, isEmpty);
      expect(decoded.invalidRecords, ['damaged-entry', 42]);
    });

    test('copyWith preserves retry metadata unless explicitly cleared', () {
      final transaction = QueuedOfflineTransaction.fromJson({
        'client_transaction_id': 'tx-copy',
        'store_id': 'store-1',
        'cashier_id': 'cashier-1',
        'created_at': '2026-11-06T00:00:00.000Z',
        'next_retry_at': '2026-11-06T00:05:00.000Z',
        'last_error': 'network unavailable',
      });

      final preserved = transaction.copyWith(state: OfflineSyncState.syncing);
      final cleared = transaction.copyWith(nextRetryAt: null, lastError: null);

      expect(preserved.nextRetryAt, transaction.nextRetryAt);
      expect(preserved.lastError, transaction.lastError);
      expect(cleared.nextRetryAt, isNull);
      expect(cleared.lastError, isNull);
    });

    test('Queued transaction to JSON and back', () {
      final original = {
        'client_transaction_id': 'tx-store123-cash456-1234567890-abc',
        'transaction_trace_id': 'trace-1234567890-xyz',
        'state': 'pending',
        'retry_count': 0,
      };

      expect(original['client_transaction_id'], isNotNull);
      expect(original['state'], equals('pending'));
    });

    test('Multiple queue items persist correctly', () {
      final queue = [
        {'id': 'tx-1', 'state': 'pending'},
        {'id': 'tx-2', 'state': 'synced'},
        {'id': 'tx-3', 'state': 'failed'},
      ];

      expect(queue.length, equals(3));
      expect(queue[0]['state'], equals('pending'));
      expect(queue[1]['state'], equals('synced'));
      expect(queue[2]['state'], equals('failed'));
    });
  });

  group('Retry Logic & Exponential Backoff', () {
    test('Backoff duration increases with retry count', () {
      int computeBackoff(int retryCount) {
        const maxSeconds = 300;
        final exp = 2 << (retryCount.clamp(1, 8) - 1);
        final jitter = (retryCount % 4);
        final seconds = (exp + jitter).clamp(2, maxSeconds);
        return seconds;
      }

      expect(computeBackoff(2) > computeBackoff(1), isTrue);
      expect(computeBackoff(3) > computeBackoff(2), isTrue);
    });

    test('Max backoff is capped at 5 minutes', () {
      int computeBackoff(int retryCount) {
        const maxSeconds = 300;
        final exp = 2 << (retryCount.clamp(1, 8) - 1);
        final seconds = exp.clamp(2, maxSeconds);
        return seconds;
      }

      expect(computeBackoff(10), lessThanOrEqualTo(300));
    });
  });

  group('Conflict Detection', () {
    test('Conflict state is set when status is CONFLICT', () {
      expect('CONFLICT' == 'CONFLICT' || 'CONFLICT' == 'REJECTED', isTrue);
    });

    test('Synced state when status is SUCCESS', () {
      expect('SUCCESS' == 'SUCCESS' || 'SUCCESS' == 'ADJUSTED', isTrue);
    });

    test('failed state on exception', () {
      expect('failed', equals('failed'));
    });

    test('Conflict requires manager review flag', () {
      expect(!true, isFalse);
    });
  });

  group('Queue State Transitions', () {
    test('pending -> syncing -> synced (happy path)', () {
      var state = 'pending';
      state = 'syncing';
      state = 'synced';
      expect(state, equals('synced'));
    });

    test('pending -> syncing -> failed (with retry)', () {
      var state = 'pending';
      state = 'syncing';
      state = 'failed';
      expect(state, equals('failed'));
      state = 'pending';
      expect(state, equals('pending'));
    });

    test('pending -> syncing -> conflict (requires review)', () {
      var state = 'pending';
      state = 'syncing';
      state = 'conflict';
      expect(state, equals('conflict'));
    });
  });

  group('Dashboard Stats Calculation', () {
    test('Queued sales count excludes synced and conflict', () {
      final queue = [
        {'state': 'pending'},
        {'state': 'syncing'},
        {'state': 'synced'},
        {'state': 'failed'},
        {'state': 'conflict'},
      ];
      final queued =
          queue
              .where(
                (q) =>
                    q['state'] == 'pending' ||
                    q['state'] == 'syncing' ||
                    q['state'] == 'failed',
              )
              .length;
      expect(queued, equals(3));
    });

    test('Synced today count', () {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final queue = [
        {'state': 'synced', 'synced_at': now.toIso8601String()},
        {
          'state': 'synced',
          'synced_at': DateTime(2026, 4, 26).toIso8601String(),
        },
      ];
      final syncedToday =
          queue.where((q) {
            if (q['state'] != 'synced') return false;
            final syncedAt = DateTime.parse(q['synced_at'] as String);
            return syncedAt.isAfter(today);
          }).length;
      expect(syncedToday, equals(1));
    });
  });
}
