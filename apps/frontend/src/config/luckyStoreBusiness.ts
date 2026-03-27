/**
 * Canonical Lucky Store business / location metadata (Google Maps).
 * businessId is stored as a string because it exceeds JS Number safe integer range.
 * Coordinates and listing URL align with legacy Place Details for `googlePlaceId`.
 */
export const LUCKY_STORE_BUSINESS = {
  businessName: 'Lucky Store',
  /** Places API (New) place id; use with GET .../v1/places/{place_id} or Place Details. */
  googlePlaceId: 'ChIJH4nhmJAnrTARgEupScnGdJI',
  /** Google-internal style ID from Maps / sharing (use as string; do not parse as Number). */
  businessId: '16339191615017729069',
  /** CID from Place Details `url` (maps.google.com/?cid=…). */
  googleMapsCid: '10553278394662472576',
  address: {
    line1: '665 Percival Hill Rd',
    area: 'Emdad Park',
    ward: '16 No. Chawk Bazaar Ward',
    locality: 'Chattogram',
    country: 'Bangladesh',
    postalCode: '4203',
    /** Single-line for display / maps search. */
    formatted:
      'Emdad Park, 665 Percival Hill Rd, Chattogram, Bangladesh 4203',
    /** As returned by Google Places formatted_address (locality spelling may differ). */
    formattedGoogle:
      'Emdad Park, 665 Percival Hill Rd, Chittagong 4203, Bangladesh',
  },
  contact: {
    nationalPhone: '01729-809879',
    internationalPhone: '+880 1729-809879',
  },
  location: {
    /** From Place Details `geometry.location`. */
    latitude: 22.3550277,
    longitude: 91.8363056,
  },
  plusCode: {
    globalCode: '7MJH9R4P+2G',
    compound: '9R4P+2G Chattogram',
    compoundGoogle: '9R4P+2G Chattogram, Bangladesh',
  },
  /** Short share link. */
  googleMapsShareUrl: 'https://maps.app.goo.gl/rijqctPCaNKEieUC7',
  /** Listing URL from Place Details `url`. */
  googleMapsListingUrl: 'https://maps.google.com/?cid=10553278394662472576',
  placeTypes: [
    'establishment',
    'food',
    'grocery_or_supermarket',
    'point_of_interest',
    'store',
    'supermarket',
  ] as const,
  amenities: {
    delivery: true,
    wheelchairAccessibleEntrance: true,
  },
} as const
