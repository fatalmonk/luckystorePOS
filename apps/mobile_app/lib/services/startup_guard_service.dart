import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/environment_contract.dart';

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
    // Try multiple paths for environment variables to handle web/mobile/desktop differences.
    final envPaths = ['assets/app.env', '.env', 'assets/.env'];
    bool loaded = false;
    
    for (final path in envPaths) {
      try {
        await dotenv.load(fileName: path);
        debugPrint('[StartupGuardService] Loaded environment from $path');
        loaded = true;
        break;
      } catch (e) {
        debugPrint('[StartupGuardService] Failed to load env from $path: $e');
      }
    }
    
    if (!loaded) {
      debugPrint('[StartupGuardService] No environment file could be loaded.');
    }

    final infra = _evaluateInfrastructure();
    final devMode = _isTrue(dotenv.maybeGet('DEV_MODE'));
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
    await Supabase.initialize(
      url: dotenv.env['SUPABASE_URL']!,
      anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
    );
    _supabaseInitialized = true;
  }

  static bool _isTrue(String? value) {
    final normalized = value?.trim().toLowerCase();
    return normalized == '1' || normalized == 'true' || normalized == 'yes';
  }

  static _InfrastructureResult _evaluateInfrastructure() {
    final missing = <String>[];
    for (final key in EnvironmentContract.requiredStartupVars) {
      final value = dotenv.maybeGet(key)?.trim() ?? '';
      if (value.isEmpty) missing.add(key);
    }
    return _InfrastructureResult(missing: missing);
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
