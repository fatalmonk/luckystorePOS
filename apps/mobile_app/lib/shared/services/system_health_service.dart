import 'package:supabase_flutter/supabase_flutter.dart';

enum HealthStatus {
  healthy,
  degraded,
  failing,
}

class SystemHealthSnapshot {
  final HealthStatus status;
  final bool supabaseConnectivityOk;
  final bool inventoryRpcOk;
  final bool dashboardRpcOk;
  final bool inventoryAccessOk;
  final bool authSessionValid;
  final bool gracePeriodActive;
  final DateTime checkedAt;
  final Map<String, String> details;

  const SystemHealthSnapshot({
    required this.status,
    required this.supabaseConnectivityOk,
    required this.inventoryRpcOk,
    required this.dashboardRpcOk,
    required this.inventoryAccessOk,
    required this.authSessionValid,
    required this.gracePeriodActive,
    required this.checkedAt,
    required this.details,
  });

  SystemHealthSnapshot.initial()
      : status = HealthStatus.degraded,
        supabaseConnectivityOk = false,
        inventoryRpcOk = false,
        dashboardRpcOk = false,
        inventoryAccessOk = false,
        authSessionValid = false,
        gracePeriodActive = false,
        checkedAt = DateTime.fromMillisecondsSinceEpoch(0),
        details = const {'status': 'Not yet checked'};
}

class SystemHealthMonitor {
  final SupabaseClient _supabase;
  final Duration _gracePeriod;
  DateTime? _firstFailureAt;

  SystemHealthMonitor({
    SupabaseClient? supabase,
    Duration gracePeriod = const Duration(seconds: 20),
  })  : _supabase = supabase ?? Supabase.instance.client,
        _gracePeriod = gracePeriod;

  Future<SystemHealthSnapshot> detect({
    required bool hasAuthSession,
    String? storeId,
    bool checkDashboard = false,
  }) async {
    final details = <String, String>{};
    bool supabaseConnectivityOk = false;
    bool inventoryRpcOk = false;
    bool dashboardRpcOk = false;
    bool inventoryAccessOk = false;
    final authSessionValid =
        hasAuthSession && _supabase.auth.currentSession?.user != null;

    try {
      // Query parties table to check network/socket connectivity.
      // If we receive a PostgrestException, the database server answered successfully, meaning connection is up.
      await _supabase.from('parties').select('id').limit(1);
      supabaseConnectivityOk = true;
    } catch (e) {
      if (e is PostgrestException) {
        supabaseConnectivityOk = true;
      } else {
        details['supabase'] = 'Connectivity check failed: $e';
      }
    }

    if (authSessionValid && _isUuid(storeId)) {
      try {
        await _supabase.rpc('search_items_pos', params: {
          'p_store_id': storeId,
          'p_query': '',
          'p_category_id': null,
          'p_limit': 1,
          'p_offset': 0,
        });
        inventoryRpcOk = true;
      } catch (e) {
        details['search_items_pos'] = 'RPC failed: $e';
      }

      try {
        await _supabase.from('items').select('id').limit(1);
        inventoryAccessOk = true;
      } catch (e) {
        details['inventory'] = 'Table access failed: $e';
      }

      if (checkDashboard) {
        try {
          await _supabase
              .rpc('get_manager_dashboard_stats', params: {'p_store_id': storeId});
          dashboardRpcOk = true;
        } catch (e) {
          details['dashboard'] = 'Dashboard RPC failed: $e';
        }
      }
    } else {
      details['session'] = 'No valid auth session or store context.';
    }

    final checks = [
      supabaseConnectivityOk,
      inventoryRpcOk,
      inventoryAccessOk,
      if (checkDashboard) dashboardRpcOk,
    ];
    final successCount = checks.where((v) => v).length;
    final status = successCount == checks.length
        ? HealthStatus.healthy
        : successCount == 0
            ? HealthStatus.failing
            : HealthStatus.degraded;

    final now = DateTime.now();
    if (status == HealthStatus.failing) {
      _firstFailureAt ??= now;
    } else {
      _firstFailureAt = null;
    }

    final gracePeriodActive = _firstFailureAt != null &&
        now.difference(_firstFailureAt!) <= _gracePeriod;

    return SystemHealthSnapshot(
      status: status,
      supabaseConnectivityOk: supabaseConnectivityOk,
      inventoryRpcOk: inventoryRpcOk,
      dashboardRpcOk: dashboardRpcOk,
      inventoryAccessOk: inventoryAccessOk,
      authSessionValid: authSessionValid,
      gracePeriodActive: gracePeriodActive,
      checkedAt: now,
      details: details,
    );
  }

