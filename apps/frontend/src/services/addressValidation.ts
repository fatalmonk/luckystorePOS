/**
 * Google Address Validation API (REST).
 * https://developers.google.com/maps/documentation/addressvalidation/overview
 *
 * Enable "Address Validation API" for the same key as Places / Maps (Cloud Console).
 */

import { getGoogleMapsPlatformApiKey } from '../config/googleMapsPlatformKey'

const GOOGLE_MAPS_API_KEY = getGoogleMapsPlatformApiKey()
const ADDRESS_VALIDATION_URL = 'https://addressvalidation.googleapis.com/v1:validateAddress'

/** Request `address` object (subset of Google’s postal address). */
export type PostalAddressInput = {
  regionCode: string
  locality?: string
  administrativeArea?: string
  postalCode?: string
  addressLines: string[]
  languageCode?: string
}

export type ValidateAddressRequestBody = {
  address: PostalAddressInput
  /** e.g. enable uspsCass for US mailing standards */
  enableUspsCass?: boolean
}

export function isAddressValidationConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY)
}

/**
 * POSTs to `:validateAddress` and returns the JSON body.
 * Throws if the key is missing or the response is not ok.
 */
export async function validateAddress(
  body: ValidateAddressRequestBody
): Promise<unknown> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      'Address Validation requires VITE_GOOGLE_MAPS_API_KEY_PLACES_API or VITE_GOOGLE_MAPS_API_KEY'
    )
  }

  const url = `${ADDRESS_VALIDATION_URL}?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Address Validation failed (${response.status}): ${text}`)
  }

  return response.json()
}
