import 'package:luckystorepos/offline/db.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';

class SyncEngine {
  final OfflineDatabase db;
  final SupabaseClient supabase;
  bool _isSyncing = false;

  SyncEngine(this.db, this.supabase);

  Future<void> queueEvent({
    required String eventType,
    required Map<String, dynamic> payload,
    String? deviceId,
    String? appVersion,
  }) async {
    final operationId = payload['operation_id'] ?? DateTime.now().millisecondsSinceEpoch.toString();

    // Phase 5 Safety: Protect against duplicate event injection at boundary
    final existing = await (db.select(db.offlineEvents)..where((tbl) => tbl.operationId.equals(operationId))).getSingleOrNull();
    if (existing != null) {
      debugPrint('⚠️ Blocked duplicate event injection attempt: $operationId');
      return;
    }

    await db.into(db.offlineEvents).insert(OfflineEventsCompanion.insert(
      operationId: operationId,
      eventType: eventType,
      payload: jsonEncode(payload),
      deviceId: drift.Value(deviceId),
      appVersion: drift.Value(appVersion),
    ));

    processQueue();
  }

  Future<void> processQueue() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final pendingEvents = await db.getPendingEvents();
      if (pendingEvents.isEmpty) {
        _isSyncing = false;
        return;
      }

      for (final event in pendingEvents) {
        await _processEvent(event);
      }
    } catch (e) {
      debugPrint('SyncEngine error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _processEvent(OfflineEvent event) async {
    await db.updateEventStatus(event.operationId, EventSyncStatus.processing);

    try {
      // Replay RPC based on eventType
      final payload = jsonDecode(event.payload);
      
      String rpcName;
      switch (event.eventType) {
        case 'stock_adjusted':
          rpcName = 'adjust_inventory_stock';
          break;
        case 'sale_created':
          rpcName = 'deduct_stock'; // Or process_sale
          break;
        case 'purchase_recorded':
          rpcName = 'record_purchase_v2';
          break;
        default:
          throw Exception('Unknown event type: ${event.eventType}');
      }

      final response = await supabase.rpc(rpcName, params: payload);

      // Conflict handling strategy
      if (response != null && response is Map && response['conflict'] == true) {
        // Log structured conflict
        await db.recordConflict(
          operationId: event.operationId,
          productId: payload['product_id'] ?? payload['item_id'] ?? 'unknown',
          expected: response['expected_quantity'] ?? 0,
          actual: response['actual_quantity'] ?? 0,
          payload: event.payload,
        );

        // Halt replay, preserve event in dead letter
        await db.updateEventStatus(event.operationId, EventSyncStatus.failed);
        await db.into(db.deadLetterEvents).insert(DeadLetterEventsCompanion.insert(
          operationId: event.operationId,
          eventType: event.eventType,
          payload: event.payload,
          failureReason: 'Sync Conflict: Expected ${response['expected_quantity']}, Actual ${response['actual_quantity']}',
        ));
        return;
      }

      await db.updateEventStatus(event.operationId, EventSyncStatus.synced);
      
    } catch (e) {
      debugPrint('Failed to sync event ${event.operationId}: $e');
      
      if (event.retryCount >= 3) {
        // Move to DLQ
        await db.updateEventStatus(event.operationId, EventSyncStatus.failed);
        await db.into(db.deadLetterEvents).insert(DeadLetterEventsCompanion.insert(
          operationId: event.operationId,
          eventType: event.eventType,
          payload: event.payload,
          failureReason: e.toString(),
        ));
      } else {
        await db.incrementRetryCount(event.operationId);
        await db.updateEventStatus(event.operationId, EventSyncStatus.pending);
      }
    }
  }
}
