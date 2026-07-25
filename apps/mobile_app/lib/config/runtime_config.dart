/// Public configuration compiled into the mobile application.
///
/// Supply values with:
/// `--dart-define=SUPABASE_URL=...`
/// `--dart-define=SUPABASE_ANON_KEY=...`
///
/// These values are client-visible by design. Staff credentials, payment
/// credentials, service-role keys, and database secrets must never be added.
class RuntimeConfig {
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY');
  static const bool developmentMode =
      bool.fromEnvironment('DEV_MODE');

  static String edgeFunctionUrl(String functionName, {String url = supabaseUrl}) {
    return '${url.trim().replaceFirst(RegExp(r'/$'), '')}'
        '/functions/v1/$functionName';
  }

  static List<String> missingStartupVariables({
    String url = supabaseUrl,
    String anonKey = supabaseAnonKey,
  }) {
    return [
      if (url.trim().isEmpty) 'SUPABASE_URL',
      if (anonKey.trim().isEmpty) 'SUPABASE_ANON_KEY',
    ];
  }
}
