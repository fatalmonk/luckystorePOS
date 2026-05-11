import 'dart:async';
import 'package:luckystorepos/telemetry/telemetry_streams.dart';
import 'package:luckystorepos/telemetry/telemetry_storage.dart';

class TelemetryAggregator {
  final TelemetryStreams streams;
  final TelemetryStorage storage;

  TelemetryAggregator(this.streams, this.storage);

  double computeAvgLatencyMs() {
    final snap = storage.getLatencySnapshot();
    if (snap.isEmpty) return 0;
    final totalMs = snap.fold(0, (int sum, m) => sum + m.duration.inMilliseconds);
    return totalMs / snap.length;
  }

  double computeReplaySuccessRatio() {
    final snap = storage.getLatencySnapshot();
    if (snap.isEmpty) return 1.0;
    final successCount = snap.where((m) => m.success).length;
    return successCount / snap.length;
  }

  Map<String, dynamic> generateOperationalSummary() {
    return {
      'avg_latency_ms': computeAvgLatencyMs(),
      'success_ratio': computeReplaySuccessRatio(),
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}
