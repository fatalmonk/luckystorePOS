
// Feature flag configuration - shared layer for CANVA_CONTENT_PUBLISHER_ENABLED
export const CANVA_CONTENT_PUBLISHER_ENABLED = Deno.env.get('CANVA_CONTENT_PUBLISHER_ENABLED') === 'true'

// Helper to check if feature is enabled
export function isContentPublishingEnabled(): boolean {
  return CANVA_CONTENT_PUBLISHER_ENABLED
}
