import 'package:luckystorepos/telemetry/telemetry_streams.dart';
import 'package:luckystorepos/telemetry/telemetry_storage.dart';
import 'package:luckystorepos/telemetry/telemetry_aggregator.dart';
import 'package:luckystorepos/telemetry/telemetry_models/replay_latency_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/rpc_health_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/sync_health_metric.dart';

class TelemetryService {
  final streams = TelemetryStreams();
  final storage = TelemetryStorage();
  late final TelemetryAggregator aggregator;

  TelemetryService() {
    aggregator = TelemetryAggregator(streams, storage);
  }

  void recordLatency({
    required String operationId,
    required Duration duration,
    required bool success,
  }) {
    final m = ReplayLatencyMetric(
      timestamp: DateTime.now(),
      operationId: operationId,
      duration: duration,
      success: success,
    );
    storage.recordLatency(m);
    streams.emitLatency(m);
  }

  void recordRpcResult(String rpc, bool didFail) {
    final m = RpcHealthMetric(
      timestamp: DateTime.now(),
      rpcName: rpc,
      totalCalls: 1,
      failures: didFail ? 1 : 0,
    );
    storage.recordRpc(m);
    streams.emitRpcHealth(m);
  }

  void updateSyncHealth(bool isUp, {String? error}) {
    streams.emitSyncHealth(SyncHealthMetric(
      timestamp: DateTime.now(),
      availabilityScore: isUp ? 1.0 : 0.0,
      isSyncing: true,
      lastError: error,
    ));
  }
}
