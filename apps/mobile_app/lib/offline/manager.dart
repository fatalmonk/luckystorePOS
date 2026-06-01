import 'dart:async';
import 'package:workmanager/workmanager.dart';
import 'package:flutter/foundation.dart';
import '../offline/db.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      // C4 FIX: Initialize Supabase in isolate before using client
      final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
      final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

      if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
        debugPrint('Background sync failed: Missing Supabase credentials');
        return Future.value(false);
      }

      await Supabase.initialize(
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      );

      final database = OfflineDatabase();
      final supabase = Supabase.instance.client;

      final pendingActions = await database.getPendingActions();

      if (pendingActions.isEmpty) {
        return Future.value(true);
      }

      for (final action in pendingActions) {
        await database.updateActionStatus(action.id, SyncActionStatus.syncing);

        try {
          final payload = action.payload;

          // C5 FIX: Switch on actionType to call correct RPC
          String rpcName;
          switch (action.actionType) {
            case SyncActionType.insert:
              rpcName = 'complete_sale'; // Sales use complete_sale
              break;
            case SyncActionType.update:
              rpcName = 'update_stock'; // Stock adjustments use update_stock
              break;
            case SyncActionType.delete:
              rpcName = 'delete_transaction'; // Deletions use delete_transaction
              break;
          }

          final response = await supabase.rpc(
            rpcName,
            params: {'p_action': payload},
          );

          if (response != null && (response is Map && response['success'] == true)) {
            await database.updateActionStatus(action.id, SyncActionStatus.success);
          } else {
            await database.updateActionStatus(action.id, SyncActionStatus.failed);
          }
        } catch (e) {
          await database.updateActionStatus(action.id, SyncActionStatus.failed);
        }
      }

      return Future.value(true);
    } catch (e) {
      debugPrint('Background sync failed: $e');
      return Future.value(false);
    }
  });
}

class OfflineSyncManager {
  static final OfflineSyncManager _instance = OfflineSyncManager._internal();
  factory OfflineSyncManager() => _instance;
  OfflineSyncManager._internal();

  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );

    await Workmanager().registerPeriodicTask(
      'offlineSync',
      'offlineSyncTask',
      frequency: const Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }

  Future<void> enqueueSync(String actionId, Map<String, dynamic> payload) async {
    // C37 FIX: Implement actual Drift insert instead of stub
    final database = OfflineDatabase();
    await database.insertSyncAction(
      SyncAction(
        id: actionId,
        actionType: SyncActionType.insert, // Default to insert for now
        payload: payload.toString(), // Serialize Map to string for TextColumn
        status: SyncActionStatus.pending,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
    debugPrint('Sync task queued: $actionId');
  }
}