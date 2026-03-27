/**
 * Google Maps Platform key for browser (Places, Maps JS, Address Validation).
 * Prefer VITE_GOOGLE_MAPS_API_KEY_PLACES_API; fall back to VITE_GOOGLE_MAPS_API_KEY.
 */
export function getGoogleMapsPlatformApiKey(): string | undefined {
  const v =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY_PLACES_API ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}
