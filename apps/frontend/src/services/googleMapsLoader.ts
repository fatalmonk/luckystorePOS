/**
 * @googlemaps/js-api-loader v2: `setOptions` + `importLibrary` (replaces v1 `Loader`; `apiKey` → `key`, `version` → `v`).
 * Pass `firstLoadOptions` on the first `importMapsLibrary(...)` call for `v`, `language`, etc., or call `setOptions` once yourself.
 * @see https://github.com/googlemaps/js-api-loader/blob/main/MIGRATION.md
 */
import { getGoogleMapsPlatformApiKey } from '../config/googleMapsPlatformKey'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

import type { APIOptions } from '@googlemaps/js-api-loader'

export type { APIOptions }

const apiKey = getGoogleMapsPlatformApiKey()

let optionsApplied = false

/** True when the Vite env has a Maps JS API key (same key as Places REST). */
export function isGoogleMapsJsApiConfigured(): boolean {
  return Boolean(apiKey)
}

/**
 * Ensures `setOptions({ key })` runs once, then loads a Maps JS API library.
 * When the promise resolves, the library is also available on `google.maps`.
 *
 * Library names include: `core`, `maps`, `maps3d`, `places`, `geocoding`, `routes`,
 * `marker`, `geometry`, `elevation`, `streetView`, `journeySharing`, `visualization`,
 * `airQuality`, `addressValidation`, `drawing` (deprecated), …
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 *
 * @param firstLoadOptions Merged into the first `setOptions` call only (e.g. `{ v: 'weekly', language: 'en' }`).
 */
export async function importMapsLibrary<T extends Parameters<typeof importLibrary>[0]>(
  libraryName: T,
  firstLoadOptions?: Omit<APIOptions, 'key'>
) {
  if (!apiKey) {
    throw new Error(
      'Google Maps JavaScript API key is not configured (set VITE_GOOGLE_MAPS_API_KEY_PLACES_API or VITE_GOOGLE_MAPS_API_KEY).'
    )
  }
  if (!optionsApplied) {
    setOptions({ key: apiKey, ...firstLoadOptions })
    optionsApplied = true
  }
  return importLibrary(libraryName)
}
