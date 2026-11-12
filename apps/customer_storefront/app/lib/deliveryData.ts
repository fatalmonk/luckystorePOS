import { CATEGORY_GROUPS, CATEGORY_RAIL_ITEMS } from './types';

export const DELIVERY_POLICY = {
  storeName: 'Lucky Store',
  establishedYear: 1947,
  shortLocation: 'Chawkbazar, Chattogram',
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
    displayBn: 'প্রতিদিন সকাল ৯টা–রাত ১২টা ৩০ মিনিট',
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
  canonicalUrl: 'https://www.luckystore1947.com/delivery',
} as const;

export const DELIVERY_CATEGORY_LINKS = [
  { label: 'Rice & grains', slug: 'rice-and-grain' },
  { label: 'Cooking oils & ghee', slug: 'oil-and-ghee' },
  { label: 'Snacks', slug: 'snacks' },
  { label: 'Ice cream', slug: 'ice-cream' },
] as const;

const registeredCategorySlugs = new Set([
  ...CATEGORY_GROUPS.map(({ slug }) => slug),
  ...CATEGORY_RAIL_ITEMS.map(({ slug }) => slug),
]);

for (const { slug } of DELIVERY_CATEGORY_LINKS) {
  if (!registeredCategorySlugs.has(slug)) {
    throw new Error(`Delivery page links to an unregistered category: ${slug}`);
  }
}

export const RETURN_RULES = {
  en: {
    doorstep:
      'Items are checked at the door on delivery, before payment. Once paid, a product cannot be returned for a change of mind.',
    defective:
      'Defective items can be returned within 24 hours of purchase or delivery, with the receipt.',
  },
  bn: {
    doorstep:
      'ডেলিভারির সময় দরজায় পণ্য দেখে তারপর টাকা দিতে হয়। টাকা দেওয়ার পর মন বদলানোর জন্য পণ্য ফেরত নেওয়া হয় না।',
    defective:
      'ত্রুটিপূর্ণ পণ্য কেনা বা ডেলিভারির ২৪ ঘণ্টার মধ্যে রসিদসহ ফেরত দেওয়া যায়।',
  },
} as const;

export function getMerchantReturnPolicies() {
  return [
    {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BD',
      returnPolicyCountry: 'BD',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 1,
      returnMethod: 'https://schema.org/ReturnInStore',
      returnFees: 'https://schema.org/FreeReturn',
      merchantReturnLink: 'https://www.luckystore1947.com/return-policy',
      description: `${RETURN_RULES.en.defective} ${RETURN_RULES.en.doorstep}`,
    },
  ];
}

const SHIPPING_SERVICE_ID = `${DELIVERY_POLICY.canonicalUrl}#shipping-service`;

const SHIPPING_DESTINATION = {
  '@type': 'DefinedRegion',
  addressCountry: 'BD',
  // Keep the structured-data destination narrower than country-wide delivery.
  // The exact 1 km operational boundary is documented on the delivery page.
  postalCode: '4203',
} as const;

const SHIPPING_TIME = {
  '@type': 'ServicePeriod',
  duration: {
    '@type': 'QuantitativeValue',
    minValue: 0,
    maxValue: 1,
    unitCode: 'DAY',
  },
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
  { name: 'Jamal Khan (accessible north parts)', desc: 'Northward residential lanes within 1 km radius' },
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
    answer: `${RETURN_RULES.en.doorstep} ${RETURN_RULES.en.defective} For support, call or WhatsApp our team at ${DELIVERY_POLICY.supportPhone}.`,
  },
];

export const BENGALI_DELIVERY_FAQS: DeliveryFaqItem[] = [
  {
    question: 'আমার ঠিকানায় ডেলিভারি হবে কি?',
    answer: `চকবাজারের Lucky Store থেকে শুধু ${DELIVERY_POLICY.radiusKm} কিমি ব্যাসার্ধের মধ্যে থাকা ঠিকানায় ডেলিভারি দেওয়া হয়। কাছাকাছি এলাকার সব ঠিকানা এই সীমার মধ্যে পড়ে না। বিস্তারিত জানতে ডেলিভারি এলাকার তথ্য দেখুন।`,
  },
  {
    question: 'কত টাকার অর্ডারে ফ্রি ডেলিভারি?',
    answer: `৳${DELIVERY_POLICY.freeDeliveryThresholdBdt} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি। এর কম অর্ডারে ডেলিভারি চার্জ ৳${DELIVERY_POLICY.standardDeliveryFeeBdt}।`,
  },
  {
    question: 'অর্ডার ও পেমেন্ট কীভাবে করব?',
    answer: 'পণ্য কার্টে যোগ করে চেকআউটে ডেলিভারির ঠিকানা দিন। পণ্য হাতে পেয়ে পরীক্ষা করার পর ক্যাশ অন ডেলিভারি (COD) বা bKash-এ পেমেন্ট করতে পারবেন।',
  },
  {
    question: 'ডেলিভারির সময় কখন?',
    answer: `ডেলিভারি সেবার সময় ${DELIVERY_POLICY.deliveryHours.displayBn} পর্যন্ত। অর্ডার দেওয়ার আগে আপনার ঠিকানা ডেলিভারি সীমার মধ্যে আছে কি না নিশ্চিত করুন।`,
  },
];

export function getDeliveryShippingServiceSchema() {
  return {
    '@type': 'ShippingService',
    '@id': SHIPPING_SERVICE_ID,
    name: `${DELIVERY_POLICY.storeName} Standard Local Delivery`,
    description: `Free delivery on orders of ৳${DELIVERY_POLICY.freeDeliveryThresholdBdt} and above; ৳${DELIVERY_POLICY.standardDeliveryFeeBdt} below the threshold within the store delivery area.`,
    fulfillmentType: 'https://schema.org/FulfillmentTypeDelivery',
    shippingConditions: [
      {
        '@type': 'ShippingConditions',
        shippingDestination: SHIPPING_DESTINATION,
        orderValue: {
          '@type': 'MonetaryAmount',
          minValue: 0,
          maxValue: DELIVERY_POLICY.freeDeliveryThresholdBdt - 1,
          currency: 'BDT',
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: DELIVERY_POLICY.standardDeliveryFeeBdt,
          currency: 'BDT',
        },
        transitTime: SHIPPING_TIME,
      },
      {
        '@type': 'ShippingConditions',
        shippingDestination: SHIPPING_DESTINATION,
        orderValue: {
          '@type': 'MonetaryAmount',
          minValue: DELIVERY_POLICY.freeDeliveryThresholdBdt,
          currency: 'BDT',
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'BDT',
        },
        transitTime: SHIPPING_TIME,
      },
    ],
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

export function getBengaliDeliveryFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'bn-BD',
    mainEntity: BENGALI_DELIVERY_FAQS.map((faq) => ({
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
        item: 'https://www.luckystore1947.com',
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
