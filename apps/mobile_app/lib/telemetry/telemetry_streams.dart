import 'dart:async';
import 'package:rxdart/rxdart.dart';
import 'package:luckystorepos/telemetry/telemetry_models/sync_health_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/replay_latency_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/conflict_rate_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/rpc_health_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/queue_depth_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/dlq_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/inventory_divergence_metric.dart';

class TelemetryStreams {
  final _syncHealthCtrl = BehaviorSubject<SyncHealthMetric>();
  final _latencyCtrl = PublishSubject<ReplayLatencyMetric>();
  final _conflictCtrl = PublishSubject<ConflictRateMetric>();
  final _rpcHealthCtrl = PublishSubject<RpcHealthMetric>();
  final _queueDepthCtrl = BehaviorSubject<QueueDepthMetric>();
  final _dlqCtrl = BehaviorSubject<DlqMetric>();
  final _divergenceCtrl = PublishSubject<InventoryDivergenceMetric>();

  Stream<SyncHealthMetric> get syncHealth => _syncHealthCtrl.stream;
  Stream<ReplayLatencyMetric> get replayLatency => _latencyCtrl.stream;
  Stream<ConflictRateMetric> get conflictRate => _conflictCtrl.stream;
  Stream<RpcHealthMetric> get rpcHealth => _rpcHealthCtrl.stream;
  Stream<QueueDepthMetric> get queueDepth => _queueDepthCtrl.stream;
  Stream<DlqMetric> get dlq => _dlqCtrl.stream;
  Stream<InventoryDivergenceMetric> get divergence => _divergenceCtrl.stream;

  void emitSyncHealth(SyncHealthMetric m) => _syncHealthCtrl.add(m);
  void emitLatency(ReplayLatencyMetric m) => _latencyCtrl.add(m);
  void emitConflict(ConflictRateMetric m) => _conflictCtrl.add(m);
  void emitRpcHealth(RpcHealthMetric m) => _rpcHealthCtrl.add(m);
  void emitQueueDepth(QueueDepthMetric m) => _queueDepthCtrl.add(m);
  void emitDlq(DlqMetric m) => _dlqCtrl.add(m);
  void emitDivergence(InventoryDivergenceMetric m) => _divergenceCtrl.add(m);

  void dispose() {
    _syncHealthCtrl.close();
    _latencyCtrl.close();
    _conflictCtrl.close();
    _rpcHealthCtrl.close();
    _queueDepthCtrl.close();
    _dlqCtrl.close();
    _divergenceCtrl.close();
  }
}
