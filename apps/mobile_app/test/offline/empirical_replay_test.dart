import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:lucky_store/features/sales/offline_transaction_sync_service.dart';
import 'package:lucky_store/models/sale_transaction_snapshot.dart';

class MockSupabaseClient extends Mock implements SupabaseClient {}
class MockPathProvider extends Mock
    with MockPlatformInterfaceMixin
    implements PathProviderPlatform {
  final String tempPath;
  MockPathProvider(this.tempPath);

  @override
  Future<String?> getApplicationDocumentsPath() async => tempPath;
  @override
  Future<String?> getApplicationSupportPath() async => tempPath;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late String tempDirPath;
  late MockSupabaseClient mockSupabase;
  late OfflineTransactionSyncService service;

  setUpAll(() {
    registerFallbackValue(const <String, dynamic>{});
  });

  setUp(() async {
    tempDirPath = Directory.systemTemp.createTempSync('p10_empirical_').path;
    PathProviderPlatform.instance = MockPathProvider(tempDirPath);
    
    mockSupabase = MockSupabaseClient();
    service = OfflineTransactionSyncService.instance;
    
    // Standard fresh boot
    final file = File('$tempDirPath/offline_transaction_queue.json');
    await file.writeAsString(jsonEncode({'version': 2, 'transactions': []}));
    await service.initialize(mockSupabase);
  });

  tearDown(() {
    if (Directory(tempDirPath).existsSync()) {
      Directory(tempDirPath).deleteSync(recursive: true);
    }
  });

  test('COMPLETE EMPIRICAL REPLAY CERTIFICATION CASCADE', () async {
    print('[EXECUTION] --- SCENARIO S1: OFFLINE ENQUEUE ---');
    
    final intent1 = SaleTransactionIntent(
      clientTransactionId: 'tx-s1',
      transactionTraceId: 'tr-1',
      storeId: 's-1',
      cashierId: 'c-1',
      sessionId: 'ses-1',
      items: [],
      payments: [],
      cartDiscount: 0.0,
      createdAt: DateTime.now(),
    );

    await service.enqueueSale(intent: intent1, snapshot: {});
    
    final dataFile = File('$tempDirPath/offline_transaction_queue.json');
    final rawData = jsonDecode(await dataFile.readAsString());
    final transactions = rawData['transactions'] as List;
    
    expect(transactions.isNotEmpty, true);
    expect(transactions.first['sequence_id'], 1, reason: 'Sequence ID MUST be 1 on fresh init');
    print('✅ S1 COMPLETE: Physical write confirmed sequence_id = 1');


    print('\n[EXECUTION] --- SCENARIO S2: RESTART HYDRATION ---');
    // Trigger re-init to force filesystem load
    await service.initialize(mockSupabase);
    expect(service.queue.length, 1, reason: 'Queue restored from file');
    
    final intent2 = SaleTransactionIntent(
      clientTransactionId: 'tx-s2',
      transactionTraceId: 'tr-2', storeId: 's-1', cashierId: 'c-1', sessionId: 'ses-1',
      items: [], payments: [], cartDiscount: 0.0, createdAt: DateTime.now(),
    );
    await service.enqueueSale(intent: intent2, snapshot: {});
    expect(service.queue[1].sequenceId, 2, reason: 'Monotonic counter incremented correctly across reboots');
    print('✅ S2 COMPLETE: Monotonic counter hydration verified (Next ID=2)');


    print('\n[EXECUTION] --- SCENARIO S3: LEASE EXPIRATION RECOVERY ---');
    // Manually forge the file on disk to inject a stale lease transaction
    final staleLeaseTime = DateTime.now().subtract(const Duration(minutes: 10)).toIso8601String();
    final manipulatedData = {
      'version': 2,
      'transactions': [
        {
          'sequence_id': 10,
          'client_transaction_id': 'zombie-tx',
          'transaction_trace_id': 'trace-z',
          'store_id': 's-1', 'cashier_id': 'c-1', 'session_id': 'ses-1',
          'items': [], 'payments': [], 'discount': 0.0,
          'created_at': DateTime.now().toIso8601String(),
          'state': 'syncing', // Injected state
          'lease_expires_at': staleLeaseTime, // Injected stall
          'sync_validation_state': 'PENDING',
          'fulfillment_policy': 'STRICT'
        }
      ]
    };
    await dataFile.writeAsString(jsonEncode(manipulatedData));
    
    // IMPORTANT: Bypass short-circuit identical() check to force true reload
    final mockSupabase2 = MockSupabaseClient();
    await service.initialize(mockSupabase2); // Trigger reload!
    
    expect(service.queue.first.state, OfflineSyncState.syncing, reason: 'Simulated Zombie state loaded');
    expect(service.queue.first.leaseExpiresAt != null, true);

    // MOCK NETWORK TO THROW SO SYNC RE-TRIGGERS FAILURE IF RECLAIM FAILS
    when(() => mockSupabase2.rpc(any(), params: any(named: 'params')))
        .thenThrow(const SocketException('Offline simulated'));

    // ACTIVATE THE LOOP!
    await service.triggerSyncQueueForTesting();

    // VERIFY IT GOT RECLAIMED BY RECOVERY SCAN
    final recoveredTx = service.queue.first;
    expect(recoveredTx.state, isNot(OfflineSyncState.syncing), reason: 'Zombie item escaped the lock!');
    // Note: After escape, it went directly into the candidate execution, which triggered the exception mock!
    // So it should land in state FAILED! (Instead of remaining stuck in syncing).
    expect(recoveredTx.lastAckClassification, isNotNull, reason: 'Item engaged error classification loop!');
    print('✅ S3 COMPLETE: Lease reclaimed, zombie transaction unfrozen! Current State: ${recoveredTx.state}');


    print('\n[EXECUTION] --- SCENARIO S5: ACK TAXONOMY & RETRY CAP ---');
    // Reset state to fresh pending item
    final testItem = service.queue.first.copyWith(
      state: OfflineSyncState.pending,
      retryCount: 14, // Set near threshold
      nextRetryAt: null,
    );
    // Force update in queue via reload injection trick
    manipulatedData['transactions'] = [
      {
        ...testItem.toJson(),
        'retry_count': 14,
        'state': 'pending',
        'lease_expires_at': null
      }
    ];
    await dataFile.writeAsString(jsonEncode(manipulatedData));
    
    // Pass THIRD distinct mock instance to bypass identity short-circuit again!
    final mockSupabase3 = MockSupabaseClient();
    await service.initialize(mockSupabase3);

    expect(service.queue.first.retryCount, 14);

    // Trigger 15th retry!
    when(() => mockSupabase3.rpc(any(), params: any(named: 'params')))
        .thenThrow(const SocketException('Simulated continuous network failure'));

    await service.triggerSyncQueueForTesting();

    final cappedTx = service.queue.first;
    expect(cappedTx.retryCount, 15, reason: 'Retry counter incremented');
    expect(cappedTx.state, OfflineSyncState.conflict, reason: 'MUST cap out to CONFLICT state (terminal) at attempt 15');
    expect(cappedTx.lastAckClassification, SyncAckClassification.unknownFailure, reason: 'Classification overriden to cap sentinel');
    print('✅ S5 COMPLETE: Hard 15-retry cap triggered, item quarantined successfully!');
    
    print('\n🎉 ALL SCENARIOS PASSED PHYSICAL EXECUTION LOGIC!');
  });
}
