import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/runtime_config.dart';

enum StartupState {
  ready,
  blocked,
  degraded,
  warning,
}

enum StartupMode {
  strict,
  development,
  partial,
}

class StartupResult {
  final StartupState state;
  final StartupMode mode;
  final List<String> missingVariables;
  final List<String> warnings;
  final bool supabaseInitialized;

  const StartupResult({
    required this.state,
    required this.mode,
    required this.missingVariables,
    required this.warnings,
    required this.supabaseInitialized,
  });
}

class StartupGuardService {
  static bool _supabaseInitialized = false;

  static Future<StartupResult> validateAndBootstrap() async {
    final infra = _evaluateInfrastructure();
    final devMode = RuntimeConfig.developmentMode;
    final isStrictProduction = kReleaseMode && !devMode;
    final mode = isStrictProduction ? StartupMode.strict : StartupMode.development;

    // 1) Validate startup-critical env only -> 2) attempt init -> 3) derive state.
    // Runtime/mobile startup must not be blocked by legacy, docs-only, or optional
    // integration variables.
    if (infra.missing.isNotEmpty) {
      if (isStrictProduction) {
        return _buildResult(
          state: StartupState.blocked,
          mode: StartupMode.strict,
          missingVariables: infra.missing,
          warnings: const [],
        );
      }
      return _buildResult(
        state: StartupState.blocked,
        mode: StartupMode.development,
        missingVariables: infra.missing,
        warnings: const [
          'Startup-critical Supabase config is missing. App started in diagnostics-safe mode.',
        ],
      );
    }

    try {
      await _initializeSupabaseIfNeeded();
    } catch (_) {
      return _buildResult(
        state: StartupState.blocked,
        mode: isStrictProduction ? StartupMode.strict : StartupMode.development,
        missingVariables: const [],
        warnings: const ['Supabase bootstrap failed. Check configuration and connectivity.'],
      );
    }

    final warnings = <String>[
      if (devMode)
        'DEV_MODE override enabled: startup running in development flexibility mode.',
    ];

    return _buildResult(
      state: warnings.isEmpty ? StartupState.ready : StartupState.warning,
      mode: mode,
      missingVariables: const [],
      warnings: warnings,
    );
  }

  static Future<void> _initializeSupabaseIfNeeded() async {
    if (_supabaseInitialized) return;

    final supabaseUrl = RuntimeConfig.supabaseUrl.trim();
    final supabaseAnonKey = RuntimeConfig.supabaseAnonKey.trim();

    if (supabaseUrl.isEmpty) {
      throw StateError('SUPABASE_URL is missing or empty');
    }
    if (supabaseAnonKey.isEmpty) {
      throw StateError('SUPABASE_ANON_KEY is missing or empty');
    }

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
    _supabaseInitialized = true;
  }

  static _InfrastructureResult _evaluateInfrastructure() {
    return _InfrastructureResult(
      missing: RuntimeConfig.missingStartupVariables(),
    );
  }

  static StartupResult _buildResult({
    required StartupState state,
    required StartupMode mode,
    required List<String> missingVariables,
    required List<String> warnings,
  }) {
    return StartupResult(
      state: state,
      mode: mode,
      missingVariables: missingVariables,
      warnings: warnings,
      supabaseInitialized: _supabaseInitialized,
    );
  }
}

class _InfrastructureResult {
  final List<String> missing;
  const _InfrastructureResult({required this.missing});
}
