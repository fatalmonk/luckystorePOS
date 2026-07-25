import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/runtime_config.dart';

/// Configuration for network and API connections
class NetworkConfig {
  /// Base URL for Supabase
  static String get supabaseUrl => RuntimeConfig.supabaseUrl;

  /// Supabase Anon Key for client-side operations
  static String get supabaseAnonKey => RuntimeConfig.supabaseAnonKey;

  /// HTTP request timeout in seconds
  static const int requestTimeout = 30;

  /// HTTP connection timeout in seconds
  static const int connectionTimeout = 10;

  /// Default HTTP headers (use session JWT for Authorization, not anon key)
  static Map<String, String> defaultHeaders() {
    final session = Supabase.instance.client.auth.currentSession;
    return {
      'Content-Type': 'application/json',
      if (session?.accessToken != null) 'Authorization': 'Bearer ${session!.accessToken}',
    };
  }

  /// Get headers with current session JWT
  static Map<String, String> authHeaders() {
    final session = Supabase.instance.client.auth.currentSession;
    return {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      if (session?.accessToken != null) 'Authorization': 'Bearer ${session!.accessToken}',
    };
  }

  /// Get user agent string
  static String get userAgent => 'LuckyStorePOS/1.0.0';
}
