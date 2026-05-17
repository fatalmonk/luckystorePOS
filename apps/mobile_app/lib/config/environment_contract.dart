class EnvironmentContract {
  // Required to bootstrap the mobile app in all environments.
  static const List<String> requiredStartupVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  // Required for role-based PIN sign-in flow used by AuthProvider.
  static const List<String> requiredRoleCredentialVars = [
    'MANAGER_EMAIL',
    'MANAGER_PASSWORD',
    'CASHIER_EMAIL',
    'CASHIER_PASSWORD',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
  ];

  // Required for local developer workflows (scripts / ops).
  static const List<String> requiredDevelopmentVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  // Optional integrations and workflow-specific variables.
  static const List<String> optionalIntegrationVars = [
    'SSLCOMMERZ_STORE_ID',
    'SSLCOMMERZ_STORE_PASSWORD',
    'SSLCOMMERZ_IS_LIVE',
    'GEMINI_API_KEY',
    'VITE_SUPABASE_URL',
    'BKASH_BASE_URL',
    'BKASH_APP_KEY',
    'BKASH_APP_SECRET',
    'CREATE_SALE_EDGE_URL',
  ];

  // Kept for historical reference; should not be used by active code.
  static const List<String> deprecatedVars = [
    'DATABASE_URL',
    'DIRECT_DATABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_IMPORT_INVENTORY_EDGE_URL',
    'VITE_PROCESS_SALE_EDGE_URL',
    'VITE_CREATE_SALE_EDGE_URL',
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_O_AUTH_CLIENT_ID',
    'GOOGLE_MAPS_API_KEY_PLACES_API',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_DB_PASSWORD',
  ];
}
