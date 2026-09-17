type SupabaseQueryError = { code?: string; message?: string } | null | undefined;

/** Only a missing optional translation table is safe to treat as no overlay. */
export function isMissingItemTranslationsTableError(error: SupabaseQueryError): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /relation [^\n]*item_translations[^\n]* does not exist/i.test(error.message ?? '')
  );
}
