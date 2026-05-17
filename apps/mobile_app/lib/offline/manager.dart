import 'dart:async';
import 'package:workmanager/workmanager.dart';
import 'package:flutter/foundation.dart';
import '../offline/db.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
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
          
          final response = await supabase.rpc('complete_sale', 
            params: {'p_action': payload}
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
    debugPrint('Sync task queued: $actionId');
  }
}

