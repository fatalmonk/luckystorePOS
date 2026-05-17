import 'package:flutter/foundation.dart';

@immutable
class DeviceSyncProfile {
  final String deviceId;
  final String appVersion;
  final int totalEventsQueued;
  final int totalEventsSynced;
  final DateTime firstSeenAt;
  final DateTime lastSeenAt;

  const DeviceSyncProfile({
    required this.deviceId,
    required this.appVersion,
    required this.totalEventsQueued,
    required this.totalEventsSynced,
    required this.firstSeenAt,
    required this.lastSeenAt,
  });
}
