export const DELIVERY_POLICY = {
  storeName: 'Lucky Store',
  establishedYear: 1947,
  hubAddress: '665 Percival Hill Road, Emdad Park, Chawkbazar, Chattogram 4203',
  hubCoordinates: {
    latitude: '22.35500093723366',
    longitude: '91.83628930715629',
    display: '22.3550° N, 91.8363° E',
  },
  radiusMeters: 1000,
  radiusKm: 1,
  radiusLabel: '1 km delivery radius',
  freeDeliveryThresholdBdt: 500,
  standardDeliveryFeeBdt: 40,
  deliveryHours: {
    start: '09:00 AM',
    end: '12:30 AM',
    display: '09:00 AM–12:30 AM daily',
    daysDisplay: 'Monday–Sunday (7 days a week)',
    scheduleType: 'Delivery hours (orders dispatched same-day during this window)',
  },
  paymentMethods: {
    cod: 'Cash on Delivery (COD)',
    bkash: 'bKash (01731944544)',
    bkashNumber: '01731944544',
  },
  supportPhone: '+880 1731-944544',
  supportWhatsAppUrl: 'https://wa.me/8801731944544',
  canonicalUrl: 'https://luckystore1947.com/delivery',
} as const;

export interface CoveredAreaItem {
  name: string;
  desc: string;
}

export const COVERED_AREAS: CoveredAreaItem[] = [
  { name: 'Chawkbazar (nearby parts)', desc: 'Store neighborhood areas within 1 km radius' },
  { name: 'Parade Ground (nearby parts)', desc: 'Residential areas within 1 km radius' },
  { name: 'Chittagong College area (nearby parts)', desc: 'Lanes and residences within 1 km radius' },
  { name: 'Government Mohsin College area (nearby parts)', desc: 'Campus-adjacent areas within 1 km radius' },
  { name: 'Siraj-ud-Daula Road (accessible sections)', desc: 'Road corridor sections within 1 km radius' },
  { name: 'Chandanpura (nearby parts)', desc: 'Nearby neighborhood areas within 1 km radius' },
  { name: 'Gani Bakery Circle (nearby parts)', desc: 'Adjoining lanes within 1 km radius' },
  { name: 'DC Hill Periphery (nearby parts)', desc: 'Perimeter sections within 1 km radius' },
  { name: 'Subash Bose Road & Emdad Park (immediate vicinity)', desc: 'Immediate vicinity of storefront hub' },
];

export interface DeliveryFaqItem {
  question: string;
  answer: string;
}

export const DELIVERY_FAQS: DeliveryFaqItem[] = [
  {
    question: 'What areas in Chattogram does Lucky Store deliver to?',
    answer: `We deliver strictly within a verified ${DELIVERY_POLICY.radiusLabel} centered at our store in Chawkbazar (${DELIVERY_POLICY.hubAddress}). Coverage is limited to areas and nearby parts of neighborhoods falling within this 1 km boundary—including nearby parts of Chawkbazar, Parade Ground, Chittagong College area, Government Mohsin College area, Siraj-ud-Daula Road, Chandanpura, Gani Bakery circle, and Subash Bose Road. Portions outside the 1 km GeoCircle are not covered.`,
  },
  {
    question: 'What are the delivery charges and minimum order amounts?',
    answer: `Delivery is completely FREE on orders of ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt} and above. For orders below ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}, a flat delivery fee of ৳${DELIVERY_POLICY.standardDeliveryFeeBdt} applies. There is no minimum basket size requirement—you can order single items or daily necessities without restriction.`,
  },
  {
    question: 'What are your daily delivery hours and timings?',
    answer: `Our delivery hours are ${DELIVERY_POLICY.deliveryHours.display}, 7 days a week including weekends and holidays. Orders placed during these delivery hours are fulfilled directly from our Chawkbazar hub for same-day delivery. (Please note: these are active delivery service hours).`,
  },
  {
    question: 'Which payment methods are supported on delivery?',
    answer: `We accept ${DELIVERY_POLICY.paymentMethods.cod} and mobile payment via ${DELIVERY_POLICY.paymentMethods.bkash}. You only pay after our delivery partner arrives at your address and you complete doorstep product inspection.`,
  },
  {
    question: 'Can I inspect my grocery items before paying?',
    answer: `Yes. Lucky Store offers a 100% doorstep product inspection guarantee. You can check edible oil seals, bag weights for rice, packaging integrity, and expiry dates before completing payment.`,
  },
  {
    question: 'What if an item is damaged, defective, or incorrect?',
    answer: `If any item does not meet your complete satisfaction during doorstep inspection, you may hand it back to the delivery agent immediately with zero fee penalty. For support, call or WhatsApp our team at ${DELIVERY_POLICY.supportPhone}.`,
  },
];

export function getDeliveryOfferShippingDetailsSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferShippingDetails',
    '@id': `${DELIVERY_POLICY.canonicalUrl}#shipping-policy`,
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: String(DELIVERY_POLICY.standardDeliveryFeeBdt),
      currency: 'BDT',
    },
    freeShippingThreshold: {
      '@type': 'DeliveryChargeSpecification',
      appliesToDeliveryChargeMethod: 'https://schema.org/DeliveryModeOwnFleet',
      price: String(DELIVERY_POLICY.freeDeliveryThresholdBdt),
      priceCurrency: 'BDT',
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'BD',
      addressRegion: 'Chattogram',
      postalCode: '4203',
    },
  };
}

export function getDeliveryServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'DeliveryService',
    '@id': `${DELIVERY_POLICY.canonicalUrl}#delivery-service`,
    name: `${DELIVERY_POLICY.storeName} Local Grocery Delivery`,
    serviceType: 'Local Grocery Delivery',
    provider: {
      '@type': 'GroceryStore',
      '@id': 'https://luckystore1947.com/#grocerystore',
      name: DELIVERY_POLICY.storeName,
      url: 'https://luckystore1947.com',
      telephone: DELIVERY_POLICY.supportPhone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '665 Percival Hill Road, Emdad Park, Chawkbazar',
        addressLocality: 'Chattogram',
        addressRegion: 'Chattogram Division',
        postalCode: '4203',
        addressCountry: 'BD',
      },
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: DELIVERY_POLICY.hubCoordinates.latitude,
        longitude: DELIVERY_POLICY.hubCoordinates.longitude,
      },
      geoRadius: String(DELIVERY_POLICY.radiusMeters),
    },
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '09:00',
      closes: '00:30',
    },
  };
}

export function getDeliveryFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DELIVERY_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function getDeliveryBreadcrumbSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://luckystore1947.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Delivery Information',
        item: DELIVERY_POLICY.canonicalUrl,
      },
    ],
  };
}