  bool _isUuid(String? value) {
    if (value == null) return false;
    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[1-5][0-9a-fA-F]{3}\-[89abAB][0-9a-fA-F]{3}\-[0-9a-fA-F]{12}$',
    );
    return uuidRegex.hasMatch(value);
  }
}

class SystemHealthCache {
  final Duration ttl;
  SystemHealthSnapshot _snapshot = SystemHealthSnapshot.initial();
  SystemHealthSnapshot? _lastKnownGoodHealth;
  final Stopwatch _stopwatch = Stopwatch()..start();

  SystemHealthCache({
    this.ttl = const Duration(seconds: 20),
  });

  SystemHealthSnapshot get current => _snapshot;
  SystemHealthSnapshot? get lastKnownGoodHealth => _lastKnownGoodHealth;
  bool get isExpired => _stopwatch.elapsed >= ttl;
  bool get hasUsableSnapshot => _snapshot.checkedAt.millisecondsSinceEpoch > 0;

  void store(SystemHealthSnapshot snapshot) {
    _snapshot = snapshot;
    _stopwatch.reset();
    _stopwatch.start();
    if (snapshot.status != HealthStatus.failing) {
      _lastKnownGoodHealth = snapshot;
    }
  }

  SystemHealthSnapshot bestEffortSnapshot() {
    if (_snapshot.status == HealthStatus.failing && _lastKnownGoodHealth != null) {
      final fallback = _lastKnownGoodHealth!;
      return SystemHealthSnapshot(
        status: HealthStatus.degraded,
        supabaseConnectivityOk: fallback.supabaseConnectivityOk,
        inventoryRpcOk: fallback.inventoryRpcOk,
        dashboardRpcOk: fallback.dashboardRpcOk,
        inventoryAccessOk: fallback.inventoryAccessOk,
        authSessionValid: fallback.authSessionValid,
        gracePeriodActive: true,
        checkedAt: DateTime.now(),
        details: {
          ...fallback.details,
          'fallback': 'Using lastKnownGoodHealth due to temporary failure.',
        },
      );
    }
    return _snapshot;
  }

  void clear() {
    _snapshot = SystemHealthSnapshot.initial();
    _lastKnownGoodHealth = null;
    _stopwatch.reset();
    _stopwatch.start();
  }
}

class GracefulDegradationPolicy {
  final Duration failureThreshold;

  const GracefulDegradationPolicy({
    this.failureThreshold = const Duration(seconds: 25),
  });

  bool shouldBlock(SystemHealthSnapshot snapshot) {
    if (snapshot.status != HealthStatus.failing) return false;
    if (snapshot.gracePeriodActive) return false;
    final age = DateTime.now().difference(snapshot.checkedAt);
    return age >= failureThreshold;
  }
}

class SystemHealthEvaluator {
  final GracefulDegradationPolicy _policy;

  const SystemHealthEvaluator({
    GracefulDegradationPolicy policy = const GracefulDegradationPolicy(),
  }) : _policy = policy;

  bool isPosOperational(SystemHealthSnapshot snapshot, {required bool hasValidStoreId}) {
    if (_policy.shouldBlock(snapshot)) return false;
    return snapshot.authSessionValid &&
        hasValidStoreId &&
        snapshot.inventoryRpcOk &&
        snapshot.inventoryAccessOk;
  }

  bool isDashboardOperational(
    SystemHealthSnapshot snapshot, {
    required bool hasValidStoreId,
    required bool hasManagerRole,
  }) {
    return hasManagerRole &&
        snapshot.authSessionValid &&
        hasValidStoreId &&
        snapshot.supabaseConnectivityOk;
  }

  bool shouldShowWarningBanner(SystemHealthSnapshot snapshot) {
    return snapshot.gracePeriodActive || snapshot.status == HealthStatus.degraded;
  }
}
