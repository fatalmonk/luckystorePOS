class EnvironmentContract {
  // Required to bootstrap the mobile app in all environments.
  static const List<String> requiredStartupVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  // Mobile runtime configuration is intentionally limited to public values.
  // Staff, payment, database, and service-role credentials are server-side only.
}
