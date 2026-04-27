import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Configuration for network and API connections
class NetworkConfig {
  /// Base URL for Supabase
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  
  /// Supabase Anon Key for client-side operations
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  /// Supabase Service Role Key for server-side operations
  static String get supabaseServiceKey => dotenv.env['SUPABASE_SERVICE_KEY'] ?? '';
  
  /// HTTP request timeout in seconds
  static const int requestTimeout = 30;
  
  /// HTTP connection timeout in seconds
  static const int connectionTimeout = 10;
  
  /// Default HTTP headers
  static Map<String, String> get defaultHeaders => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
  };
  
  /// Headers for server-side (admin) requests
  static Map<String, String> get adminHeaders => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
  };
  
  /// Get user agent string
  static String get userAgent => 'LuckyStorePOS/1.0.0';
}
