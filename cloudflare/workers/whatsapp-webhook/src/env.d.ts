export interface Env {
  // Meta
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
  DAILY_SUMMARY_RECIPIENT: string;

  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}
