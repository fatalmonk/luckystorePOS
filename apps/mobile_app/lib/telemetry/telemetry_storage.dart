import 'package:luckystorepos/telemetry/telemetry_models/replay_latency_metric.dart';
import 'package:luckystorepos/telemetry/telemetry_models/rpc_health_metric.dart';

class TelemetryStorage {
  // In-memory bounded buffers for recent history
  final List<ReplayLatencyMetric> _latencyHistory = [];
  final List<RpcHealthMetric> _rpcHistory = [];
  static const int maxHistory = 1000;

  void recordLatency(ReplayLatencyMetric m) {
    _latencyHistory.add(m);
    if (_latencyHistory.length > maxHistory) _latencyHistory.removeAt(0);
  }

  void recordRpc(RpcHealthMetric m) {
    _rpcHistory.add(m);
    if (_rpcHistory.length > maxHistory) _rpcHistory.removeAt(0);
  }

  List<ReplayLatencyMetric> getLatencySnapshot() => List.unmodifiable(_latencyHistory);
  List<RpcHealthMetric> getRpcSnapshot() => List.unmodifiable(_rpcHistory);
}
