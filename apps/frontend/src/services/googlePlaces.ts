import { getGoogleMapsPlatformApiKey } from '../config/googleMapsPlatformKey'

export type AddressPrediction = {
  placeId: string
  text: string
}

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: {
        text?: string
      }
    }
  }>
}

type PlaceDetailsResponse = {
  formattedAddress?: string
}

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1'

export function isGooglePlacesConfigured() {
  return Boolean(getGoogleMapsPlatformApiKey())
}

export function createPlacesSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function searchAddressPredictions(
  input: string,
  sessionToken: string
): Promise<AddressPrediction[]> {
  const key = getGoogleMapsPlatformApiKey()
  if (!key) return []
  if (!input.trim()) return []

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
    },
    body: JSON.stringify({
      input,
      sessionToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Places autocomplete failed (${response.status})`)
  }

  const json = (await response.json()) as AutocompleteResponse

  return (json.suggestions ?? [])
    .map((item) => {
      const placeId = item.placePrediction?.placeId
      const text = item.placePrediction?.text?.text

      if (!placeId || !text) return null
      return { placeId, text }
    })
    .filter((item): item is AddressPrediction => item !== null)
}

export async function getFormattedAddressFromPlaceId(
  placeId: string,
  sessionToken: string
): Promise<string | null> {
  const key = getGoogleMapsPlatformApiKey()
  if (!key) return null
  if (!placeId) return null

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'formattedAddress',
      'X-Goog-Session-Token': sessionToken,
    },
  })

  if (!response.ok) {
    throw new Error(`Google Places details failed (${response.status})`)
  }

  const json = (await response.json()) as PlaceDetailsResponse
  return json.formattedAddress ?? null
}
