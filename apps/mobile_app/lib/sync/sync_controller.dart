import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:luckystorepos/offline/db.dart';
import 'package:luckystorepos/offline/sync_engine.dart';
import 'package:luckystorepos/sync/models/sync_metrics.dart';
import 'package:luckystorepos/sync/models/sync_status.dart';
import 'package:rxdart/rxdart.dart';

class SyncController {
  final OfflineDatabase db;
  final SyncEngine engine;

  final _metricsController = BehaviorSubject<SyncMetrics>.seeded(SyncMetrics.zero());
  final _statusNotifier = ValueNotifier<SyncStatus>(SyncStatus.online);
  
  StreamSubscription? _dbSub;
  bool _isOnline = true; // Should connect to real network monitor hook later

  SyncController(this.db, this.engine) {
    _initMonitoring();
  }

  Stream<SyncMetrics> get metrics => _metricsController.stream;
  ValueListenable<SyncStatus> get status => _statusNotifier;

  void _initMonitoring() {
    // Combine individual watch streams from Drift DB into composite state
    _dbSub = CombineLatestStream.combine3(
      db.watchPendingCount(),
      db.watchDlqCount(),
      db.watchConflictCount(),
      (int pending, int failed, int conflicts) {
        return SyncMetrics(
          pendingCount: pending,
          failedCount: failed,
          conflictCount: conflicts,
          queueDepth: pending + failed + conflicts,
          lastSyncAt: _metricsController.value.lastSyncAt,
        );
      }
    ).listen((updatedMetrics) {
      _metricsController.add(updatedMetrics);
      _deriveStatus(updatedMetrics);
    });
  }

  // Network driver externally triggers this
  void setConnectivity(bool isOnline) {
    _isOnline = isOnline;
    _deriveStatus(_metricsController.value);
    if (isOnline) {
      engine.processQueue(); // Kick process on reconnect
    }
  }

  void _deriveStatus(SyncMetrics m) {
    if (!_isOnline) {
      _statusNotifier.value = SyncStatus.offline;
      return;
    }
    if (m.conflictCount > 0) {
      _statusNotifier.value = SyncStatus.conflict;
      return;
    }
    if (m.failedCount > 5) {
       _statusNotifier.value = SyncStatus.degraded;
       return;
    }
    if (m.pendingCount > 0) {
      _statusNotifier.value = SyncStatus.syncing;
      return;
    }
    
    _statusNotifier.value = SyncStatus.online;
  }

  void dispose() {
    _dbSub?.cancel();
    _metricsController.close();
    _statusNotifier.dispose();
  }
}
