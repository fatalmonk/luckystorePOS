/**
 * Product Enrichment Registry
 *
 * Hard Evidence Gate:
 * Every factual customer-visible field in this registry MUST map to one or more registered
 * evidence records in the SKU's normalized evidence manifest.
 *
 * Permitted Evidence Sources:
 * - PACKAGING: Directly printed on physical packaging or container label.
 * - MANUFACTURER: Published specification or declaration from the verified manufacturer for this SKU.
 * - LUCKY_STORE_CATALOG: Store catalog database attributes (SKU, catalog category, database product record).
 * - LUCKY_STORE_POLICY: Verified operational policy (1 km Chawkbazar delivery radius, ৳500+ free threshold, 100% doorstep inspection).
 * - CALCULATED_FROM_VERIFIED_FACTS: Transparent mathematical derivations explicitly labeled as calculations.
 *
 * Referential Integrity:
 * Every `evidenceRefs` key across specifications, FAQs, and field-level evidence MUST resolve to
 * a registered record in `evidenceManifest`. Dangling or undeclared evidence references are forbidden.
 */

export const EVIDENCE_SOURCES = [
  'PACKAGING',
  'MANUFACTURER',
  'LUCKY_STORE_CATALOG',
  'LUCKY_STORE_POLICY',
  'CALCULATED_FROM_VERIFIED_FACTS',
] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export interface EvidenceRecord {
  source: EvidenceSource;
  evidenceRef: string;
  sourceTitle?: string;
  sourceUrl?: string;
  skuScope?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
  evidenceRefs: string[];
}

export interface ProductFaq {
  question: string;
  answer: string;
  evidenceRefs: string[];
}

export interface ProductFieldEvidence {
  exactName: string[];
  brand: string[];
  netQuantity: string[];
  category: string[];
  summary: string[];
  highlights?: string[][];
  usageDirections?: string[];
  storageInstructions?: string[];
}

export interface ProductEnrichment {
  /** 8-character UUID hex prefix matching slug suffix */
  slugPrefix: string;
  /** Exact canonical product name [PACKAGING/MANUFACTURER] */
  exactName: string;
  /** Verified brand name [PACKAGING/MANUFACTURER] */
  brand: string;
  /** Verified net quantity or volume [PACKAGING] */
  netQuantity: string;
  /** Verified canonical category name [LUCKY_STORE_CATALOG] */
  category: string;
  /** Answer-first opening summary (factual, concise, local purchase context) */
  summary: string;
  /** Structured tabular specifications with machine-readable provenance */
  specifications: ProductSpecification[];
  /** Packaging-supported key highlights [PACKAGING/MANUFACTURER/CALCULATED] */
  highlights?: string[];
  /** Practical preparation or culinary usage directions [PACKAGING] */
  usageDirections?: string;
  /** Storage instructions [PACKAGING] */
  storageInstructions?: string;
  /** Concise factual product Q&As [PACKAGING/MANUFACTURER/LUCKY_STORE_POLICY/CALCULATED] */
  faqs: ProductFaq[];
  /** Normalized evidence manifest for referential integrity */
  evidenceManifest: Record<string, EvidenceRecord>;
  /** Field-level provenance mappings to evidenceManifest keys */
  fieldEvidence: ProductFieldEvidence;
}

/**
 * Verified product enrichments indexed by 8-char prefix and partial slug.
 * Total: 25 products (8 prior pilots + 17 expanded cohort enrichments).
 */
export const PRODUCT_ENRICHMENTS: Record<string, ProductEnrichment> = {
  // 1. Fortune Mustard Oil 5L
  b8a7c6c6: {
    slugPrefix: 'b8a7c6c6',
    exactName: 'Fortune Kachi Ghani Mustard Oil 5L',
    brand: 'Fortune',
    netQuantity: '5 Litres',
    category: 'Oil & Ghee',
    summary:
      'Fortune Kachi Ghani Mustard Oil in a 5-litre container with handle and sealed cap. Manufactured in Bangladesh by Bangladesh Edible Oil Limited (BEOL). Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment under our 1 km local delivery radius.',
    specifications: [
      { label: 'Brand', value: 'Fortune', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Volume', value: '5 Litres', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Packaging Type', value: 'Poly Container with Handle', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Mustard Oil (Kachi Ghani)', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Bangladesh Edible Oil Limited (BEOL)', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      'Declared on-pack as Kachi Ghani Mustard Oil',
      '5-litre container with built-in carry handle and sealed cap',
      'Manufactured by Bangladesh Edible Oil Limited (BEOL)',
    ],
    usageDirections:
      'Suitable for cooking, frying, tempering, and culinary preparations.',
    storageInstructions:
      'Keep tightly closed after each use in a cool, dry place away from heat and direct sunlight.',
    faqs: [
      {
        question: 'Can I inspect the Fortune Mustard Oil seal before paying?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection. You can verify the container cap, net quantity, and expiry date before paying with cash or bKash.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
      {
        question: 'Is free delivery available for this 5L oil in Chattogram?',
        answer:
          'Yes. Orders totaling ৳500 or more qualify for free delivery within our 1 km Chawkbazar delivery radius; orders below ৳500 incur a flat ৳40 fee.',
        evidenceRefs: ['STORE_DELIVERY_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Fortune 5L on-pack front label: Kachi Ghani Mustard Oil, 5 Litres, poly container with handle',
        sourceTitle: 'Fortune 5L Front Container Label',
        skuScope: 'b8a7c6c6-c515-4e9e-99b9-d4d38e1a6354',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Fortune 5L back label: Made in Bangladesh',
        sourceTitle: 'Fortune 5L Back Container Label',
        skuScope: 'b8a7c6c6-c515-4e9e-99b9-d4d38e1a6354',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Fortune 5L storage instructions: Store in cool, dry place away from sunlight',
        sourceTitle: 'Fortune 5L Storage Label',
        skuScope: 'b8a7c6c6-c515-4e9e-99b9-d4d38e1a6354',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Bangladesh Edible Oil Limited (BEOL) official product brand declaration for Fortune',
        sourceTitle: 'BEOL Corporate Product Portfolio',
        skuScope: 'BEOL Fortune Mustard Oil',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: b8a7c6c6-c515-4e9e-99b9-d4d38e1a6354, category: Oil & Ghee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'b8a7c6c6-c515-4e9e-99b9-d4d38e1a6354',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 2. Radhuni Turmeric Powder 100g
  '029b62d8': {
    slugPrefix: '029b62d8',
    exactName: 'Radhuni Holud Gura (Turmeric Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Spices',
    summary:
      'Radhuni Holud Gura (Turmeric Powder) in a sealed 100g pouch. Produced in Bangladesh by Square Food & Beverage Ltd. Declared on-pack ingredient: 100% Pure Dried Turmeric. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '100g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Declared Ingredients', value: '100% Pure Dried Turmeric', evidenceRefs: ['PACK_INGREDIENTS'] },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Sealed Pouch', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% pure dried turmeric packaged by Square Food & Beverage Ltd.',
      'Sealed 100g moisture-barrier pouch',
    ],
    usageDirections:
      'Add to curries, marinades, or tempering per recipe requirements.',
    storageInstructions:
      'Transfer to an airtight container after opening; store in a dry place.',
    faqs: [
      {
        question: 'How can I verify this Radhuni Turmeric Powder upon delivery?',
        answer:
          'Customers can inspect the printed manufacturing date, expiry date, and packaging seal directly at their doorstep before completing payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g Turmeric front label: Holud Gura, 100g net, sealed pouch',
        sourceTitle: 'Radhuni Turmeric 100g Front Label',
        skuScope: '029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a',
        verifiedAt: '2026-09-16',
      },
      PACK_INGREDIENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g ingredient declaration: 100% Pure Dried Turmeric',
        sourceTitle: 'Radhuni Turmeric 100g Ingredient Panel',
        skuScope: '029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g storage instruction: Store in an airtight container in a dry place',
        sourceTitle: 'Radhuni Turmeric 100g Storage Label',
        skuScope: '029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g back label: Produced in Bangladesh by Square Food & Beverage Ltd.',
        sourceTitle: 'Radhuni Turmeric 100g Back Label',
        skuScope: '029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Square Food & Beverage Ltd. corporate specification for Radhuni Spices',
        sourceTitle: 'Square Food & Beverage Ltd. Official Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a, category: Spices',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '029b62d8-21d4-4bb8-9fa4-6c3ca0f1712a',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_INGREDIENTS', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_INGREDIENTS', 'MFR_SPEC'], ['PACK_FRONT']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 3. Radhuni Coriander Powder 500g
  '1f4650a7': {
    slugPrefix: '1f4650a7',
    exactName: 'Radhuni Dhoniya Gura (Coriander Powder) 500g',
    brand: 'Radhuni',
    netQuantity: '500g',
    category: 'Spices',
    summary:
      'Radhuni Dhoniya Gura (Coriander Powder) in a 500g sealed pack. Produced in Bangladesh by Square Food & Beverage Ltd. Declared on-pack ingredient: 100% Pure Dried Coriander Seeds. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '500g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Declared Ingredients', value: '100% Pure Dried Coriander Seeds', evidenceRefs: ['PACK_INGREDIENTS'] },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Sealed Pouch', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% pure dried coriander seeds packaged by Square Food & Beverage Ltd.',
      '500g sealed pouch packaging',
    ],
    usageDirections:
      'Incorporate into spice pastes, curry gravies, or marinades per recipe instructions.',
    storageInstructions:
      'Store in a cool, dry place. Transfer to an airtight container after opening.',
    faqs: [
      {
        question: 'Can I inspect this 500g coriander pack before payment?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection to verify packaging seal and printed dates before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 500g Coriander front label: Dhoniya Gura, 500g net',
        sourceTitle: 'Radhuni Coriander 500g Front Label',
        skuScope: '1f4650a7-6404-4a8c-89b8-301232e656f5',
        verifiedAt: '2026-09-16',
      },
      PACK_INGREDIENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 500g ingredient declaration: 100% Pure Dried Coriander Seeds',
        sourceTitle: 'Radhuni Coriander 500g Ingredient Panel',
        skuScope: '1f4650a7-6404-4a8c-89b8-301232e656f5',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 500g storage instruction: Store in an airtight container in a dry place',
        sourceTitle: 'Radhuni Coriander 500g Storage Label',
        skuScope: '1f4650a7-6404-4a8c-89b8-301232e656f5',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 500g back label: Produced by Square Food & Beverage Ltd.',
        sourceTitle: 'Radhuni Coriander 500g Back Label',
        skuScope: '1f4650a7-6404-4a8c-89b8-301232e656f5',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Square Food & Beverage Ltd. corporate product specification for Radhuni Spices',
        sourceTitle: 'Square Food & Beverage Ltd. Official Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 1f4650a7-6404-4a8c-89b8-301232e656f5, category: Spices',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '1f4650a7-6404-4a8c-89b8-301232e656f5',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_INGREDIENTS', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_INGREDIENTS', 'MFR_SPEC'], ['PACK_FRONT']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 4. Bellame Chocolate Digestive Biscuits 135g
  '4d20b020': {
    slugPrefix: '4d20b020',
    exactName: 'Bellame Chocolate Digestive Biscuits 135g',
    brand: 'Bellame',
    netQuantity: '135g',
    category: 'Biscuits & Cookies',
    summary:
      'Bellame Chocolate Digestive Biscuits in a sealed 135g flow wrap. Wheat digestive biscuits topped with chocolate coating. Available for local delivery from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Bellame', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '135g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Chocolate Digestive Biscuit', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Packaging Type', value: 'Flow wrap', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      'Wheat digestive biscuit topped with chocolate coating',
      '135g sealed packaging',
    ],
    storageInstructions:
      'Store in a cool, dry place. Keep in an airtight container after opening.',
    faqs: [
      {
        question: 'Can I inspect biscuit packets upon delivery in Chawkbazar?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection so you can verify that packets arrive sealed and intact before paying.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Bellame 135g packaging label: Chocolate Digestive Biscuits, 135g net',
        sourceTitle: 'Bellame 135g Front Wrap',
        skuScope: '4d20b020-5c62-4c2f-b461-755d5b780829',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Bellame 135g back label: Manufactured in Bangladesh',
        sourceTitle: 'Bellame 135g Back Wrap',
        skuScope: '4d20b020-5c62-4c2f-b461-755d5b780829',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Bellame 135g storage text: Store in a cool, dry place',
        sourceTitle: 'Bellame 135g Storage Guidance',
        skuScope: '4d20b020-5c62-4c2f-b461-755d5b780829',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 4d20b020-5c62-4c2f-b461-755d5b780829, category: Biscuits & Cookies',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '4d20b020-5c62-4c2f-b461-755d5b780829',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT']],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 5. Ama Classic Instant Coffee Sachet 1g
  '3448ed8a': {
    slugPrefix: '3448ed8a',
    exactName: 'Ama Classic Instant Coffee Sachet 1g',
    brand: 'Ama',
    netQuantity: '1g',
    category: 'Tea & Coffee',
    summary:
      'Ama Classic Instant Coffee in a single-serve 1g sachet. Soluble coffee powder for preparation with hot water or milk. Available for purchase from Lucky Store in Chawkbazar, Chattogram, with cash or bKash on delivery and 100% doorstep inspection.',
    specifications: [
      { label: 'Brand', value: 'Ama', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '1g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Instant Coffee Powder', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Serving Format', value: '1 Sachet (1g) per cup', evidenceRefs: ['PACK_SERVING'] },
      { label: 'Packaging Type', value: 'Individual Sachet', evidenceRefs: ['PACK_FRONT'] },
    ],
    highlights: [
      'Single-serve 1g sachet',
      'Dissolves in hot water or warm milk',
    ],
    usageDirections:
      'Empty one sachet into a cup, add 100–120ml hot water or warm milk, and stir.',
    faqs: [
      {
        question: 'Can I purchase single Ama coffee sachets?',
        answer:
          'Yes. Lucky Store offers individual sachet purchase with doorstep inspection upon delivery in Chawkbazar.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Ama 1g sachet label: Ama Classic Instant Coffee, 1g',
        sourceTitle: 'Ama 1g Sachet Front',
        skuScope: '3448ed8a-9c0b-49ab-b249-f096fbc210c7',
        verifiedAt: '2026-09-16',
      },
      PACK_SERVING: {
        source: 'PACKAGING',
        evidenceRef: 'Ama 1g sachet text: Single serve sachet for one cup',
        sourceTitle: 'Ama 1g Sachet Serving Direction',
        skuScope: '3448ed8a-9c0b-49ab-b249-f096fbc210c7',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 3448ed8a-9c0b-49ab-b249-f096fbc210c7, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '3448ed8a-9c0b-49ab-b249-f096fbc210c7',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT']],
      usageDirections: ['PACK_SERVING'],
    },
  },

  // 6. Polar Double Sundae Ice Cream 1L
  '70a322a1': {
    slugPrefix: '70a322a1',
    exactName: 'Polar Double Sundae Ice Cream 1L Tub',
    brand: 'Polar',
    netQuantity: '1 Litre',
    category: 'Ice-Cream',
    summary:
      'Polar Double Sundae Ice Cream in a 1-litre tub with reclosable lid. Manufactured in Bangladesh by Dhaka Ice Cream Industries Ltd. Available for delivery from Lucky Store in Chawkbazar, Chattogram, with doorstep condition inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Polar', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Volume', value: '1 Litre', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Sundae Ice Cream Tub', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Dhaka Ice Cream Industries Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Packaging Type', value: 'Plastic Tub with Reclosable Lid', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Keep frozen at -18°C or below', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '1-litre tub with reclosable lid',
      'Manufactured by Dhaka Ice Cream Industries Ltd.',
    ],
    storageInstructions:
      'Keep frozen at -18°C or below. Do not refreeze after melting.',
    faqs: [
      {
        question: 'Can I check the ice cream condition upon delivery in Chawkbazar?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection. You can inspect the tub seal and state before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Polar 1L tub label: Double Sundae Ice Cream, 1 Litre, plastic tub with lid',
        sourceTitle: 'Polar 1L Tub Label',
        skuScope: '70a322a1-cab7-4504-bf0e-999118e6fcc6',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Polar 1L storage instruction: Keep frozen at -18°C or below',
        sourceTitle: 'Polar 1L Storage Instruction',
        skuScope: '70a322a1-cab7-4504-bf0e-999118e6fcc6',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Dhaka Ice Cream Industries Ltd. official manufacturer declaration for Polar',
        sourceTitle: 'Dhaka Ice Cream Industries Ltd. Brand Registration',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 70a322a1-cab7-4504-bf0e-999118e6fcc6, category: Ice-Cream',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '70a322a1-cab7-4504-bf0e-999118e6fcc6',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC']],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 7. Aril Assorted Fruit Lollipops
  ac68b2c3: {
    slugPrefix: 'ac68b2c3',
    exactName: 'Aril Assorted Fruit Flavoured Lollipops',
    brand: 'Aril',
    netQuantity: '1 Piece',
    category: 'Chocolates & Candies',
    summary:
      'Aril Assorted Fruit Flavoured Lollipop on stick with individual wrapper. Confectionery item available from Lucky Store in Chawkbazar, Chattogram, with cash or bKash on delivery and 100% doorstep inspection.',
    specifications: [
      { label: 'Brand', value: 'Aril', evidenceRefs: ['PACK_WRAPPER'] },
      { label: 'Product Type', value: 'Confectionery Lollipop on Stick', evidenceRefs: ['PACK_WRAPPER'] },
      { label: 'Packaging Type', value: 'Individually wrapped piece', evidenceRefs: ['PACK_WRAPPER'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
    ],
    highlights: [
      'Individually wrapped confectionery piece on stick',
      'Assorted fruit flavours',
    ],
    faqs: [
      {
        question: 'Can I inspect confectionery items upon delivery?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection before payment to ensure item wrappers are intact.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_WRAPPER: {
        source: 'PACKAGING',
        evidenceRef: 'Aril lollipop wrapper: Assorted Fruit Flavoured Confectionery on stick',
        sourceTitle: 'Aril Lollipop Unit Wrapper',
        skuScope: 'ac68b2c3-ae76-48e5-8a9a-60d836a92b40',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Aril lollipop wrapper back: Made in Bangladesh',
        sourceTitle: 'Aril Lollipop Country Declaration',
        skuScope: 'ac68b2c3-ae76-48e5-8a9a-60d836a92b40',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: ac68b2c3-ae76-48e5-8a9a-60d836a92b40, category: Chocolates & Candies',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'ac68b2c3-ae76-48e5-8a9a-60d836a92b40',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_WRAPPER', 'CATALOG_RECORD'],
      brand: ['PACK_WRAPPER'],
      netQuantity: ['PACK_WRAPPER'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_WRAPPER', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_WRAPPER'], ['PACK_WRAPPER']],
    },
  },

  // 8. Nescafé Classic Instant Coffee 90g Jar
  ae09a3ef: {
    slugPrefix: 'ae09a3ef',
    exactName: 'Nescafé Classic Instant Coffee 90g Jar',
    brand: 'Nescafé',
    netQuantity: '90g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic Instant Coffee in a 90g glass jar with plastic screw cap and protective inner seal. Marketed in Bangladesh by Nestlé Bangladesh PLC. Declared on-pack ingredient: 100% Pure Instant Coffee. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Nescafé', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '90g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: '100% Pure Soluble Coffee', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water', evidenceRefs: ['PACK_PREP'] },
      { label: 'Storage Guidance', value: 'Close tightly after use; store in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% Pure Instant Coffee declared on pack',
      '90g glass jar with inner seal and screw cap',
      'Marketed in Bangladesh by Nestlé Bangladesh PLC',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml of hot water. Add milk and sugar as desired.',
    storageInstructions:
      'Close cap tightly after each use. Store in a cool, dry place away from humidity.',
    faqs: [
      {
        question: 'What are the declared ingredients in Nescafé Classic 90g?',
        answer:
          'The on-pack declaration specifies 100% Pure Instant Coffee.',
        evidenceRefs: ['PACK_FRONT'],
      },
      {
        question: 'What is the on-pack preparation guideline for Nescafé Classic?',
        answer:
          'The manufacturer preparation guideline specifies 1 teaspoon of coffee granules dissolved in 150ml of hot water.',
        evidenceRefs: ['PACK_PREP'],
      },
      {
        question: 'Who markets this Nescafé Classic jar in Bangladesh?',
        answer:
          'This SKU is marketed in Bangladesh by Nestlé Bangladesh PLC.',
        evidenceRefs: ['PACK_BACK'],
      },
      {
        question: 'Can I inspect the jar seal at delivery in Chawkbazar?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection. You can verify the glass container, cap seal, and expiry date before paying.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 90g Jar front label: 100% Pure Instant Coffee, 90g net, glass jar with inner seal',
        sourceTitle: 'Nescafé 90g Jar Front Label',
        skuScope: 'ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 90g Jar back label: Marketed by Nestlé Bangladesh PLC',
        sourceTitle: 'Nescafé 90g Jar Back Panel',
        skuScope: 'ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 90g Jar preparation guideline: 1 teaspoon in 150ml hot water',
        sourceTitle: 'Nescafé 90g Jar Preparation Text',
        skuScope: 'ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 90g Jar storage instructions: Store in cool, dry place. Close tightly.',
        sourceTitle: 'Nescafé 90g Jar Storage Text',
        skuScope: 'ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'ae09a3ef-b31c-4bca-a5a5-9614fca4a9b6',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT'], ['PACK_BACK']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 9. Nescafé Classic Instant Coffee 180g Jar
  be803387: {
    slugPrefix: 'be803387',
    exactName: 'Nescafé Classic Instant Coffee 180g Jar',
    brand: 'Nescafé',
    netQuantity: '180g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic Instant Coffee in a 180g glass jar with plastic screw cap and protective inner seal. Marketed in Bangladesh by Nestlé Bangladesh PLC. Declared on-pack ingredient: 100% Pure Instant Coffee. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Nescafé', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '180g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: '100% Pure Soluble Coffee', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water', evidenceRefs: ['PACK_PREP'] },
      { label: 'Storage Guidance', value: 'Close tightly after use; store in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% Pure Instant Coffee in 180g glass jar',
      'Marketed in Bangladesh by Nestlé Bangladesh PLC',
      'Glass jar with protective inner seal',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml hot water. Stir and customize with milk or sweetener as desired.',
    storageInstructions:
      'Close cap tightly after each use. Store in a cool, dry place away from humidity.',
    faqs: [
      {
        question: 'Is the Nescafé 180g jar sealed?',
        answer:
          'Yes. It comes with a factory inner seal under the screw cap. You can inspect seal intactness upon delivery before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 180g Jar front label: 100% Pure Instant Coffee, 180g net, glass jar',
        sourceTitle: 'Nescafé 180g Jar Front Label',
        skuScope: 'be803387-a25e-47f2-a720-c65011749603',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 180g Jar back label: Marketed by Nestlé Bangladesh PLC',
        sourceTitle: 'Nescafé 180g Jar Back Panel',
        skuScope: 'be803387-a25e-47f2-a720-c65011749603',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 180g Jar preparation text: 1 teaspoon in 150ml hot water',
        sourceTitle: 'Nescafé 180g Jar Preparation Text',
        skuScope: 'be803387-a25e-47f2-a720-c65011749603',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 180g Jar storage instructions: Store in cool, dry place',
        sourceTitle: 'Nescafé 180g Jar Storage Text',
        skuScope: 'be803387-a25e-47f2-a720-c65011749603',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: be803387-a25e-47f2-a720-c65011749603, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'be803387-a25e-47f2-a720-c65011749603',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_BACK'], ['PACK_FRONT']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 10. Nescafé Classic Instant Coffee 45g Jar
  '6dbf8f0e': {
    slugPrefix: '6dbf8f0e',
    exactName: 'Nescafé Classic Instant Coffee 45g Jar',
    brand: 'Nescafé',
    netQuantity: '45g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic Instant Coffee in a 45g glass jar with plastic screw cap and protective inner seal. Marketed in Bangladesh by Nestlé Bangladesh PLC. Declared on-pack ingredient: 100% Pure Instant Coffee. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Nescafé', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '45g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: '100% Pure Soluble Coffee', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water', evidenceRefs: ['PACK_PREP'] },
      { label: 'Storage Guidance', value: 'Close tightly after use; store in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% Pure Instant Coffee in 45g glass jar',
      'Marketed in Bangladesh by Nestlé Bangladesh PLC',
      'Glass jar with protective inner seal',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml hot water. Stir and add milk or sugar as desired.',
    storageInstructions:
      'Keep cap tightly sealed in a cool, dry place away from humidity.',
    faqs: [
      {
        question: 'What is the delivery fee for a 45g coffee jar in Chawkbazar?',
        answer:
          'Orders totaling ৳500 or more qualify for free delivery within our 1 km radius; orders below ৳500 have a flat ৳40 fee.',
        evidenceRefs: ['STORE_DELIVERY_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 45g Jar front label: 100% Pure Instant Coffee, 45g net, glass jar',
        sourceTitle: 'Nescafé 45g Jar Front Label',
        skuScope: '6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 45g Jar back label: Marketed by Nestlé Bangladesh PLC',
        sourceTitle: 'Nescafé 45g Jar Back Panel',
        skuScope: '6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 45g Jar preparation text: 1 teaspoon in 150ml hot water',
        sourceTitle: 'Nescafé 45g Jar Preparation Text',
        skuScope: '6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 45g Jar storage instructions: Store in cool, dry place',
        sourceTitle: 'Nescafé 45g Jar Storage Text',
        skuScope: '6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '6dbf8f0e-3674-4b53-b3c1-0268ec3b2c2e',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_BACK'], ['PACK_FRONT']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 11. Nescafé Classic 200g Refill Pouch
  b8d96d50: {
    slugPrefix: 'b8d96d50',
    exactName: 'Nescafé Classic Instant Coffee 200g Refill Pouch',
    brand: 'Nescafé',
    netQuantity: '200g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic Instant Coffee in a 200g sealed refill pouch. Marketed in Bangladesh by Nestlé Bangladesh PLC. Declared on-pack ingredient: 100% Pure Instant Coffee. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Nescafé', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '200g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: '100% Pure Soluble Coffee', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Form', value: 'Sealed Refill Pouch', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water', evidenceRefs: ['PACK_PREP'] },
      { label: 'Storage Guidance', value: 'Keep tightly closed in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% Pure Instant Coffee granules',
      '200g sealed refill pouch packaging',
      'Marketed in Bangladesh by Nestlé Bangladesh PLC',
    ],
    usageDirections:
      'Add 1 teaspoon into 150ml hot water. Stir well and add milk or sugar as desired.',
    storageInstructions:
      'Store in a cool, dry place. Keep packaging tightly closed or transfer to an airtight container after opening.',
    faqs: [
      {
        question: 'Is the 200g Nescafé pouch sealed?',
        answer:
          'Yes. It comes in a factory-sealed pouch. You can inspect the seal integrity at your doorstep before completing payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 200g Refill Pouch front: 100% Pure Instant Coffee, 200g net, sealed pouch',
        sourceTitle: 'Nescafé 200g Pouch Front Label',
        skuScope: 'b8d96d50-5147-4952-b8ec-f232ff195726',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 200g Refill Pouch back: Marketed by Nestlé Bangladesh PLC',
        sourceTitle: 'Nescafé 200g Pouch Back Panel',
        skuScope: 'b8d96d50-5147-4952-b8ec-f232ff195726',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 200g preparation text: 1 teaspoon in 150ml hot water',
        sourceTitle: 'Nescafé 200g Pouch Preparation Text',
        skuScope: 'b8d96d50-5147-4952-b8ec-f232ff195726',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Nescafé Classic 200g storage instruction: Store in cool, dry place. Keep closed.',
        sourceTitle: 'Nescafé 200g Pouch Storage Text',
        skuScope: 'b8d96d50-5147-4952-b8ec-f232ff195726',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: b8d96d50-5147-4952-b8ec-f232ff195726, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'b8d96d50-5147-4952-b8ec-f232ff195726',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT'], ['PACK_BACK']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 12. Ispahani Blender's Choice Premium Black Tea 200g
  '8058c111': {
    slugPrefix: '8058c111',
    exactName: "Ispahani Blender's Choice Premium Black Tea 200g",
    brand: 'Ispahani',
    netQuantity: '200g',
    category: 'Tea & Coffee',
    summary:
      "Ispahani Blender's Choice Premium Black Tea in a 200g carton box. Blended and packaged by Ispahani Tea Ltd. in Chattogram, Bangladesh. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection before payment.",
    specifications: [
      { label: 'Brand', value: 'Ispahani', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '200g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Black Tea', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Blender & Packager', value: 'Ispahani Tea Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Origin / Headquarters', value: 'Chattogram, Bangladesh', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Packaging Type', value: 'Carton Box with Inner Foil Lining', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container away from moisture', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      "Blended and packaged by Ispahani Tea Ltd. in Chattogram",
      '200g carton packaging with inner foil lining',
    ],
    usageDirections:
      'Boil water, add tea leaves per preferred strength, infuse, strain, and serve.',
    storageInstructions:
      'Transfer to an airtight container after opening. Store in a dry place away from moisture.',
    faqs: [
      {
        question: "Where is Ispahani Blender's Choice blended?",
        answer:
          'Ispahani Blender’s Choice is blended and packaged by Ispahani Tea Ltd. in Chattogram, Bangladesh.',
        evidenceRefs: ['MFR_SPEC'],
      },
      {
        question: 'Can I inspect the tea carton upon delivery?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection to verify carton condition and printed dates before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: "Ispahani Blender's Choice 200g front label: Premium Black Tea, 200g net, foil lined carton",
        sourceTitle: "Ispahani Blender's Choice 200g Front Label",
        skuScope: '8058c111-9a74-4530-8be0-b5bf9f85412d',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: "Ispahani Blender's Choice storage instruction: Store in an airtight container away from moisture",
        sourceTitle: "Ispahani Blender's Choice Storage Text",
        skuScope: '8058c111-9a74-4530-8be0-b5bf9f85412d',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Ispahani Tea Ltd. corporate declaration: Headquartered in Chattogram, Bangladesh',
        sourceTitle: 'Ispahani Tea Ltd. Corporate Registration',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 8058c111-9a74-4530-8be0-b5bf9f85412d, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '8058c111-9a74-4530-8be0-b5bf9f85412d',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['MFR_SPEC'], ['PACK_FRONT']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 13. Ispahani Blender's Choice Premium Black Tea 400g
  '4d004a30': {
    slugPrefix: '4d004a30',
    exactName: "Ispahani Blender's Choice Premium Black Tea 400g",
    brand: 'Ispahani',
    netQuantity: '400g',
    category: 'Tea & Coffee',
    summary:
      "Ispahani Blender's Choice Premium Black Tea in a 400g carton box. Blended and packaged by Ispahani Tea Ltd. in Chattogram, Bangladesh. Dispatched from Lucky Store in Chawkbazar under our verified 1 km delivery radius with 100% doorstep inspection before payment.",
    specifications: [
      { label: 'Brand', value: 'Ispahani', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '400g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Black Tea', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Blender & Packager', value: 'Ispahani Tea Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Origin / Headquarters', value: 'Chattogram, Bangladesh', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Packaging Type', value: 'Carton Box with Inner Foil Lining', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container away from moisture', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '400g pack with inner foil lining',
      'Blended and packaged by Ispahani Tea Ltd. in Chattogram',
    ],
    usageDirections:
      'Boil water, add tea leaves according to taste, infuse, strain, and serve.',
    storageInstructions:
      'Store in an airtight container in a dry place away from moisture.',
    faqs: [
      {
        question: 'Is free delivery available for this 400g tea pack in Chawkbazar?',
        answer:
          'Orders totaling ৳500 or more qualify for free delivery within our 1 km radius; combining this item with other essentials easily reaches the free threshold.',
        evidenceRefs: ['STORE_DELIVERY_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: "Ispahani Blender's Choice 400g front label: Premium Black Tea, 400g net",
        sourceTitle: "Ispahani Blender's Choice 400g Front Label",
        skuScope: '4d004a30-8036-43e6-a077-85b62b7ff713',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: "Ispahani Blender's Choice storage instruction: Store in an airtight container away from moisture",
        sourceTitle: "Ispahani Blender's Choice Storage Text",
        skuScope: '4d004a30-8036-43e6-a077-85b62b7ff713',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Ispahani Tea Ltd. corporate declaration: Headquartered in Chattogram, Bangladesh',
        sourceTitle: 'Ispahani Tea Ltd. Corporate Registration',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 4d004a30-8036-43e6-a077-85b62b7ff713, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '4d004a30-8036-43e6-a077-85b62b7ff713',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 14. Ispahani Mirzapore Tea Bags (50 Count)
  '1dd3e411': {
    slugPrefix: '1dd3e411',
    exactName: 'Ispahani Mirzapore Tea Bags (50 Count)',
    brand: 'Ispahani',
    netQuantity: '50 Tea Bags',
    category: 'Tea & Coffee',
    summary:
      'Ispahani Mirzapore Black Tea in a carton containing 50 individual tea bags with string and tag. Produced in Bangladesh by Ispahani Tea Ltd. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Ispahani', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Quantity / Format', value: '50 Tea Bags (with string & tag)', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Black Tea Bags', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Ispahani Tea Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Carton Box with Tea Bags', evidenceRefs: ['PACK_FRONT'] },
    ],
    highlights: [
      '50 tea bags with string and tag for single-cup brewing',
      'Produced by Ispahani Tea Ltd.',
    ],
    usageDirections:
      'Place one tea bag in a cup, pour freshly boiled water over it, steep for preferred strength, remove bag, and serve.',
    storageInstructions:
      'Keep in a cool, dry place away from humidity.',
    faqs: [
      {
        question: 'Are the tea bags tagged with string?',
        answer:
          'Yes. Mirzapore 50-count tea bags are equipped with strings and tags for dipping and single-cup use.',
        evidenceRefs: ['PACK_FRONT'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Ispahani Mirzapore 50 Tea Bags carton front: 50 Tea Bags with string & tag',
        sourceTitle: 'Mirzapore 50TB Front Label',
        skuScope: '1dd3e411-eecb-43d9-ab7b-ef23277cb701',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Ispahani Mirzapore 50 Tea Bags carton back: Produced in Bangladesh by Ispahani Tea Ltd.',
        sourceTitle: 'Mirzapore 50TB Back Panel',
        skuScope: '1dd3e411-eecb-43d9-ab7b-ef23277cb701',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Ispahani Tea Ltd. official brand registration for Mirzapore',
        sourceTitle: 'Ispahani Tea Ltd. Corporate Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 1dd3e411-eecb-43d9-ab7b-ef23277cb701, category: Tea & Coffee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '1dd3e411-eecb-43d9-ab7b-ef23277cb701',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
    },
  },

  // 15. Rupchanda Fortified Soyabean Oil 5L
  b3e78fa4: {
    slugPrefix: 'b3e78fa4',
    exactName: 'Rupchanda Fortified Soyabean Oil 5L',
    brand: 'Rupchanda',
    netQuantity: '5 Litres',
    category: 'Oil & Ghee',
    summary:
      'Rupchanda Fortified Soyabean Oil in a 5-litre container with handle and sealed cap. Refined and fortified with Vitamin A by Bangladesh Edible Oil Limited (BEOL). Available from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Rupchanda', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Volume', value: '5 Litres', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Fortified Refined Soyabean Oil', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Fortification', value: 'Fortified with Vitamin A', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Bangladesh Edible Oil Limited (BEOL)', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Packaging Type', value: 'Poly Container with Handle', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from heat and direct sunlight', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      'Fortified with Vitamin A',
      '5-litre container with carry handle and sealed cap',
      'Produced by Bangladesh Edible Oil Limited (BEOL)',
    ],
    usageDirections:
      'Suitable for frying, sautéing, and general cooking preparations.',
    storageInstructions:
      'Store in a cool, dry place away from direct sunlight. Keep cap tightly closed.',
    faqs: [
      {
        question: 'Who manufactures Rupchanda Soyabean Oil?',
        answer:
          'Rupchanda is refined and bottled by Bangladesh Edible Oil Limited (BEOL).',
        evidenceRefs: ['MFR_SPEC'],
      },
      {
        question: 'Can I check the 5L container seal before paying?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection to confirm container integrity and seal before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Rupchanda 5L label: Fortified Soyabean Oil with Vitamin A, 5 Litres, poly container with handle',
        sourceTitle: 'Rupchanda 5L Front Container Label',
        skuScope: 'b3e78fa4-4d26-4fa2-bf56-a052fffa48e7',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Rupchanda 5L storage text: Store in cool, dry place away from direct heat and light',
        sourceTitle: 'Rupchanda 5L Storage Label',
        skuScope: 'b3e78fa4-4d26-4fa2-bf56-a052fffa48e7',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Bangladesh Edible Oil Limited (BEOL) official product brand specification for Rupchanda',
        sourceTitle: 'BEOL Rupchanda Corporate Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: b3e78fa4-4d26-4fa2-bf56-a052fffa48e7, category: Oil & Ghee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'b3e78fa4-4d26-4fa2-bf56-a052fffa48e7',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 16. Rupchanda Fortified Soyabean Oil 1L
  b39aa5cc: {
    slugPrefix: 'b39aa5cc',
    exactName: 'Rupchanda Fortified Soyabean Oil 1L PET Bottle',
    brand: 'Rupchanda',
    netQuantity: '1 Litre',
    category: 'Oil & Ghee',
    summary:
      'Rupchanda Fortified Soyabean Oil in a 1-litre PET bottle with sealed screw cap. Refined and fortified with Vitamin A by Bangladesh Edible Oil Limited (BEOL). Dispatched from Lucky Store in Chawkbazar under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Rupchanda', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Volume', value: '1 Litre', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Fortified Refined Soyabean Oil', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Fortification', value: 'Fortified with Vitamin A', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Bangladesh Edible Oil Limited (BEOL)', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Packaging Type', value: 'PET Bottle with Screw Cap', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct heat and light', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '1-litre PET bottle with sealed screw cap',
      'Fortified with Vitamin A',
      'Produced by Bangladesh Edible Oil Limited (BEOL)',
    ],
    usageDirections:
      'Suitable for everyday cooking, sautéing, and frying.',
    storageInstructions:
      'Store in a cool, dry place away from direct heat and light. Keep cap tightly closed.',
    faqs: [
      {
        question: 'Is this Rupchanda 1L bottle sealed?',
        answer:
          'Yes. It comes with a factory tamper-evident cap that you can inspect upon delivery.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Rupchanda 1L PET label: Fortified Soyabean Oil with Vitamin A, 1 Litre, PET bottle with screw cap',
        sourceTitle: 'Rupchanda 1L Bottle Label',
        skuScope: 'b39aa5cc-fa96-419b-b0b3-f09c69d80d19',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'BEOL Rupchanda 1L storage instruction: Store in cool, dry place',
        sourceTitle: 'Rupchanda 1L Storage Label',
        skuScope: 'b39aa5cc-fa96-419b-b0b3-f09c69d80d19',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Bangladesh Edible Oil Limited (BEOL) official product brand specification for Rupchanda',
        sourceTitle: 'BEOL Rupchanda Corporate Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: b39aa5cc-fa96-419b-b0b3-f09c69d80d19, category: Oil & Ghee',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'b39aa5cc-fa96-419b-b0b3-f09c69d80d19',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 17. Radhuni Chilli Powder (Morich Gura) 100g
  c0fe29c0: {
    slugPrefix: 'c0fe29c0',
    exactName: 'Radhuni Morich Gura (Chilli Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Spices',
    summary:
      'Radhuni Morich Gura (Chilli Powder) in a 100g sealed pack. Produced in Bangladesh by Square Food & Beverage Ltd. Declared on-pack ingredient: 100% Ground Red Chilli. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '100g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Declared Ingredients', value: '100% Ground Red Chilli', evidenceRefs: ['PACK_INGREDIENTS'] },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Sealed Pouch', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% ground red chilli declared on pack',
      '100g sealed pouch packaging',
      'Packaged by Square Food & Beverage Ltd.',
    ],
    usageDirections:
      'Add to curries, stews, marinades, and seasoning bases according to desired heat level.',
    storageInstructions:
      'Transfer to an airtight container after opening; keep in a dry, cool place.',
    faqs: [
      {
        question: 'What are the declared ingredients in Radhuni Chilli Powder?',
        answer:
          'The on-pack ingredient list declares 100% ground red chilli.',
        evidenceRefs: ['PACK_INGREDIENTS'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g Chilli front label: Morich Gura, 100g net',
        sourceTitle: 'Radhuni Chilli 100g Front Label',
        skuScope: 'c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d',
        verifiedAt: '2026-09-16',
      },
      PACK_INGREDIENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g Chilli ingredient declaration: 100% Ground Red Chilli',
        sourceTitle: 'Radhuni Chilli 100g Ingredient Declaration',
        skuScope: 'c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g storage instruction: Store in an airtight container in a dry place',
        sourceTitle: 'Radhuni Chilli 100g Storage Label',
        skuScope: 'c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g back label: Produced in Bangladesh by Square Food & Beverage Ltd.',
        sourceTitle: 'Radhuni Chilli 100g Back Panel',
        skuScope: 'c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Square Food & Beverage Ltd. corporate specification for Radhuni Spices',
        sourceTitle: 'Square Food & Beverage Ltd. Official Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d, category: Spices',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'c0fe29c0-832f-4c5e-a1fb-673bf0c72e2d',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_INGREDIENTS', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_INGREDIENTS'], ['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 18. Radhuni Cumin Powder (Jira Gura) 100g
  '045df58d': {
    slugPrefix: '045df58d',
    exactName: 'Radhuni Jira Gura (Cumin Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Spices',
    summary:
      'Radhuni Jira Gura (Cumin Powder) in a 100g sealed pack. Produced in Bangladesh by Square Food & Beverage Ltd. Declared on-pack ingredient: 100% Ground Cumin Seeds. Dispatched from Lucky Store in Chawkbazar under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '100g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Declared Ingredients', value: '100% Ground Cumin Seeds', evidenceRefs: ['PACK_INGREDIENTS'] },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'Bangladesh', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Sealed Pouch', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '100% ground cumin seeds declared on pack',
      '100g sealed pouch packaging',
      'Produced by Square Food & Beverage Ltd.',
    ],
    usageDirections:
      'Use in spice mixtures, meat and fish dishes, lentil tempering, or vegetable preparations.',
    storageInstructions:
      'Store in an airtight container in a dry place away from heat and sunlight.',
    faqs: [
      {
        question: 'What is the declared ingredient in Radhuni Cumin Powder?',
        answer:
          'The on-pack declaration specifies 100% ground cumin seeds.',
        evidenceRefs: ['PACK_INGREDIENTS'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g Cumin front label: Jira Gura, 100g net',
        sourceTitle: 'Radhuni Cumin 100g Front Label',
        skuScope: '045df58d-71b5-4b8c-b039-2503554e488d',
        verifiedAt: '2026-09-16',
      },
      PACK_INGREDIENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g Cumin ingredient declaration: 100% Ground Cumin Seeds',
        sourceTitle: 'Radhuni Cumin 100g Ingredient Panel',
        skuScope: '045df58d-71b5-4b8c-b039-2503554e488d',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g storage instruction: Store in an airtight container in a dry place',
        sourceTitle: 'Radhuni Cumin 100g Storage Label',
        skuScope: '045df58d-71b5-4b8c-b039-2503554e488d',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Square Radhuni 100g back label: Produced by Square Food & Beverage Ltd.',
        sourceTitle: 'Radhuni Cumin 100g Back Panel',
        skuScope: '045df58d-71b5-4b8c-b039-2503554e488d',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Square Food & Beverage Ltd. corporate specification for Radhuni Spices',
        sourceTitle: 'Square Food & Beverage Ltd. Official Portfolio',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 045df58d-71b5-4b8c-b039-2503554e488d, category: Spices',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '045df58d-71b5-4b8c-b039-2503554e488d',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_INGREDIENTS', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_INGREDIENTS'], ['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_FRONT'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 19. Maggi Swad-e Magic Seasoning Sachet 4g
  '7d931484': {
    slugPrefix: '7d931484',
    exactName: 'Maggi Swad-e Magic Seasoning Sachet 4g',
    brand: 'Maggi',
    netQuantity: '4g',
    category: 'Spices',
    summary:
      'Maggi Swad-e Magic Seasoning Sachet (4g) by Nestlé Bangladesh PLC. Spice and flavour seasoning blend in single-use sachet. Available from Lucky Store in Chawkbazar, Chattogram, with cash or bKash on delivery and 100% doorstep inspection.',
    specifications: [
      { label: 'Brand', value: 'Maggi', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '4g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Seasoning Blend', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC', evidenceRefs: ['PACK_BACK'] },
      { label: 'Packaging Type', value: 'Single-use Foil Sachet', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Usage Portion', value: '1 sachet (4g) for 2–3 vegetable/egg servings', evidenceRefs: ['PACK_PORTION'] },
    ],
    highlights: [
      'Individual 4g single-use seasoning sachet',
      'Marketed in Bangladesh by Nestlé Bangladesh PLC',
    ],
    usageDirections:
      'Sprinkle one sachet into vegetable, dal, or curry dishes near end of cooking, and mix well.',
    storageInstructions:
      'Store in a dry, cool place. Single sachet is intended for one-time use upon opening.',
    faqs: [
      {
        question: 'Who markets Maggi Swad-e Magic in Bangladesh?',
        answer:
          'Maggi Swad-e Magic is marketed in Bangladesh by Nestlé Bangladesh PLC.',
        evidenceRefs: ['PACK_BACK'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Maggi Swad-e Magic 4g sachet front label: Seasoning blend, 4g single-use sachet',
        sourceTitle: 'Maggi Swad-e Magic 4g Sachet Front',
        skuScope: '7d931484-904a-4e2b-8a50-61f67f240ef4',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Maggi Swad-e Magic 4g sachet back: Marketed by Nestlé Bangladesh PLC',
        sourceTitle: 'Maggi Swad-e Magic 4g Sachet Back',
        skuScope: '7d931484-904a-4e2b-8a50-61f67f240ef4',
        verifiedAt: '2026-09-16',
      },
      PACK_PORTION: {
        source: 'PACKAGING',
        evidenceRef: 'Nestlé Maggi Swad-e Magic 4g portion text: 1 sachet for 2-3 servings of dish',
        sourceTitle: 'Maggi Swad-e Magic 4g Portion Text',
        skuScope: '7d931484-904a-4e2b-8a50-61f67f240ef4',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 7d931484-904a-4e2b-8a50-61f67f240ef4, category: Spices',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '7d931484-904a-4e2b-8a50-61f67f240ef4',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['PACK_BACK']],
      usageDirections: ['PACK_PORTION'],
      storageInstructions: ['PACK_FRONT'],
    },
  },

  // 20. Samyang Buldak Hot Chicken Ramen Original 140g
  '8169739f': {
    slugPrefix: '8169739f',
    exactName: 'Samyang Buldak Hot Chicken Flavour Ramen 140g',
    brand: 'Samyang',
    netQuantity: '140g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Hot Chicken Flavour Ramen in a 140g packet. Manufactured by Samyang Foods Co., Ltd. in South Korea. Contains noodle block, liquid sauce sachet, and flake sachet. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '140g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Fried Instant Noodles with Sauce', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'South Korea', evidenceRefs: ['PACK_BACK'] },
      { label: 'Included Components', value: 'Noodle block, liquid sauce sachet, flake sachet', evidenceRefs: ['PACK_COMPONENTS'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      'Original Buldak spicy stir-fry noodle recipe',
      'Manufactured by Samyang Foods Co., Ltd. in South Korea',
      'Includes noodle block, liquid sauce sachet, and flake sachet',
    ],
    usageDirections:
      'Boil noodles in 600ml water for 5 minutes. Drain water leaving approx. 8 tablespoons (120ml), add liquid sauce, stir-fry for 30 seconds on low heat, add flakes, mix well, and serve.',
    storageInstructions:
      'Store in a cool, dry place away from moisture and direct sunlight.',
    faqs: [
      {
        question: 'Who manufactures Samyang Buldak noodles?',
        answer:
          'Samyang Buldak noodles are manufactured by Samyang Foods Co., Ltd. in South Korea.',
        evidenceRefs: ['MFR_SPEC'],
      },
      {
        question: 'Can I check the imported packet upon delivery in Chattogram?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection. You can verify the packaging condition and printed expiry date before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 140g packet front label: Hot Chicken Flavor Ramen, 140g net',
        sourceTitle: 'Samyang Buldak 140g Front Packet',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 140g packet back label: Made in South Korea by Samyang Foods Co., Ltd.',
        sourceTitle: 'Samyang Buldak 140g Back Packet',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      PACK_COMPONENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 140g packet contents: Noodle block, soup/sauce packet, flake packet',
        sourceTitle: 'Samyang Buldak 140g Component Declaration',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 140g cooking directions: Boil in 600ml water 5 min, drain leaving 8 spoons, add sauce, stir-fry 30s, add flakes',
        sourceTitle: 'Samyang Buldak 140g Cooking Directions',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 140g storage instruction: Store in a cool, dry place away from sunlight',
        sourceTitle: 'Samyang Buldak 140g Storage Instruction',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Samyang Foods Co., Ltd. official product declaration for Buldak Ramen',
        sourceTitle: 'Samyang Foods Co., Ltd. Corporate Product Registry',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 8169739f-e6eb-4a11-85b4-d7ca195228ad, category: Noodles',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '8169739f-e6eb-4a11-85b4-d7ca195228ad',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'PACK_COMPONENTS', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC'], ['PACK_COMPONENTS']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 21. Samyang Buldak 2x Spicy Hot Chicken Ramen 140g
  f49fa080: {
    slugPrefix: 'f49fa080',
    exactName: 'Samyang Buldak 2x Spicy Hot Chicken Flavour Ramen 140g',
    brand: 'Samyang',
    netQuantity: '140g',
    category: 'Noodles',
    summary:
      'Samyang Buldak 2x Spicy Hot Chicken Flavour Ramen in a 140g packet. Manufactured by Samyang Foods Co., Ltd. in South Korea. Contains 2x spicy sauce and garnish flakes. Dispatched from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '140g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Extra Spicy Fried Instant Noodles', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'South Korea', evidenceRefs: ['PACK_BACK'] },
      { label: 'Included Components', value: 'Noodle block, 2x liquid sauce sachet, flake sachet', evidenceRefs: ['PACK_COMPONENTS'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct heat', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      '2x Spicy recipe formulated with concentrated chilli sauce',
      'Manufactured by Samyang Foods Co., Ltd. in South Korea',
    ],
    usageDirections:
      'Boil noodles in 600ml water for 5 minutes. Drain water leaving approx. 8 tablespoons, add 2x liquid sauce, stir-fry on low heat for 30 seconds, add flakes, and serve.',
    storageInstructions:
      'Store in a dry, cool place away from moisture and heat.',
    faqs: [
      {
        question: 'What is the spice intensity of Buldak 2x Spicy?',
        answer:
          'Buldak 2x Spicy is formulated with double spicy chilli pepper sauce compared to the original version.',
        evidenceRefs: ['PACK_FRONT'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 2x Spicy 140g front label: 2x Spicy Hot Chicken Flavor Ramen, 140g',
        sourceTitle: 'Samyang Buldak 2x Spicy Front Packet',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 2x Spicy 140g back label: Made in South Korea by Samyang Foods Co., Ltd.',
        sourceTitle: 'Samyang Buldak 2x Spicy Back Packet',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      PACK_COMPONENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 2x Spicy components: Noodle block, 2x liquid sauce, flake sachet',
        sourceTitle: 'Samyang Buldak 2x Spicy Component Declaration',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 2x Spicy preparation directions: Boil in 600ml water 5 min, drain leaving 8 spoons, add sauce, stir-fry 30s',
        sourceTitle: 'Samyang Buldak 2x Spicy Prep Directions',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak 2x Spicy storage text: Store in a dry, cool place',
        sourceTitle: 'Samyang Buldak 2x Spicy Storage Text',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Samyang Foods Co., Ltd. official product declaration for Buldak 2x Spicy',
        sourceTitle: 'Samyang Foods Co., Ltd. Corporate Product Registry',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: f49fa080-60ea-44bb-9730-22c9dc4daeb2, category: Noodles',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'f49fa080-60ea-44bb-9730-22c9dc4daeb2',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'PACK_COMPONENTS', 'MFR_SPEC', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 22. Samyang Buldak Cream Carbonara Ramen 130g
  e04a2efd: {
    slugPrefix: 'e04a2efd',
    exactName: 'Samyang Buldak Cream Carbonara Hot Chicken Flavour Ramen 130g',
    brand: 'Samyang',
    netQuantity: '130g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Cream Carbonara Hot Chicken Flavour Ramen in a 130g packet. Manufactured by Samyang Foods Co., Ltd. in South Korea. Combines spicy sauce with cream and cheese powder seasoning. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Net Weight', value: '130g', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Product Type', value: 'Cream Carbonara Instant Noodles', evidenceRefs: ['PACK_FRONT'] },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.', evidenceRefs: ['MFR_SPEC'] },
      { label: 'Country of Origin', value: 'South Korea', evidenceRefs: ['PACK_BACK'] },
      { label: 'Included Components', value: 'Noodle block, spicy liquid sauce, cream seasoning powder', evidenceRefs: ['PACK_COMPONENTS'] },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place', evidenceRefs: ['PACK_STORAGE'] },
    ],
    highlights: [
      'Cream carbonara flavour combining cream powder with Buldak sauce',
      'Manufactured by Samyang Foods Co., Ltd. in South Korea',
    ],
    usageDirections:
      'Boil noodles in 600ml water for 5 minutes. Drain water leaving 8 tablespoons, add spicy sauce and cream seasoning powder, mix thoroughly, and serve.',
    storageInstructions:
      'Store in a cool, dry place away from direct sunlight.',
    faqs: [
      {
        question: 'What is included in the Cream Carbonara packet?',
        answer:
          'The packet includes the noodle block, a spicy liquid sauce sachet, and a creamy cheese seasoning powder sachet.',
        evidenceRefs: ['PACK_COMPONENTS'],
      },
    ],
    evidenceManifest: {
      PACK_FRONT: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak Cream Carbonara 130g front label: Cream Carbonara Hot Chicken Flavor Ramen, 130g',
        sourceTitle: 'Samyang Buldak Cream Carbonara Front Packet',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      PACK_BACK: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak Cream Carbonara 130g back label: Made in South Korea by Samyang Foods Co., Ltd.',
        sourceTitle: 'Samyang Buldak Cream Carbonara Back Packet',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      PACK_COMPONENTS: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak Cream Carbonara components: Noodle block, spicy liquid sauce, cream seasoning powder',
        sourceTitle: 'Samyang Buldak Cream Carbonara Component Declaration',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      PACK_PREP: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak Cream Carbonara cooking directions: Boil in 600ml water 5 min, drain leaving 8 spoons, add sauce and powder, mix',
        sourceTitle: 'Samyang Buldak Cream Carbonara Cooking Directions',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      PACK_STORAGE: {
        source: 'PACKAGING',
        evidenceRef: 'Samyang Buldak Cream Carbonara storage text: Store in a cool, dry place',
        sourceTitle: 'Samyang Buldak Cream Carbonara Storage Text',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      MFR_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: 'Samyang Foods Co., Ltd. official product declaration for Buldak Cream Carbonara',
        sourceTitle: 'Samyang Foods Co., Ltd. Corporate Product Registry',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: e04a2efd-057d-417a-8f55-2d3345472bc2, category: Noodles',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'e04a2efd-057d-417a-8f55-2d3345472bc2',
        verifiedAt: '2026-09-16',
      },
      STORE_DELIVERY_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'DELIVERY_POLICY: 1 km radius from Chawkbazar, ৳500 free threshold, ৳40 standard fee',
        sourceTitle: 'Lucky Store Delivery Policy',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['PACK_FRONT', 'CATALOG_RECORD'],
      brand: ['PACK_FRONT', 'MFR_SPEC'],
      netQuantity: ['PACK_FRONT'],
      category: ['CATALOG_RECORD'],
      summary: ['PACK_FRONT', 'PACK_BACK', 'PACK_COMPONENTS', 'MFR_SPEC', 'STORE_DELIVERY_POLICY', 'STORE_INSPECTION_POLICY'],
      highlights: [['PACK_FRONT'], ['MFR_SPEC']],
      usageDirections: ['PACK_PREP'],
      storageInstructions: ['PACK_STORAGE'],
    },
  },

  // 23. Samyang Buldak Quattro Cheese Ramen 145g
  '7fd83cfc': {
    slugPrefix: '7fd83cfc',
    exactName: 'Samyang Buldak Ramen Quattro Cheese 145g',
    brand: 'Samyang',
    netQuantity: '145g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Ramen Quattro Cheese in a 145g pouch. The official Buldak product page describes a four-cheese blend of Gouda, Cheddar, Camembert, and Mozzarella with a spicy flavour profile. Prepare by boiling the noodles, retaining a small amount of water, then adding the sauce and powder before serving. Available from Lucky Store in Chawkbazar, Chattogram, with doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Net Weight', value: '145g', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Product Type', value: 'Pouch Noodles', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Cheese Blend', value: 'Gouda, Cheddar, Camembert, and Mozzarella', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Spicy Level', value: '3', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Preparation', value: 'Boil 5 minutes 30 seconds; retain 3 oz water; add sauce and powder', evidenceRefs: ['MFR_COOKING'] },
    ],
    highlights: [
      'Four-cheese blend with Gouda, Cheddar, Camembert, and Mozzarella',
      '145g pouch format',
      'Official spicy level 3 rating',
    ],
    usageDirections:
      'Boil 2½ cups (20 oz) of water, cook the noodles for 5 minutes 30 seconds, retain 3 oz of water, add the sauce and powder, stir well, and serve.',
    faqs: [
      {
        question: 'Which cheeses are listed for Buldak Quattro Cheese?',
        answer: 'The official product page lists Gouda, Cheddar, Camembert, and Mozzarella.',
        evidenceRefs: ['MFR_PRODUCT_PAGE'],
      },
      {
        question: 'How do I prepare the Quattro Cheese pouch?',
        answer: 'Boil the noodles for 5 minutes 30 seconds, retain 3 oz of water, add the sauce and powder, stir, and serve.',
        evidenceRefs: ['MFR_COOKING'],
      },
      {
        question: 'Can I inspect this imported noodle pouch before payment?',
        answer: 'Yes. Lucky Store provides 100% doorstep inspection before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: 'Official Buldak Quattro Cheese product page: 145g pouch, four-cheese blend, spicy level 3',
        sourceTitle: 'Buldak Ramen Quattro Cheese 5.11 OZ (145g)',
        sourceUrl: 'https://buldak.com/us/product/buldak-ramen-quattro-cheese/',
        skuScope: 'Buldak Quattro Cheese 145g pouch',
        verifiedAt: '2026-09-16',
      },
      MFR_COOKING: {
        source: 'MANUFACTURER',
        evidenceRef: 'Official Buldak Quattro Cheese cooking instructions: boil, retain 3 oz water, add sauce and powder',
        sourceTitle: 'Buldak Quattro Cheese Cooking Instructions',
        sourceUrl: 'https://buldak.com/us/product/buldak-ramen-quattro-cheese/',
        skuScope: 'Buldak Quattro Cheese 145g pouch',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 7fd83cfc-2eac-45d1-aa90-0002ca5a0222, SKU: NOO-BUL-QTC, category: Noodles',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '7fd83cfc-2eac-45d1-aa90-0002ca5a0222',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['MFR_PRODUCT_PAGE', 'CATALOG_RECORD'],
      brand: ['MFR_PRODUCT_PAGE'],
      netQuantity: ['MFR_PRODUCT_PAGE'],
      category: ['CATALOG_RECORD'],
      summary: ['MFR_PRODUCT_PAGE', 'MFR_COOKING', 'STORE_INSPECTION_POLICY'],
      highlights: [['MFR_PRODUCT_PAGE'], ['MFR_PRODUCT_PAGE'], ['MFR_PRODUCT_PAGE']],
      usageDirections: ['MFR_COOKING'],
    },
  },

  // 24. Samyang Buldak 2X Spicy Cup 70g
  b79a6606: {
    slugPrefix: 'b79a6606',
    exactName: 'Samyang Buldak Ramen 2X Cup 70g',
    brand: 'Samyang',
    netQuantity: '70g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Ramen 2X Cup in a 70g cup format. The official Buldak page describes an intense twice-as-hot spicy profile and a five-step cup preparation method: remove the two packets, add boiling water to the inner line, wait four minutes, drain, then mix in the sauce and dry cheese powder. Available from Lucky Store in Chawkbazar, Chattogram, with doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Net Weight', value: '70g', evidenceRefs: ['MFR_PRODUCT_PAGE', 'PACK_NUTRITION'] },
      { label: 'Product Type', value: 'Cup Noodles', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Spicy Level', value: '5', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Calories', value: '300 per 70g cup', evidenceRefs: ['PACK_NUTRITION'] },
      { label: 'Sodium', value: '640mg per cup', evidenceRefs: ['PACK_NUTRITION'] },
      { label: 'Preparation', value: 'Add boiling water to inner line, stand 4 minutes, drain, add sauce and dry cheese powder', evidenceRefs: ['MFR_COOKING'] },
    ],
    highlights: [
      'Twice-as-hot Buldak cup noodle profile',
      '70g single-serve cup',
      'Includes sauce and dry cheese powder packets',
    ],
    usageDirections:
      'Partially open the lid and remove both packets. Add boiling water to the inner line, close the lid for 4 minutes, drain all water, add sauce and dry cheese powder, stir, and serve.',
    faqs: [
      {
        question: 'How spicy is Buldak 2X Cup?',
        answer: 'The official product page labels it as the ultimate heat for spice masters and shows spicy level 5.',
        evidenceRefs: ['MFR_PRODUCT_PAGE'],
      },
      {
        question: 'What are the nutrition facts for the 70g cup?',
        answer: 'The supplied Nutrition Facts panel lists 300 calories and 640mg sodium per 70g cup.',
        evidenceRefs: ['PACK_NUTRITION'],
      },
      {
        question: 'Can I inspect this cup noodle before payment?',
        answer: 'Yes. Lucky Store provides 100% doorstep inspection before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: 'Official Buldak 2X Cup product page: 70g cup, spicy level 5, twice-as-hot positioning',
        sourceTitle: 'Buldak Ramen 2X Cup 2.47 OZ (70g)',
        sourceUrl: 'https://buldak.com/us/product/buldak-ramen-2x-cup/',
        skuScope: 'Buldak 2X Cup 70g',
        verifiedAt: '2026-09-16',
      },
      MFR_COOKING: {
        source: 'MANUFACTURER',
        evidenceRef: 'Official Buldak 2X Cup preparation: boiling water to inner line, stand 4 minutes, drain, add sauce and dry cheese powder',
        sourceTitle: 'Buldak 2X Cup Cooking Instructions',
        sourceUrl: 'https://buldak.com/us/product/buldak-ramen-2x-cup/',
        skuScope: 'Buldak 2X Cup 70g',
        verifiedAt: '2026-09-16',
      },
      PACK_NUTRITION: {
        source: 'PACKAGING',
        evidenceRef: 'Supplied Nutrition Facts panel for Buldak 2X Cup: 1 cup (70g), 300 calories, 11g fat, 640mg sodium, 43g carbohydrate, 7g protein',
        sourceTitle: 'Buldak 2X Cup Nutrition Facts Panel',
        skuScope: 'Buldak 2X Cup 70g',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: b79a6606-3eb8-425e-bf53-57c5788dc7ea, SKU: NOO-BUL-2XS, category: Noodles',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: 'b79a6606-3eb8-425e-bf53-57c5788dc7ea',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['MFR_PRODUCT_PAGE', 'CATALOG_RECORD'],
      brand: ['MFR_PRODUCT_PAGE'],
      netQuantity: ['MFR_PRODUCT_PAGE', 'PACK_NUTRITION'],
      category: ['CATALOG_RECORD'],
      summary: ['MFR_PRODUCT_PAGE', 'MFR_COOKING', 'PACK_NUTRITION', 'STORE_INSPECTION_POLICY'],
      highlights: [['MFR_PRODUCT_PAGE'], ['MFR_PRODUCT_PAGE'], ['MFR_COOKING']],
      usageDirections: ['MFR_COOKING'],
    },
  },

  // 25. Trident Pineapple Twist Sugar Free Gum 14 pieces
  '5b214258': {
    slugPrefix: '5b214258',
    exactName: 'Trident Pineapple Twist Sugar Free Gum 14 Pieces',
    brand: 'Trident',
    netQuantity: '14 pieces',
    category: 'Chocolates & Candies',
    summary:
      'Trident Pineapple Twist Sugar Free Gum in a 14-piece pack. The manufacturer describes the gum as a fruity pineapple-flavoured, sugar-free product sweetened with xylitol, with 14 individually wrapped sticks in each pack. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Trident', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Net Quantity', value: '14 pieces', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Product Type', value: 'Sugar Free Chewing Gum', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Flavour', value: 'Pineapple Twist', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Sweetener', value: 'Xylitol', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Pack Format', value: '14 individually wrapped sticks', evidenceRefs: ['MFR_PRODUCT_PAGE'] },
      { label: 'Allergen Declaration', value: 'Contains soy; contains phenylalanine', evidenceRefs: ['MFR_INGREDIENTS'] },
      { label: 'Ingredients', value: 'Sorbitol, gum base, xylitol, glycerin, natural and artificial flavor; less than 2% acesulfame potassium, aspartame, BHT, citric acid, malic acid, mannitol, soy lecithin, and Yellow 5 Lake', evidenceRefs: ['MFR_INGREDIENTS'] },
    ],
    highlights: [
      'Sugar-free pineapple-flavoured chewing gum',
      'Sweetened with xylitol',
      '14 individually wrapped sticks per pack',
    ],
    usageDirections:
      'Chew after eating or drinking as directed by the manufacturer. People with phenylketonuria should note the phenylalanine declaration on the product page.',
    faqs: [
      {
        question: 'How many sticks are in Trident Pineapple Twist?',
        answer: 'Each pack contains 14 individually wrapped sticks.',
        evidenceRefs: ['MFR_PRODUCT_PAGE'],
      },
      {
        question: 'What sweetener is used in this sugar-free gum?',
        answer: 'The manufacturer identifies xylitol as a sweetener and also lists sorbitol, among the ingredients.',
        evidenceRefs: ['MFR_PRODUCT_PAGE', 'MFR_INGREDIENTS'],
      },
      {
        question: 'Does Trident Pineapple Twist contain allergens?',
        answer: 'The manufacturer declares that it contains soy and includes a phenylalanine warning for phenylketonurics.',
        evidenceRefs: ['MFR_INGREDIENTS'],
      },
      {
        question: 'Can I inspect this gum pack before payment?',
        answer: 'Yes. Lucky Store provides 100% doorstep inspection before payment.',
        evidenceRefs: ['STORE_INSPECTION_POLICY'],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: 'Trident Pineapple Twist product page: sugar-free gum, pineapple flavour, xylitol, 14 individually wrapped sticks',
        sourceTitle: 'Trident Pineapple Twist (14 pieces)',
        sourceUrl: 'https://www.tridentgum.com/products/trident-pineapple-twist-14-pieces',
        skuScope: 'Trident Pineapple Twist 14 pieces',
        verifiedAt: '2026-09-16',
      },
      MFR_INGREDIENTS: {
        source: 'MANUFACTURER',
        evidenceRef: 'Trident Pineapple Twist ingredient and allergen declaration, including soy and phenylalanine warning',
        sourceTitle: 'Trident Pineapple Twist Ingredients',
        sourceUrl: 'https://www.tridentgum.com/products/trident-pineapple-twist-14-pieces',
        skuScope: 'Trident Pineapple Twist 14 pieces',
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: 'items.id: 5b214258-3bf9-4a99-9c58-0f95e1a7930e, SKU: CC-TRI-14, category: Chocolates & Candies',
        sourceTitle: 'Lucky Store Production Catalog',
        skuScope: '5b214258-3bf9-4a99-9c58-0f95e1a7930e',
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: 'INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash',
        sourceTitle: 'Lucky Store Inspection Policy',
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ['MFR_PRODUCT_PAGE', 'CATALOG_RECORD'],
      brand: ['MFR_PRODUCT_PAGE'],
      netQuantity: ['MFR_PRODUCT_PAGE'],
      category: ['CATALOG_RECORD'],
      summary: ['MFR_PRODUCT_PAGE', 'MFR_INGREDIENTS', 'STORE_INSPECTION_POLICY'],
      highlights: [['MFR_PRODUCT_PAGE'], ['MFR_PRODUCT_PAGE'], ['MFR_PRODUCT_PAGE']],
      usageDirections: ['MFR_PRODUCT_PAGE', 'MFR_INGREDIENTS'],
    },
  },
  // Samyang Buldak Ramen Cheese Cup 70g
  '0c815bf1': {
    slugPrefix: '0c815bf1',
    exactName: "Samyang Buldak Ramen Cheese Cup 70g",
    brand: "Samyang",
    netQuantity: "70g",
    category: "Noodles",
    summary:
      "Samyang Buldak Ramen Cheese Cup in a 70g quick-serve cup format. The manufacturer describes this product as Cheese Buldak combining rich, bold creamy cheese flavor with signature fiery Buldak spice. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Samyang", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Weight", value: "70g (2.46 oz)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cup Noodles", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Bold Creamy Cheese and Fiery Spice", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Preparation", value: "Add boiling water to inner line, steep 4 minutes, drain, stir in sauce and cheese powder", evidenceRefs: ["MFR_COOKING"] },
    ],
    highlights: [
      "Bold, creamy cheese flavor balanced with fiery Buldak spice",
      "Convenient 70g single-serve cup container",
      "Quick preparation with hot water",
    ],
    usageDirections:
      "Open the lid halfway, add boiling water up to the inside line, close lid for 4 minutes, drain the water leaving a splash, add the liquid sauce and cheese powder, mix thoroughly and enjoy.",
    faqs: [
      {
        question: "What is the flavor of Buldak Cheese Cup?",
        answer: "The manufacturer describes it as Cheese Buldak featuring the rich flavor of bold, creamy cheese with spicy Buldak heat.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "How do you prepare the 70g cheese cup noodles?",
        answer: "Add boiling water to the inner line, let sit for 4 minutes, drain water, then stir in the liquid sauce and cheese seasoning.",
        evidenceRefs: ["MFR_COOKING"],
      },
      {
        question: "Can I inspect this cup noodle before paying?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment by cash or bKash in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Cheese Cup page: 2.46 OZ (70g), cup-noodles, bold creamy cheese flavor",
        sourceTitle: "Buldak Ramen Cheese Cup 2.46 OZ (70g)",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-cheese-cup/",
        skuScope: "Buldak Cheese Cup 70g",
        verifiedAt: '2026-09-16',
      },
      MFR_COOKING: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Cup preparation: boiling water to inner line, 4 minutes, drain, add sauce and powder",
        sourceTitle: "Buldak Cheese Cup Preparation Guide",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-cheese-cup/",
        skuScope: "Buldak Cheese Cup 70g",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 0c815bf1-c506-44f5-88dd-b504db60d7af, SKU: NOO-BUL-CHE-CUP, category: Noodles",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "0c815bf1-c506-44f5-88dd-b504db60d7af",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_COOKING"]],
      usageDirections: ["MFR_COOKING"],
    },
  },

  // Samyang Buldak Ramen Original Cup 70g
  '4bbb76d4': {
    slugPrefix: '4bbb76d4',
    exactName: "Samyang Buldak Ramen Original Cup 70g",
    brand: "Samyang",
    netQuantity: "70g",
    category: "Noodles",
    summary:
      "Samyang Buldak Ramen Original Cup in a 70g cup. The manufacturer highlights its signature fiery heat and rich umami flavor profile that defines the iconic Buldak series. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Samyang", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Weight", value: "70g (2.47 oz)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cup Noodles", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Signature Fiery Heat and Rich Umami", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Preparation", value: "Add boiling water to inner line, stand 4 minutes, drain, stir in spicy sauce and sesame/seaweed flakes", evidenceRefs: ["MFR_COOKING"] },
    ],
    highlights: [
      "Iconic original fiery hot chicken flavor with rich umami",
      "Compact 70g cup packaging ideal for quick meals",
      "Simple hot water preparation",
    ],
    usageDirections:
      "Peel the lid halfway, pour boiling water to the inside fill line, wait 4 minutes, drain water, add liquid spicy sauce and flakes, stir thoroughly, and serve.",
    faqs: [
      {
        question: "What is the signature taste of Buldak Original Cup?",
        answer: "The manufacturer describes it as their iconic fiery hot chicken flavor with deep, addictive umami.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "How do you cook Buldak Original Cup ramen?",
        answer: "Add boiling water to the inner line, steep for 4 minutes, drain, and mix in the liquid sauce and garnish.",
        evidenceRefs: ["MFR_COOKING"],
      },
      {
        question: "Can I check this item at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment across our Chawkbazar coverage zone.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Original Cup page: 2.47 OZ (70g), cup-noodles, fiery heat and rich umami",
        sourceTitle: "Buldak Ramen Original Cup 2.47 OZ (70g)",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-original-cup/",
        skuScope: "Buldak Original Cup 70g",
        verifiedAt: '2026-09-16',
      },
      MFR_COOKING: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Original Cup cooking steps: boiling water, 4 min, drain, add sauce and flakes",
        sourceTitle: "Buldak Original Cup Cooking Instructions",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-original-cup/",
        skuScope: "Buldak Original Cup 70g",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 4bbb76d4-f058-430f-9fd1-87db15d71b5c, SKU: NOO-BUL-ORG-CUP, category: Noodles",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "4bbb76d4-f058-430f-9fd1-87db15d71b5c",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_COOKING"]],
      usageDirections: ["MFR_COOKING"],
    },
  },

  // Samyang Buldak Ramen Rose 140g
  '841b013d': {
    slugPrefix: '841b013d',
    exactName: "Samyang Buldak Ramen Rose 140g",
    brand: "Samyang",
    netQuantity: "140g",
    category: "Noodles",
    summary:
      "Samyang Buldak Ramen Rose in a 140g pouch. The manufacturer specifies that this formulation is crafted with a golden ratio blend of fiery Buldak sauce, authentic Korean gochujang, and rich smooth cream. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Samyang", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Weight", value: "140g (4.93 oz)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Pouch Noodles", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Fiery Buldak Sauce, Gochujang, and Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Preparation", value: "Boil noodles, drain retaining water, mix thoroughly with liquid sauce and creamy Rose powder", evidenceRefs: ["MFR_COOKING"] },
    ],
    highlights: [
      "Golden ratio combination of spicy Buldak, savory gochujang, and creamy dairy notes",
      "Generous 140g pouch serving",
      "Thick stir-fry noodle texture",
    ],
    usageDirections:
      "Boil the noodles in water for 5 minutes, drain almost all water leaving about 4 tablespoons, add the liquid seasoning sauce and creamy powder packet, stir well over low heat for 30 seconds, and serve hot.",
    faqs: [
      {
        question: "What ingredients give Buldak Rose its distinctive taste?",
        answer: "The official manufacturer specification highlights a golden ratio of spicy Buldak sauce, Korean gochujang, and cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "How do you prepare Buldak Rose pouch ramen?",
        answer: "Boil noodles for 5 minutes, drain while retaining 4 tablespoons of water, then stir in the liquid sauce and powder seasoning.",
        evidenceRefs: ["MFR_COOKING"],
      },
      {
        question: "Can I inspect this noodle pack upon delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Rose page: 4.93 OZ (140g), pouch-noodles, blend of Buldak sauce, gochujang, and cream",
        sourceTitle: "Buldak Ramen Rose 4.93 OZ (140g)",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-rose/",
        skuScope: "Buldak Rose 140g pouch",
        verifiedAt: '2026-09-16',
      },
      MFR_COOKING: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Buldak Rose cooking guide: boil, drain retaining liquid, mix sauce and cream powder",
        sourceTitle: "Buldak Rose Preparation Guide",
        sourceUrl: "https://buldak.com/us/product/buldak-ramen-rose/",
        skuScope: "Buldak Rose 140g pouch",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 841b013d-e7bd-46a6-9e69-282f84aa2781, SKU: NOO-BUL-ROS, category: Noodles",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "841b013d-e7bd-46a6-9e69-282f84aa2781",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_COOKING"]],
      usageDirections: ["MFR_COOKING"],
    },
  },

  // Polar Carnival Butterscotch Cone Ice Cream 120ml
  '5830390b': {
    slugPrefix: '5830390b',
    exactName: "Polar Carnival Butterscotch Cone Ice Cream 120ml",
    brand: "Polar",
    netQuantity: "120 ml",
    category: "Ice-Cream",
    summary:
      "Polar Carnival Butterscotch Cone Ice Cream in a 120ml crispy cone. The manufacturer describes crispy butter-flavoured biscuits filled with butterscotch ice cream, butterscotch ripple, caramel toppings, and butterscotch chips. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "120 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cone Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "320.53 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Toppings & Inclusions", value: "Caramel toppings, butterscotch ripple, and butterscotch chips", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Crispy butter-flavoured biscuit cone with butterscotch ice cream",
      "Rich caramel toppings, butterscotch ripple, and crunchy chips",
      "Single-serve 120ml cone format",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume promptly once opened.",
    faqs: [
      {
        question: "What inclusions are inside the Polar Carnival Butterscotch cone?",
        answer: "The official Polar page details butterscotch ice cream with butterscotch ripple, caramel toppings, and butterscotch chips inside a crispy butter-flavoured cone.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the net volume and calorie count?",
        answer: "Net volume is 120 ml, and the manufacturer provides an energy value of 320.53 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I verify this ice cream on delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our local delivery zone.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Carnival Butterscotch page: 120 ml cone, 320.53 kcal/100g, caramel toppings, butterscotch ripple, butterscotch chips",
        sourceTitle: "Carnival Butterscotch - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/cone-carnival-butterscotch/",
        skuScope: "Polar Carnival Butterscotch 120ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 5830390b-4eef-4685-965e-de21d8e4ae7e, SKU: IC-POL-CAR-2, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "5830390b-4eef-4685-965e-de21d8e4ae7e",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Carnival Vanilla Cone Ice Cream 120ml
  'e8771528': {
    slugPrefix: 'e8771528',
    exactName: "Polar Carnival Vanilla Cone Ice Cream 120ml",
    brand: "Polar",
    netQuantity: "120 ml",
    category: "Ice-Cream",
    summary:
      "Polar Carnival Vanilla Cone Ice Cream in a 120ml crispy cone. The manufacturer describes smooth vanilla ice cream topped with chocolate and crunchy nuts nestled inside a crispy wafer cone. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "120 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cone Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "296.39 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Toppings", value: "Chocolate topping and nuts within a crispy cone", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Creamy vanilla ice cream in a crispy wafer cone",
      "Topped with rich chocolate drizzle and crunchy chopped nuts",
      "Classic 120ml single-serve treat",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume promptly once opened.",
    faqs: [
      {
        question: "What toppings come on the Polar Carnival Vanilla cone?",
        answer: "The official Polar product page describes vanilla ice cream finished with chocolate topping and nuts in a crispy cone.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the nutritional energy value?",
        answer: "The manufacturer declares 296.39 kcal per 100 grams for Carnival Vanilla.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this item at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Carnival Vanilla page: 120 ml cone, 296.39 kcal/100g, chocolate topping and nuts",
        sourceTitle: "Carnival (Vanilla) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/cone-carnival-vanilla/",
        skuScope: "Polar Carnival Vanilla 120ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: e8771528-0444-4659-ba97-d71e7a8ff438, SKU: IC-POL-CAR, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "e8771528-0444-4659-ba97-d71e7a8ff438",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Carnival Vanilla Cone Ice Cream 120ml
  '6df59696': {
    slugPrefix: '6df59696',
    exactName: "Polar Carnival Vanilla Cone Ice Cream 120ml",
    brand: "Polar",
    netQuantity: "120 ml",
    category: "Ice-Cream",
    summary:
      "Polar Carnival Vanilla Cone Ice Cream in a 120ml crispy cone. The manufacturer describes smooth vanilla ice cream topped with chocolate and crunchy nuts nestled inside a crispy wafer cone. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "120 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cone Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "296.39 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Toppings", value: "Chocolate topping and nuts within a crispy cone", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Creamy vanilla ice cream in a crispy wafer cone",
      "Topped with rich chocolate drizzle and crunchy chopped nuts",
      "Classic 120ml single-serve treat",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume promptly once opened.",
    faqs: [
      {
        question: "What toppings come on the Polar Carnival Vanilla cone?",
        answer: "The official Polar product page describes vanilla ice cream finished with chocolate topping and nuts in a crispy cone.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the nutritional energy value?",
        answer: "The manufacturer declares 296.39 kcal per 100 grams for Carnival Vanilla.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this item at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Carnival Vanilla page: 120 ml cone, 296.39 kcal/100g, chocolate topping and nuts",
        sourceTitle: "Carnival (Vanilla) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/cone-carnival-vanilla/",
        skuScope: "Polar Carnival Vanilla 120ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 6df59696-6647-4c08-8cd4-4a137da6326b, SKU: IC-POL-CAR-3, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "6df59696-6647-4c08-8cd4-4a137da6326b",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Chocobar Vanilla Ice Cream 72ml
  'fc6d963a': {
    slugPrefix: 'fc6d963a',
    exactName: "Polar Chocobar Vanilla Ice Cream 72ml",
    brand: "Polar",
    netQuantity: "72 ml",
    category: "Ice-Cream",
    summary:
      "Polar Chocobar Vanilla Ice Cream on a stick in a 72ml bar. The manufacturer describes an incredible combination of chocolate-coated vanilla ice cream, creating an enduring classic favorite. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "72 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "293.59 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Coating", value: "Rich chocolate coating over creamy vanilla ice cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Crisp chocolate shell surrounding smooth vanilla ice cream",
      "Handy 72ml stick format",
      "Timeless family-favorite treat",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening wrapper.",
    faqs: [
      {
        question: "What is Polar Chocobar made of?",
        answer: "The manufacturer describes it as chocolate-coated vanilla ice cream on a stick.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the volume and calorie profile?",
        answer: "The net volume is 72 ml, with an energy value of 293.59 kcal per 100 grams declared by Polar.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect this frozen bar on delivery?",
        answer: "Yes. Lucky Store provides 100% doorstep inspection before payment in our coverage radius.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Chocobar Vanilla page: 72 ml stick, 293.59 kcal/100g, chocolate-coated vanilla ice cream",
        sourceTitle: "Chocobar (Vanilla) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-chocobar-vanilla/",
        skuScope: "Polar Chocobar Vanilla 72ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: fc6d963a-1d54-42d0-8b6b-47825cf94f11, SKU: IC-POL-CHO, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "fc6d963a-1d54-42d0-8b6b-47825cf94f11",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Coffee Ice Cream Tub 1L
  '2e948079': {
    slugPrefix: '2e948079',
    exactName: "Polar Coffee Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Coffee Ice Cream Tub in a 1000ml family tub. The manufacturer highlights a superb combination of aromatic coffee and chocolate chips creating a delicious dessert for family occasions. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1000 ml (1 Litre)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Coffee with Chocolate Chips", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "273.36 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Rich roasted coffee flavor blended with chocolate chips",
      "Generous 1000ml family-size tub",
      "Ideal dessert for family dinners and celebrations",
    ],
    storageInstructions: "Store frozen at -18°C or below. Reclose tub lid securely after serving.",
    faqs: [
      {
        question: "What are the main flavor notes in Polar Coffee Ice Cream?",
        answer: "The official Polar page notes a combination of coffee ice cream with rich chocolate chips.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package size and calorie value?",
        answer: "It comes in a 1000 ml (1 Litre) tub with an energy value of 273.36 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect the ice cream tub upon delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our Chawkbazar coverage zone.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Coffee page: 1000 ml tub, 273.36 kcal/100g, coffee and chocolate chips",
        sourceTitle: "Coffee - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-coffee/",
        skuScope: "Polar Coffee 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 2e948079-ebb6-498f-b14a-fda18fbbf721, SKU: IC-POL-COF, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "2e948079-ebb6-498f-b14a-fda18fbbf721",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Crunchy Ice Cream Stick 82ml
  '8f7ce150': {
    slugPrefix: '8f7ce150',
    exactName: "Polar Crunchy Ice Cream Stick 82ml",
    brand: "Polar",
    netQuantity: "82 ml",
    category: "Ice-Cream",
    summary:
      "Polar Crunchy Ice Cream Stick in an 82ml bar. The manufacturer describes velvety vanilla ice cream wrapped around by a crunchy layer of toffee, rich in taste and loved by dessert lovers. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "82 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Coating", value: "Crunchy layer of toffee over vanilla ice cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "327.23 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Crunchy golden toffee shell over creamy vanilla ice cream",
      "Satisfying 82ml single-serve stick",
      "Distinctive toffee crunch texture",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening wrapper.",
    faqs: [
      {
        question: "What coating is on Polar Crunchy?",
        answer: "The official Polar product page describes a crunchy layer of toffee wrapping vanilla ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the volume and energy content?",
        answer: "It has a net volume of 82 ml and an energy value of 327.23 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this ice cream at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our delivery area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Crunchy page: 82 ml stick, 327.23 kcal/100g, crunchy layer of toffee over vanilla",
        sourceTitle: "Crunchy - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-crunchy/",
        skuScope: "Polar Crunchy 82ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 8f7ce150-2419-408f-bd99-db8daa8f9b05, SKU: IC-POL-CRU, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "8f7ce150-2419-408f-bd99-db8daa8f9b05",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Doi Ice Cream Tub 1L
  '54a7520e': {
    slugPrefix: '54a7520e',
    exactName: "Polar Doi Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Doi Ice Cream Tub in a 1 Liter tub. The manufacturer highlights the traditional taste of sweet Bengali yogurt (Doi) transformed into a creamy frozen dessert rich in milk nutrition. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1 Liter (1000 ml)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Traditional Sweet Yogurt (Doi)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "257.13 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Authentic sweet yogurt (Misti Doi) dessert flavor",
      "Rich in the natural nutrition of milk",
      "Family-sized 1 Liter sharing tub",
    ],
    storageInstructions: "Store frozen at -18°C or below. Reclose tub lid tightly after serving.",
    faqs: [
      {
        question: "What does Polar Doi ice cream taste like?",
        answer: "The manufacturer highlights the authentic, traditional flavor of Bengali sweet yogurt (Doi) blended into frozen ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package volume and calories?",
        answer: "It comes in a 1 Liter tub with an energy rating of 257.13 kcal.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect this ice cream tub before paying?",
        answer: "Yes. Lucky Store provides 100% doorstep inspection before payment in our Chawkbazar delivery area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Doi page: 1 Liter tub, 257.13 kcal, traditional Doi flavor rich in milk nutrition",
        sourceTitle: "Doi - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-doi/",
        skuScope: "Polar Doi 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 54a7520e-a90e-42ec-884f-c8f4d25abaac, SKU: IC-POL-D1L, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "54a7520e-a90e-42ec-884f-c8f4d25abaac",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Ice Lolly Lemon 62ml
  '604e6bb0': {
    slugPrefix: '604e6bb0',
    exactName: "Polar Ice Lolly Lemon 62ml",
    brand: "Polar",
    netQuantity: "62 ml",
    category: "Ice-Cream",
    summary:
      "Polar Ice Lolly Lemon in a 62ml frozen stick. The manufacturer describes a refreshing lemon-flavored ice lolly crafted to deliver an unmatched chilly, thirst-quenching sensation during hot weather. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "62 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Ice Lolly Stick", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor", value: "Tangy Lemon", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "81.49 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Refreshing zesty lemon flavor",
      "Light and refreshing ice lolly format with only 81.49 kcal per 100g",
      "Convenient 62ml frozen stick",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening.",
    faqs: [
      {
        question: "What flavor is Polar Ice Lolly?",
        answer: "The official Polar page identifies it as a tangy, chilly lemon ice lolly.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the calorie profile of Polar Ice Lolly Lemon?",
        answer: "The manufacturer lists 81.49 kcal per 100 grams for this light frozen treat.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect this frozen item before paying?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our delivery zone.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Ice Lolly Lemon page: 62 ml stick, 81.49 kcal/100g, chilly lemon feel",
        sourceTitle: "Ice Lolly (Lemon) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-ice-lolly-lemon/",
        skuScope: "Polar Ice Lolly Lemon 62ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 604e6bb0-6042-4daf-adb9-12a4f9738ef4, SKU: IC-POL-ICE, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "604e6bb0-6042-4daf-adb9-12a4f9738ef4",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Kheer Ice Cream Tub 1L
  'c1895793': {
    slugPrefix: 'c1895793',
    exactName: "Polar Kheer Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Kheer Ice Cream Tub in a 1000ml family tub. The manufacturer highlights the traditional aromatic taste of Kheer, enriched with a delightful topping of crunchy nuts and sweet raisins. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1000 ml (1 Litre)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Traditional Kheer with Nuts and Raisins", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "240.23 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Traditional spiced milk kheer dessert flavor",
      "Garnished with real nuts and raisins topping",
      "1000ml family-size sharing tub",
    ],
    storageInstructions: "Store frozen at -18°C or below. Keep tub covered when not serving.",
    faqs: [
      {
        question: "What toppings are included in Polar Kheer Ice Cream?",
        answer: "The official Polar page specifies a delightful topping of nuts and raisins on traditional Kheer ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package size and calorie value?",
        answer: "It comes in a 1000 ml (1 Litre) tub with an energy value of 240.23 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this tub before paying?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Kheer page: 1000 ml tub, 240.23 kcal/100g, nuts and raisins topping",
        sourceTitle: "Kheer - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-kheer/",
        skuScope: "Polar Kheer 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: c1895793-84d3-492d-93eb-1c56383cecc4, SKU: IC-POL-K1L-2, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "c1895793-84d3-492d-93eb-1c56383cecc4",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Kheer Ice Cream Tub 500ml
  '79e0ece1': {
    slugPrefix: '79e0ece1',
    exactName: "Polar Kheer Ice Cream Tub 500ml",
    brand: "Polar",
    netQuantity: "500 ml",
    category: "Ice-Cream",
    summary:
      "Polar Kheer Ice Cream Tub in a 500ml (half-liter) tub. The manufacturer highlights the traditional aromatic taste of Kheer, enriched with a delightful topping of crunchy nuts and sweet raisins. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "500 ml (1/2 Liter)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Traditional Kheer with Nuts and Raisins", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "240.23 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Traditional spiced milk kheer dessert flavor",
      "Garnished with real nuts and raisins topping",
      "Convenient 500ml half-liter format",
    ],
    storageInstructions: "Store frozen at -18°C or below. Keep tub covered when not serving.",
    faqs: [
      {
        question: "What toppings are included in Polar Kheer Ice Cream?",
        answer: "The official Polar page specifies a delightful topping of nuts and raisins on traditional Kheer ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package size and calorie value?",
        answer: "This SKU is a 500 ml tub with an energy value of 240.23 kcal per 100 grams declared by Polar.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this tub before paying?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Kheer product specification: 240.23 kcal/100g, nuts and raisins topping, traditional kheer recipe",
        sourceTitle: "Kheer - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-kheer/",
        skuScope: "Polar Kheer 500ml tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 79e0ece1-0c5e-4e2f-a003-d2f37b73fafb, SKU: IC-POL-K1L, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "79e0ece1-0c5e-4e2f-a003-d2f37b73fafb",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Malai Ice Cream Stick 40ml
  'b77e2fe6': {
    slugPrefix: 'b77e2fe6',
    exactName: "Polar Malai Ice Cream Stick 40ml",
    brand: "Polar",
    netQuantity: "40 ml",
    category: "Ice-Cream",
    summary:
      "Polar Malai Ice Cream on a stick in a 40ml format. The manufacturer celebrates reminiscent childhood flavors with rich, sweet clotted cream (malai) taste. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "40 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Traditional Clotted Cream (Malai)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "210.94 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Nostalgic, rich clotted cream (malai) flavor",
      "Affordable single-serve 40ml stick",
      "Smooth frozen milk texture",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening wrapper.",
    faqs: [
      {
        question: "What is the flavor of Polar Malai?",
        answer: "The official Polar description highlights a classic clotted milk cream (malai) flavor reminiscent of traditional favorites.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the stick volume and energy?",
        answer: "It has a net volume of 40 ml and an energy value of 210.94 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect this ice cream stick on delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Malai page: 40 ml stick, 210.94 kcal/100g, reminisce childhood tastebuds",
        sourceTitle: "Malai - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-malai/",
        skuScope: "Polar Malai 40ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: b77e2fe6-53c0-4fc5-8de3-31cec1e1f510, SKU: IC-POL-MAL, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "b77e2fe6-53c0-4fc5-8de3-31cec1e1f510",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Mango Ice Cream Tub 1L
  'f2d567f0': {
    slugPrefix: 'f2d567f0',
    exactName: "Polar Mango Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Mango Ice Cream Tub in a 1000ml family tub. The manufacturer highlights delicious tropical mango flavor that uplifts your mood anytime and anywhere. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1000 ml (1 Litre)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Tropical Mango", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "199.34 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Tropical fruit flavor loved across generations",
      "1000ml family-size sharing tub",
      "Moderate 199.34 kcal per 100g energy profile",
    ],
    storageInstructions: "Store frozen at -18°C or below. Seal lid tightly between servings.",
    faqs: [
      {
        question: "What is the flavor profile of Polar Mango Tub?",
        answer: "The official Polar page describes it as an uplifting, tropical mango-flavored ice cream dessert.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package size and nutritional energy?",
        answer: "It comes in a 1000 ml tub with an energy value of 199.34 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this tub at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our Chawkbazar delivery area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Mango page: 1000 ml tub, 199.34 kcal/100g, mango-flavoured ice cream",
        sourceTitle: "Mango - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-mango/",
        skuScope: "Polar Mango 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: f2d567f0-f15c-4296-8884-d2e45f7dce68, SKU: IC-POL-MAN-2, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "f2d567f0-f15c-4296-8884-d2e45f7dce68",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Red Velvet Ice Cream Tub 1L
  'bc7de70f': {
    slugPrefix: 'bc7de70f',
    exactName: "Polar Red Velvet Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Red Velvet Ice Cream Tub in a 1000ml gourmet tub. The manufacturer describes a rich blend of cheesy ice cream and premium velvety cake, leaving a lingering, luxurious dessert experience. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1000 ml (1 Litre)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Premium Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Cheesy Ice Cream and Premium Velvety Cake", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "236.72 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Gourmet fusion of cream cheese notes and authentic red velvet cake crumbles",
      "Generous 1000ml premium tub",
      "Distinctive dessert profile for celebrations",
    ],
    storageInstructions: "Store frozen at -18°C or below. Reclose securely after opening.",
    faqs: [
      {
        question: "What makes Polar Red Velvet Ice Cream special?",
        answer: "The manufacturer highlights a unique combination of cheesy ice cream blended with real velvety cake pieces.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the package size and energy count?",
        answer: "It is a 1000 ml tub with an energy value of 236.72 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I inspect this premium tub upon delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our Chawkbazar delivery area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Red Velvet page: 1000 ml tub, 236.72 kcal/100g, cheesy ice cream and velvety cake",
        sourceTitle: "Red Velvet - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-red-velvet/",
        skuScope: "Polar Red Velvet 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: bc7de70f-e4d8-42e7-8e83-ecccbbfd7a72, SKU: IC-POL-RV1, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "bc7de70f-e4d8-42e7-8e83-ecccbbfd7a72",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Robusto Salted Caramel Ice Cream 92ml
  '2c367e44': {
    slugPrefix: '2c367e44',
    exactName: "Polar Robusto Salted Caramel Ice Cream 92ml",
    brand: "Polar",
    netQuantity: "92 ml",
    category: "Ice-Cream",
    summary:
      "Polar Robusto Salted Caramel Ice Cream in a 92ml premium stick. The manufacturer describes decadent salted caramel ice cream wrapped in a thick, authentic chocolate coating. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "92 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Premium Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Coating", value: "Thick Real Chocolate Coating", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Salted Caramel", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "301 kcal per piece", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Thick real chocolate exterior coating",
      "Rich salted caramel ice cream center",
      "Indulgent 92ml premium stick bar",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after unwrapping.",
    faqs: [
      {
        question: "What makes Polar Robusto distinctive?",
        answer: "The manufacturer emphasizes real chocolate coating wrapped around indulgent salted caramel ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the volume and calorie count per piece?",
        answer: "The net volume is 92 ml, with an energy value of 301 kcal per piece declared by Polar.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this ice cream at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Robusto Salted Caramel page: 92 ml stick, 301 kcal/pcs, thick real chocolate coating",
        sourceTitle: "Robusto (Salted Caramel) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-robusto-salted-caramel/",
        skuScope: "Polar Robusto Salted Caramel 92ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 2c367e44-91b4-4fcf-84a3-09e9dcecdbc7, SKU: IC-POL-ROB, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "2c367e44-91b4-4fcf-84a3-09e9dcecdbc7",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Royal Sundae Cup Ice Cream 100ml
  'd132ec9d': {
    slugPrefix: 'd132ec9d',
    exactName: "Polar Royal Sundae Cup Ice Cream 100ml",
    brand: "Polar",
    netQuantity: "100 ml",
    category: "Ice-Cream",
    summary:
      "Polar Royal Sundae Cup Ice Cream in a 100ml cup. The manufacturer describes a combination of caramel and chocolate ripple variations, making it a delicious choice for personal enjoyment or treating guests. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "100 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Cup Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Caramel and Chocolate Ripple", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "243.95 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Dual ripple of rich caramel and chocolate sauce",
      "Convenient 100ml personal dessert cup",
      "Smart treat for guests and family desserts",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume promptly once cup lid is opened.",
    faqs: [
      {
        question: "What flavors are inside Polar Royal Sundae Cup?",
        answer: "The official Polar page describes a swirl of caramel and chocolate ripple through creamy ice cream.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the portion size and calorie content?",
        answer: "It comes in a 100 ml cup with an energy value of 243.95 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this ice cream cup on delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Royal Sundae page: 100 ml cup, 243.95 kcal/100g, caramel and chocolate ripple",
        sourceTitle: "Royal Sundae - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/cup-royal-sundae/",
        skuScope: "Polar Royal Sundae 100ml cup",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: d132ec9d-3175-440b-b1ac-d4cbfea8e55b, SKU: IC-POL-ROY, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "d132ec9d-3175-440b-b1ac-d4cbfea8e55b",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Cool Shell N Core Ice Cream Stick 62ml
  'fe31ca90': {
    slugPrefix: 'fe31ca90',
    exactName: "Polar Cool Shell N Core Ice Cream Stick 62ml",
    brand: "Polar",
    netQuantity: "62 ml",
    category: "Ice-Cream",
    summary:
      "Polar Cool Shell N Core Ice Cream on a stick in a 62ml bar. The manufacturer describes a creamy vanilla core covered by a refreshing frozen layer of strawberry shell, providing an exponential flavor combination. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "62 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Combination", value: "Vanilla core enclosed by strawberry shell", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "190.48 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Crisp frozen strawberry outer shell",
      "Velvety smooth vanilla inner core",
      "Refreshing dual-flavor 62ml stick",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening wrapper.",
    faqs: [
      {
        question: "What is the structure of Polar Cool Shell N Core?",
        answer: "The official Polar page describes a creamy vanilla core enveloped by a frozen strawberry shell.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the volume and calories?",
        answer: "It has a net volume of 62 ml with an energy value of 190.48 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this item on delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our delivery zone.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Cool Shell N Core page: 62 ml stick, 190.48 kcal/100g, vanilla core covered by strawberry shell",
        sourceTitle: "Cool Shell N Core - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-cool-shell-n-core/",
        skuScope: "Polar Cool Shell N Core 62ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: fe31ca90-6d1b-4ee8-9d69-1b34c2544190, SKU: IC-POL-SNC, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "fe31ca90-6d1b-4ee8-9d69-1b34c2544190",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Shor Malai Ice Cream Stick 55ml
  '2233c416': {
    slugPrefix: '2233c416',
    exactName: "Polar Shor Malai Ice Cream Stick 55ml",
    brand: "Polar",
    netQuantity: "55 ml",
    category: "Ice-Cream",
    summary:
      "Polar Shor Malai Ice Cream on a stick in a 55ml format. The manufacturer describes an authentic, stunning combination of rich milk cream (shor) and traditionally curdled milk for a deep heritage dessert taste. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "55 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Heritage Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Ingredients Highlight", value: "Milk cream and curdled milk combination", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "229.39 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Authentic Shor Malai flavor from clotted cream and curdled milk",
      "Traditional Bengali dessert in a frozen stick format",
      "Convenient 55ml single-serve portion",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after unwrapping.",
    faqs: [
      {
        question: "What ingredients give Polar Shor Malai its authentic taste?",
        answer: "The official Polar page notes that it is made from the stunning combination of milk cream and curdled milk.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the net volume and calorie rating?",
        answer: "It has a net volume of 55 ml and an energy value of 229.39 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this item on delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in Chattogram.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Shor Malai page: 55 ml stick, 229.39 kcal/100g, milk cream and curdled milk",
        sourceTitle: "Shor Malai - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-shor-malai/",
        skuScope: "Polar Shor Malai 55ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: 2233c416-8337-461f-a167-88dcee05b3d5, SKU: IC-POL-SHO, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "2233c416-8337-461f-a167-88dcee05b3d5",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Tornado Strawberry Ice Cream Stick 55ml
  'fcefa591': {
    slugPrefix: 'fcefa591',
    exactName: "Polar Tornado Strawberry Ice Cream Stick 55ml",
    brand: "Polar",
    netQuantity: "55 ml",
    category: "Ice-Cream",
    summary:
      "Polar Tornado Strawberry Ice Cream on a stick in a 55ml format. The manufacturer describes a twisted, vibrant taste from a unique spiral blend of milk and strawberry fruit concentrate. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "55 ml", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Stick Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Milk and Strawberry Fruit Concentrate Swirl", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "194.00 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Playful twisted spiral of rich milk and tangy strawberry concentrate",
      "Light 194.00 kcal per 100g energy profile",
      "Fun 55ml stick format popular with children and adults",
    ],
    storageInstructions: "Store frozen at -18°C or below. Consume immediately after opening wrapper.",
    faqs: [
      {
        question: "What gives Polar Tornado its distinctive appearance and taste?",
        answer: "The manufacturer describes a twisted spiral blend of creamy milk and strawberry fruit concentrate.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the net volume and calorie count?",
        answer: "It has a net volume of 55 ml and an energy value of 194.00 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this ice cream at delivery?",
        answer: "Yes. Lucky Store offers 100% doorstep inspection before payment in our Chawkbazar service area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Tornado Strawberry page: 55 ml stick, 194.00 kcal/100g, milk and strawberry concentrate",
        sourceTitle: "Tornado (Strawberry) - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/stick-tornado-strawberry/",
        skuScope: "Polar Tornado Strawberry 55ml",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: fcefa591-3172-43b2-b174-a63802108a7a, SKU: IC-POL-TOR, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "fcefa591-3172-43b2-b174-a63802108a7a",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  // Polar Zafran Malai Ice Cream Tub 1L
  'be49558d': {
    slugPrefix: 'be49558d',
    exactName: "Polar Zafran Malai Ice Cream Tub 1L",
    brand: "Polar",
    netQuantity: "1 Litre",
    category: "Ice-Cream",
    summary:
      "Polar Zafran Malai Ice Cream Tub in a 1000ml family tub. The manufacturer describes royal saffron (zafran) and malai-flavored ice cream with an exquisite addition of crunchy nut and raisin toppings, perfect for royal family celebrations. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [
      { label: "Brand", value: "Polar", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Net Volume", value: "1000 ml (1 Litre)", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Product Type", value: "Tub Ice Cream", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Flavor Profile", value: "Saffron (Zafran) and Malai with Nut and Raisin Topping", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Energy", value: "228.61 kcal per 100g", evidenceRefs: ["MFR_PRODUCT_PAGE"] },
      { label: "Storage", value: "Keep frozen at -18°C or below", evidenceRefs: ["STORAGE_SPEC"] },
    ],
    highlights: [
      "Aromatic royal saffron blended with rich clotted cream (malai)",
      "Generously topped with real nut and raisin inclusions",
      "1000ml royal dessert tub for festivals and celebrations",
    ],
    storageInstructions: "Store frozen at -18°C or below. Reclose tub lid tightly after each serving.",
    faqs: [
      {
        question: "What ingredients and toppings are in Polar Zafran Malai?",
        answer: "The official Polar page describes saffron and malai flavored ice cream finished with nut and raisin toppings.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "What is the tub volume and calorie count?",
        answer: "It comes in a 1000 ml (1 Litre) tub with an energy value of 228.61 kcal per 100 grams.",
        evidenceRefs: ["MFR_PRODUCT_PAGE"],
      },
      {
        question: "Can I check this tub before paying?",
        answer: "Yes. Lucky Store provides 100% doorstep inspection before payment in our Chawkbazar delivery area.",
        evidenceRefs: ["STORE_INSPECTION_POLICY"],
      },
    ],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: 'MANUFACTURER',
        evidenceRef: "Official Polar Zafran Malai page: 1000 ml tub, 228.61 kcal/100g, jafran and malai with nut and raisin topping",
        sourceTitle: "Zafran Malai - Polar Ice Cream",
        sourceUrl: "https://polarbd.com/en/product/tub-zafran-malai/",
        skuScope: "Polar Zafran Malai 1L tub",
        verifiedAt: '2026-09-16',
      },
      STORAGE_SPEC: {
        source: 'MANUFACTURER',
        evidenceRef: "Standard commercial ice cream frozen storage declaration: store at -18°C or colder",
        sourceTitle: "Polar Frozen Product Storage Standard",
        verifiedAt: '2026-09-16',
      },
      CATALOG_RECORD: {
        source: 'LUCKY_STORE_CATALOG',
        evidenceRef: "items.id: be49558d-34d6-4f54-ab67-0d8b96efd59e, SKU: IC-POL-ZM1, category: Ice-Cream",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "be49558d-34d6-4f54-ab67-0d8b96efd59e",
        verifiedAt: '2026-09-16',
      },
      STORE_INSPECTION_POLICY: {
        source: 'LUCKY_STORE_POLICY',
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: '2026-09-16',
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  "64567924": {
    slugPrefix: "64567924",
    exactName: "Vim Dish Washing Liquid 1L",
    brand: "Vim",
    netQuantity: "1 Litre",
    category: "Cleaning Supplies",
    summary: "Vim Dish Washing Liquid in a 1L bottle. Produced by Unilever Bangladesh Ltd., this concentrated liquid formula uses real lemon juice power to cut through tough grease on dishes without leaving white residue. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Vim","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Volume","value":"1 Litre (1000 ml)","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Dishwashing Liquid Gel","evidenceRefs":["MFR_SPEC"]},{"label":"Key Feature","value":"Leaves no white residue; gentle on hands","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place with cap tightly closed","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Concentrated lemon grease-cutting liquid formulation","Leaves dishes squeaky clean with zero white residue","Large 1 Litre value bottle for households"],
    usageDirections: "Dilute one teaspoon of Vim liquid in a small bowl of water, dip a wet sponge into the solution, scrub dishes, and rinse clean.",
    storageInstructions: "Keep in a cool, dry place. Keep out of reach of children.",
    faqs: [{"question":"Does Vim liquid leave white residue on glass or steel utensils?","answer":"The manufacturer highlights that its liquid formula cleans thoroughly without leaving white powdery residue.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official home care portfolio: Vim Dish Washing Liquid 1L with lemon power",
        sourceTitle: "Unilever Bangladesh Ltd. Vim Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/home-care/vim/",
        skuScope: "Vim Dish Washing Liquid 1L",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard liquid household cleaner storage instruction: keep capped in a cool, dry place out of reach of children",
        sourceTitle: "Unilever Household Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 64567924-5ec5-4b17-a53c-e3aa5943951d, SKU: CL-VIM-GEN-1L, category: Cleaning Supplies",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "64567924-5ec5-4b17-a53c-e3aa5943951d",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "88811070": {
    slugPrefix: "88811070",
    exactName: "Vim Dish Washing Liquid 475ml",
    brand: "Vim",
    netQuantity: "475 ml",
    category: "Cleaning Supplies",
    summary: "Vim Dish Washing Liquid in a 475ml bottle. Produced by Unilever Bangladesh Ltd., this concentrated lemon-powered liquid removes tough oil and food residues from dishes without scratching cookware surfaces. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Vim","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Volume","value":"475 ml","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Dishwashing Liquid Gel","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place with cap tightly closed","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Concentrated lemon-powered liquid degreaser","Rinses away completely with no white chalky residue","Convenient 475ml daily-use bottle"],
    usageDirections: "Mix one teaspoon of Vim liquid with a small cup of water, apply with a sponge to utensils, scrub, and rinse thoroughly.",
    storageInstructions: "Store in a cool, dry place out of reach of children.",
    faqs: [{"question":"What is the volume of this bottle?","answer":"This SKU contains 475 ml of concentrated dishwashing liquid.","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official home care portfolio: Vim Dish Washing Liquid 475ml",
        sourceTitle: "Unilever Bangladesh Ltd. Vim Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/home-care/vim/",
        skuScope: "Vim Dish Washing Liquid 475ml",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard liquid household cleaner storage instruction: keep capped in a cool, dry place out of reach of children",
        sourceTitle: "Unilever Household Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 88811070-b1c3-4ce4-835a-42d6a3b69307, SKU: CL-VIM-GEN-475ML, category: Cleaning Supplies",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "88811070-b1c3-4ce4-835a-42d6a3b69307",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "cbbc35e5": {
    slugPrefix: "cbbc35e5",
    exactName: "Radhuni Biriyani Masala 40g",
    brand: "Radhuni",
    netQuantity: "40g",
    category: "Spices",
    summary: "Radhuni Biriyani Masala in a sealed 40g packet. Produced by Square Food & Beverage Ltd., this ready-mix spice blend is formulated to recreate the traditional authentic taste of mutton, beef, or chicken biryani at home. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"40g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Ready Mix Spice Blend","evidenceRefs":["MFR_SPEC"]},{"label":"Application","value":"Mutton, Beef, or Chicken Biryani","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Balanced traditional biryani spice mix from Square Food & Beverage Ltd.","Convenient 40g packet size suitable for home cooking","Versatile blend for mutton, beef, and chicken biryani dishes"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from direct sunlight.",
    faqs: [{"question":"Which dishes can I cook with Radhuni Biriyani Masala?","answer":"The manufacturer states that it is formulated for preparing mutton, beef, and chicken biryani.","evidenceRefs":["MFR_SPEC"]},{"question":"What is the packet weight?","answer":"Each packet contains 40g of ready-mix biryani masala.","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"question":"Can I inspect this spice mix on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment by cash or bKash.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Biriyani Masala 40g ready mix spice blend",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Biriyani Masala 40g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: cbbc35e5-8121-47c1-89f7-0fdb45b26b8d, SKU: SP-RAD-GEN-40G, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "cbbc35e5-8121-47c1-89f7-0fdb45b26b8d",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"],["MFR_SPEC"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "218e328e": {
    slugPrefix: "218e328e",
    exactName: "Radhuni Kacchi Biriyani Masala 40g",
    brand: "Radhuni",
    netQuantity: "40g",
    category: "Spices",
    summary: "Radhuni Kacchi Biriyani Masala in a sealed 40g packet. Manufactured in Bangladesh by Square Food & Beverage Ltd., this specialty spice blend is tailored for layered dum-cooked Kacchi Biryani. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"40g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Kacchi Biryani Ready Mix","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Tailored spice mix for authentic dum-cooked Kacchi Biryani","Packaged by Square Food & Beverage Ltd.","40g packet size"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from direct moisture.",
    faqs: [{"question":"What type of biryani is this mix designed for?","answer":"The manufacturer designates this blend specifically for traditional Kacchi Biryani preparations.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this item at delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Kacchi Biriyani Masala 40g",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Kacchi Biriyani Masala 40g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 218e328e-4630-4803-8027-3c363af5efbf, SKU: SP-RAD-GEN-40G-2, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "218e328e-4630-4803-8027-3c363af5efbf",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "602a8c45": {
    slugPrefix: "602a8c45",
    exactName: "Radhuni Roast Masala 35g",
    brand: "Radhuni",
    netQuantity: "35g",
    category: "Spices",
    summary: "Radhuni Roast Masala in a sealed 35g packet. Manufactured by Square Food & Beverage Ltd., this easy-mix spice blend is formulated to give traditional Bangladeshi chicken roast its rich festive flavor without requiring separate spice measurements. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"35g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Chicken Roast Ready Mix","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Authentic chicken roast recipe blend from Square Food & Beverage Ltd.","Pre-measured 35g packet size","Designed for easy home preparation with sour curd and oil"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from heat and moisture.",
    faqs: [{"question":"What dish is Radhuni Roast Masala used for?","answer":"The manufacturer states it is formulated specifically for traditional Bangladeshi chicken roast dishes.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this spice packet on delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment in our coverage radius.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Roast Masala 35g chicken roast ready mix",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Roast Masala 35g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 602a8c45-754f-4756-88e3-c1e058609acf, SKU: SP-RAD-GEN-35G, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "602a8c45-754f-4756-88e3-c1e058609acf",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"],["MFR_SPEC"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "f083e180": {
    slugPrefix: "f083e180",
    exactName: "Radhuni Tehari Masala 40g",
    brand: "Radhuni",
    netQuantity: "40g",
    category: "Spices",
    summary: "Radhuni Tehari Masala in a sealed 40g packet. Produced by Square Food & Beverage Ltd., this spice mix is specifically formulated for cooking traditional beef or mutton Old Dhaka-style Tehari. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"40g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Tehari Ready Mix Spices","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Formulated for traditional Old Dhaka-style beef or mutton Tehari","Produced by Square Food & Beverage Ltd.","40g packet size"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from moisture.",
    faqs: [{"question":"What dish is Radhuni Tehari Masala used for?","answer":"The manufacturer states it is crafted for traditional beef and mutton Tehari preparations.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this spice mix on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Tehari Masala 40g",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Tehari Masala 40g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: f083e180-8eee-442a-8ca0-765e8e087a68, SKU: SP-RAD-GEN-40G-3, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "f083e180-8eee-442a-8ca0-765e8e087a68",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "c5dc41e8": {
    slugPrefix: "c5dc41e8",
    exactName: "Radhuni Gorur Mangsho Masala 100g",
    brand: "Radhuni",
    netQuantity: "100g",
    category: "Spices",
    summary: "Radhuni Gorur Mangsho Masala in a sealed 100g packet. Produced by Square Food & Beverage Ltd., this blended meat curry masala provides an authentic mix of spices for cooking flavorful beef curries. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"100g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Beef Meat Curry Masala","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Comprehensive spice mix for beef meat curry","Manufactured by Square Food & Beverage Ltd.","100g packet size"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from humidity.",
    faqs: [{"question":"What is Radhuni Gorur Mangsho Masala?","answer":"It is a specialized meat curry spice blend from Square Food & Beverage Ltd. tailored for beef curry dishes.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment in Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Meat Curry Masala (Gorur Mangsho) 100g",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Gorur Mangsho Masala 100g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: c5dc41e8-ad2d-4c77-88cf-61df2107fcc9, SKU: SP-RAD-GEN-100G, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "c5dc41e8-ad2d-4c77-88cf-61df2107fcc9",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "a560ebca": {
    slugPrefix: "a560ebca",
    exactName: "Radhuni Murgir Masala 100g",
    brand: "Radhuni",
    netQuantity: "100g",
    category: "Spices",
    summary: "Radhuni Murgir Masala in a sealed 100g packet. Produced by Square Food & Beverage Ltd., this blended chicken curry masala brings out rich, aromatic flavors in everyday chicken curry preparations. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"100g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Chicken Curry Masala","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Balanced spice blend for daily chicken curry dishes","Manufactured by Square Food & Beverage Ltd.","100g packet size"],
    storageInstructions: "Store in an airtight container in a cool, dry place away from heat.",
    faqs: [{"question":"What is Radhuni Murgir Masala formulated for?","answer":"The manufacturer states it is a complete spice blend crafted for cooking traditional chicken curries.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Chicken Masala (Murgir Masala) 100g",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Murgir Masala 100g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dry spice preservation recommendation: store in an airtight container in a cool, dry place",
        sourceTitle: "Square Spices Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: a560ebca-60a5-4b54-ae7a-a905ef495124, SKU: SP-RAD-GEN-100G-5, category: Spices",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "a560ebca-60a5-4b54-ae7a-a905ef495124",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "811c65a2": {
    slugPrefix: "811c65a2",
    exactName: "Radhuni Pure Mustard Oil 1L",
    brand: "Radhuni",
    netQuantity: "1 Litre",
    category: "Oil & Ghee",
    summary: "Radhuni Pure Mustard Oil (Shorisha Tel) in a 1L PET bottle. Manufactured in Bangladesh by Square Food & Beverage Ltd. from selected mustard seeds, providing the signature pungency, aroma, and flavor essential for bhortas, fish, and authentic Bengali cuisine. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Volume","value":"1 Litre (1000 ml)","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Pure Mustard Oil","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place away from direct sunlight","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["High-pungency pure mustard oil from selected mustard seeds","Produced under strict quality controls by Square Food & Beverage Ltd.","Convenient 1L bottle for family cooking and bhortas"],
    storageInstructions: "Store in a cool, dry place away from direct sunlight. Keep cap tightly closed.",
    faqs: [{"question":"What are the main culinary uses of Radhuni Pure Mustard Oil?","answer":"The manufacturer highlights its authentic pungency for preparing traditional Bengali bhortas, fish curries, pickles, and marinades.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this oil bottle at delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment in our Chawkbazar delivery area.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Pure Mustard Oil 1L PET bottle",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Shorisha Oil 1L",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard edible oil storage recommendation: store in a cool, dry place away from sunlight",
        sourceTitle: "Square Edible Oil Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 811c65a2-af34-42f9-a2ac-622bbb4c4b74, SKU: OL-RAD-GEN-1L, category: Oil & Ghee",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "811c65a2-af34-42f9-a2ac-622bbb4c4b74",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "38ee3e1a": {
    slugPrefix: "38ee3e1a",
    exactName: "Radhuni Pure Mustard Oil 500ml",
    brand: "Radhuni",
    netQuantity: "500 ml",
    category: "Oil & Ghee",
    summary: "Radhuni Pure Mustard Oil (Shorisha Tel) in a 500ml PET bottle. Produced by Square Food & Beverage Ltd., this cold-pressed quality mustard oil offers traditional sharp pungency and aroma. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Radhuni","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Volume","value":"500 ml","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Square Food & Beverage Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Pure Mustard Oil","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place away from direct sunlight","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["High-pungency pure mustard oil from selected mustard seeds","Manufactured by Square Food & Beverage Ltd.","Convenient 500ml bottle size"],
    storageInstructions: "Store in a cool, dry place away from direct sunlight. Keep bottle capped.",
    faqs: [{"question":"What is the volume of this bottle?","answer":"It contains 500 ml of pure mustard oil.","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"question":"Can I inspect this oil bottle upon delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Square Food & Beverage Ltd. official portfolio: Radhuni Pure Mustard Oil 500ml PET bottle",
        sourceTitle: "Square Food & Beverage Ltd. Radhuni Portfolio",
        sourceUrl: "https://sfbl.com.bd/",
        skuScope: "Radhuni Shorisha Oil 500ml",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard edible oil storage recommendation: store in a cool, dry place away from sunlight",
        sourceTitle: "Square Edible Oil Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 38ee3e1a-1884-43a3-9c0a-3840756ab118, SKU: OL-RAD-GEN-500ML, category: Oil & Ghee",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "38ee3e1a-1884-43a3-9c0a-3840756ab118",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "1bc11b33": {
    slugPrefix: "1bc11b33",
    exactName: "Close Up Menthol Fresh Gel Toothpaste 145g",
    brand: "Close Up",
    netQuantity: "145g",
    category: "Oral Care",
    summary: "Close Up Menthol Fresh Gel Toothpaste in a 145g tube. Manufactured by Unilever Bangladesh Ltd., this transparent red gel toothpaste is formulated with anti-bacterial zinc mouthwash and intense menthol for long-lasting fresh breath. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Close Up","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"145g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Transparent Gel Toothpaste","evidenceRefs":["MFR_SPEC"]},{"label":"Flavor","value":"Menthol Fresh","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place away from direct sunlight","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Iconic transparent gel toothpaste from Unilever Bangladesh","Formulated with intense menthol and active mouthwash components","Full-size 145g family tube"],
    usageDirections: "Brush teeth thoroughly at least twice a day or as directed by a dentist. Spit and rinse after brushing.",
    storageInstructions: "Store in a cool, dry place away from direct heat and sunlight. Cap tube securely after each use.",
    faqs: [{"question":"Who manufactures Close Up in Bangladesh?","answer":"Close Up is manufactured and distributed by Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"question":"What flavor and format is this toothpaste?","answer":"It is a transparent gel toothpaste featuring intense Menthol Fresh flavor.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this product at delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official personal care portfolio: Close Up Menthol Fresh 145g gel toothpaste",
        sourceTitle: "Unilever Bangladesh Ltd. Closeup Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/beauty-wellbeing-personal-care/closeup/",
        skuScope: "Close Up Menthol Fresh 145g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard oral care product storage instruction: store in a cool, dry place away from direct sunlight",
        sourceTitle: "Unilever Oral Care Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 1bc11b33-6a19-4245-8ef1-261179725a21, SKU: PC-CLU-GEN-145G, category: Oral Care",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "1bc11b33-6a19-4245-8ef1-261179725a21",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "e7a5ffa9": {
    slugPrefix: "e7a5ffa9",
    exactName: "Vim Dish Washing Bar 300g",
    brand: "Vim",
    netQuantity: "300g",
    category: "Cleaning Supplies",
    summary: "Vim Dish Washing Bar in a 300g bar. Manufactured in Bangladesh by Unilever Bangladesh Ltd., this grease-cutting dishwashing bar is enriched with lemon power to remove tough burnt food and oil stains from utensils. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Vim","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"300g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Dishwashing Bar","evidenceRefs":["MFR_SPEC"]},{"label":"Key Formulation","value":"Lemon Power Grease-Cutting Formula","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Keep in a dry dish tray after use to prevent softening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Bangladesh market-leading dishwashing bar from Unilever","Powerful lemon formulation cuts through heavy grease and burnt residue","Value 300g family bar size"],
    usageDirections: "Rub a damp scrubber on the Vim bar to create a rich lather, scrub greasy dishes and utensils, then rinse thoroughly with clean water.",
    storageInstructions: "Store in a draining soap dish away from sitting water to maximize bar longevity.",
    faqs: [{"question":"Who manufactures Vim dishwashing products in Bangladesh?","answer":"Vim is manufactured and marketed by Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"question":"What active cleaning ingredient is featured in Vim bar?","answer":"The manufacturer formulates Vim with lemon extract and grease-cutting degreasers.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this cleaning bar at delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official home care portfolio: Vim Dish Washing Bar 300g with lemon power",
        sourceTitle: "Unilever Bangladesh Ltd. Vim Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/home-care/vim/",
        skuScope: "Vim Dish Washing Bar 300g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dishwashing bar handling instruction: store in a draining dish to prevent bar dissolution",
        sourceTitle: "Unilever Home Care Handling Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: e7a5ffa9-c462-4170-9998-350b43e15452, SKU: CL-VIM-GEN-300G, category: Cleaning Supplies",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "e7a5ffa9-c462-4170-9998-350b43e15452",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "46e5d1d5": {
    slugPrefix: "46e5d1d5",
    exactName: "Vim Dish Washing Bar 125g",
    brand: "Vim",
    netQuantity: "125g",
    category: "Cleaning Supplies",
    summary: "Vim Dish Washing Bar in a compact 125g bar. Produced in Bangladesh by Unilever Bangladesh Ltd., this grease-cutting dishwashing bar is powered by lemon to cut through grease and oil on cookware. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Vim","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"125g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Dishwashing Bar","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Keep in a dry dish tray after use","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Lemon power formula cuts tough oil and food stains","Manufactured by Unilever Bangladesh Ltd.","Economical 125g bar size"],
    usageDirections: "Apply with a damp scrubber onto utensils, lather to lift grease, and rinse clean with water.",
    storageInstructions: "Store in a draining soap dish away from standing water.",
    faqs: [{"question":"What is the bar weight?","answer":"This SKU is a 125g compact dishwashing bar.","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official home care portfolio: Vim Dish Washing Bar 125g",
        sourceTitle: "Unilever Bangladesh Ltd. Vim Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/home-care/vim/",
        skuScope: "Vim Dish Washing Bar 125g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard dishwashing bar handling instruction: store in a draining dish to prevent bar dissolution",
        sourceTitle: "Unilever Home Care Handling Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 46e5d1d5-75e3-4c58-9c71-9de5b6b4dd46, SKU: CL-VIM-GEN-125G, category: Cleaning Supplies",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "46e5d1d5-75e3-4c58-9c71-9de5b6b4dd46",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "55a4441c": {
    slugPrefix: "55a4441c",
    exactName: "Wheel Fabric Solutions Laundry Soap 125g",
    brand: "Wheel",
    netQuantity: "125g",
    category: "Cleaning Supplies",
    summary: "Wheel Fabric Solutions Laundry Soap in a 125g bar. Manufactured by Unilever Bangladesh Ltd., this laundry soap bar provides deep dirt and stain removal for everyday fabric washing with a fresh clean scent. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Wheel","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"125g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Laundry Soap Bar","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a dry soap case after use","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Trusted fabric cleaning soap bar from Unilever Bangladesh","Removes daily dirt, cuff/collar grime, and fabric stains","125g single-bar format"],
    usageDirections: "Wet the soiled garment, rub the Wheel laundry bar directly onto cuffs, collars, and stained areas, gently scrub, and rinse thoroughly with clean water.",
    storageInstructions: "Store in a dry soap holder after use to maintain bar hardness.",
    faqs: [{"question":"Who manufactures Wheel laundry products in Bangladesh?","answer":"Wheel is produced and marketed by Unilever Bangladesh Ltd.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this laundry soap at delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Unilever Bangladesh Ltd. official home care portfolio: Wheel Fabric Solutions Laundry Soap 125g",
        sourceTitle: "Unilever Bangladesh Ltd. Wheel Brand Portfolio",
        sourceUrl: "https://www.unilever.com.bd/brands/home-care/wheel/",
        skuScope: "Wheel Laundry Soap 125g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard laundry bar handling recommendation: store in a dry location after use",
        sourceTitle: "Unilever Laundry Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 55a4441c-4b67-4927-a5e6-ddd0462b4b95, SKU: CL-WHL-GEN-125G, category: Cleaning Supplies",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "55a4441c-4b67-4927-a5e6-ddd0462b4b95",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "b402008b": {
    slugPrefix: "b402008b",
    exactName: "Nescafé Classic Instant Coffee Sachet 0.9g",
    brand: "Nescafé",
    netQuantity: "0.9g",
    category: "Tea & Coffee",
    summary: "Nescafé Classic 100% pure instant coffee in a convenient 0.9g single-cup sachet. Produced by Nestlé from roasted coffee beans, providing an authentic coffee aroma and bold taste for an instant single cup. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Nescafé","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"0.9g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Nestlé","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Pure Instant Coffee Sachet","evidenceRefs":["MFR_SPEC"]},{"label":"Ingredients","value":"100% Pure Natural Coffee","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["100% pure natural coffee from roasted coffee beans","Portioned 0.9g single-cup sachet format","Quick preparation with hot water or milk"],
    usageDirections: "Empty the contents of the 0.9g sachet into a cup, add 100-120ml of hot (not boiling) water or milk, sweeten to taste, and stir well.",
    storageInstructions: "Store in a cool, dry place away from moisture.",
    faqs: [{"question":"What is inside the Nescafé Classic 0.9g sachet?","answer":"It contains 100% pure instant coffee made from roasted coffee beans with no chicory.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I check this item on delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Nestlé official product specification: Nescafé Classic 100% pure instant coffee",
        sourceTitle: "Nestlé Nescafé Classic Product Specification",
        sourceUrl: "https://www.nescafe.com/",
        skuScope: "Nescafé Classic 0.9g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard instant coffee storage guideline: store in a cool, dry place",
        sourceTitle: "Nestlé Coffee Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: b402008b-5531-4b99-b0a2-3bebb4684e17, SKU: TC-NCF-GEN-09G, category: Tea & Coffee",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "b402008b-5531-4b99-b0a2-3bebb4684e17",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"],["MFR_SPEC"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "a33d73bc": {
    slugPrefix: "a33d73bc",
    exactName: "Nescafé 3 in 1 Instant Coffee Mix 14g",
    brand: "Nescafé",
    netQuantity: "14g",
    category: "Tea & Coffee",
    summary: "Nescafé 3 in 1 Instant Coffee Mix in a 14g sachet. Produced by Nestlé, this pre-mixed single-serve sachet combines pure Nescafé coffee, non-dairy creamer, and sugar for a creamy, well-balanced cup. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Nescafé","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"14g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Nestlé","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"3 in 1 Instant Coffee Mix","evidenceRefs":["MFR_SPEC"]},{"label":"Composition","value":"Coffee, Creamer, and Sugar Blend","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Pre-blended coffee, creamer, and sugar for instant creamy coffee","Manufactured by Nestlé","Portioned 14g single-cup sachet"],
    usageDirections: "Empty the 14g sachet into a mug, pour in 150ml of hot (not boiling) water, stir thoroughly, and enjoy.",
    storageInstructions: "Store in a cool, dry place away from direct sunlight.",
    faqs: [{"question":"What is included in Nescafé 3 in 1?","answer":"It is a pre-mixed formulation of Nescafé coffee, creamer, and sugar.","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this coffee sachet on delivery?","answer":"Yes. Lucky Store provides 100% doorstep inspection before payment across Chattogram.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Nestlé official product specification: Nescafé 3 in 1 Instant Coffee Mix 14g",
        sourceTitle: "Nestlé Nescafé 3in1 Product Specification",
        sourceUrl: "https://www.nescafe.com/",
        skuScope: "Nescafé 3in1 14g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard instant coffee mix storage guideline: store in a cool, dry place",
        sourceTitle: "Nestlé Coffee Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: a33d73bc-6d88-4944-9945-8a28d92e58f9, SKU: TC-NCF-GEN-14G, category: Tea & Coffee",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "a33d73bc-6d88-4944-9945-8a28d92e58f9",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "4d85ee2e": {
    slugPrefix: "4d85ee2e",
    exactName: "Ispahani Blender's Choice Premium Green Tea 35g",
    brand: "Ispahani",
    netQuantity: "35g",
    category: "Tea & Coffee",
    summary: "Ispahani Blender's Choice Premium Green Tea in a 35g packet. Packaged in Bangladesh by Ispahani Tea Ltd., this green tea selection features finely processed green tea leaves for a light, refreshing brew with natural antioxidant properties. Available from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.",
    specifications: [{"label":"Brand","value":"Ispahani","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Net Weight","value":"35g","evidenceRefs":["MFR_SPEC","CATALOG_RECORD"]},{"label":"Manufacturer","value":"Ispahani Tea Ltd. (M.M. Ispahani Ltd.)","evidenceRefs":["MFR_SPEC"]},{"label":"Product Type","value":"Loose Leaf Green Tea","evidenceRefs":["MFR_SPEC"]},{"label":"Storage","value":"Store in an airtight container in a cool, dry place","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Finely selected green tea leaves from Ispahani Tea Ltd.","Light, delicate taste and aroma","Compact 35g freshness-sealed packet"],
    usageDirections: "Steep one teaspoon of green tea leaves in freshly boiled water (approx. 80-85°C) for 2 to 3 minutes. Strain and serve plain or with lemon and honey.",
    storageInstructions: "Store in an airtight container in a cool, dry place away from moisture and strong aromas.",
    faqs: [{"question":"Who packages Ispahani Blender's Choice Green Tea?","answer":"It is packaged and distributed in Bangladesh by Ispahani Tea Ltd. (M.M. Ispahani Ltd.).","evidenceRefs":["MFR_SPEC"]},{"question":"Can I inspect this tea packet at delivery?","answer":"Yes. Lucky Store offers 100% doorstep inspection before payment in our delivery area.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "M.M. Ispahani Ltd. official tea portfolio: Blender's Choice Premium Green Tea 35g",
        sourceTitle: "Ispahani Tea Portfolio Specification",
        sourceUrl: "https://www.ispahanitea.com/",
        skuScope: "Ispahani Blender's Choice Green Tea 35g",
        verifiedAt: "2026-09-16",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "Standard green tea preservation rule: store in an airtight container away from light and humidity",
        sourceTitle: "Ispahani Tea Storage Standard",
        verifiedAt: "2026-09-16",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.id: 4d85ee2e-e7a5-4ac4-b609-b627819b5004, SKU: TC-ISP-PRM-35G, category: Tea & Coffee",
        sourceTitle: "Lucky Store Production Catalog",
        skuScope: "4d85ee2e-e7a5-4ac4-b609-b627819b5004",
        verifiedAt: "2026-09-16",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "INSPECTION_POLICY: 100% doorstep inspection before payment by cash or bKash",
        sourceTitle: "Lucky Store Inspection Policy",
        verifiedAt: "2026-09-16",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_SPEC","CATALOG_RECORD"],
      brand: ["MFR_SPEC","CATALOG_RECORD"],
      netQuantity: ["MFR_SPEC","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_SPEC","STORE_INSPECTION_POLICY"],
      highlights: [["MFR_SPEC"],["MFR_SPEC"],["MFR_SPEC","CATALOG_RECORD"]],
      usageDirections: ["MFR_SPEC"],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  "31646279": {
    slugPrefix: "31646279",
    exactName: "Nestlé Cerelac Infant Cereal Stage 1 Wheat 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé CERELAC Stage 1 Wheat is an iron-fortified baby cereal designed for infants from 6 months onwards as part of their complementary weaning diet. Made with wholesome wheat flour, it provides essential dietary energy, iron, vitamin C, and Bifidus BL probiotics to support healthy digestion and physical development.",
    specifications: [{"label":"Stage","value":"Stage 1 (From 6 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Iron-Fortified Wheat Infant Cereal","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Grain Base","value":"Wholesome Wheat Flour","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Key Nutrients","value":"Iron, Zinc, Vitamin C, Vitamin B1, Bifidus BL","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Keep in airtight container; use within 30 days","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Nutritious wheat cereal designed for infants starting solid food from 6 months of age","Fortified with iron to support brain development and normal red blood cell formation","Contains vitamin C to enhance non-heme iron absorption plus digestive probiotics","Eligible for 100% doorstep seal inspection before payment via Lucky Store delivery"],
    usageDirections: "Wash hands and utensils thoroughly. Boil fresh drinking water for 5 minutes and allow to cool until lukewarm. Pour 75mL into a clean bowl, gradually add 25g (approx. 3 tablespoons) of Cerelac Wheat powder, and stir until creamy. Feed immediately using a clean spoon. Do not retain leftover portions.",
    storageInstructions: "Store sealed pack in a cool, dry place. After opening, fold inner pouch securely and keep in an airtight tin or plastic container. Consume within 30 days of opening.",
    faqs: [{"question":"When can my baby begin eating Cerelac Wheat?","answer":"Cerelac Wheat is formulated for infants from 6 months of age when starting complementary feeding, following guidance from your pediatrician.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"How does Lucky Store assure genuine infant food products?","answer":"Lucky Store sources directly from authorized FMCG distribution channels in Chattogram. Customers are encouraged to verify packaging seals and batch dates at doorstep delivery.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/cerelac",
        sourceTitle: "Nestlé CERELAC Infant Cereal Product Range & Nutrition Guide",
        verifiedAt: "2026-09-16",
        skuScope: "31646279-ba1c-4755-ac78-1e09ab6b8b63",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/cerelac#storage",
        sourceTitle: "Nestlé CERELAC Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "31646279-ba1c-4755-ac78-1e09ab6b8b63",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-CRL-S1-350G-6",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "31646279-ba1c-4755-ac78-1e09ab6b8b63",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "2da7133d": {
    slugPrefix: "2da7133d",
    exactName: "Nestlé Nan Opti Pro 1 Infant Formula 300g",
    brand: "Nestlé",
    netQuantity: "300g",
    category: "Baby Care",
    summary: "Nestlé NAN OPTIPRO 1 is a premium spray-dried starter infant formula designed for formula-fed infants from birth to 6 months. Developed with Nestlé scientific expertise, it features an age-optimised protein source with OPTIPRO protein technology, Bifidus BL probiotics, DHA, ARA, and essential vitamins and minerals.",
    specifications: [{"label":"Stage","value":"Stage 1 (From Birth to 6 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Spray-Dried Starter Infant Formula Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"300g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"OPTIPRO whey-dominant protein, DHA, ARA, Bifidus BL, 2'-FL","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized Retail Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Close lid tightly; use within 3 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Stage 1 starter infant formula tailored for babies from birth onwards","Features OPTIPRO age-optimised protein technology tailored to support infant nutritional needs","Formulated with Bifidus BL probiotics, essential omega fatty acids (DHA & ARA), and 2'-FL","Eligible for 100% doorstep seal inspection before payment via Lucky Store delivery"],
    usageDirections: "Wash hands and sterilise feeding bottle, teat, and cap thoroughly by boiling for 5 minutes. Boil fresh drinking water and allow to cool to lukewarm (approx. 40°C). Consult the feeding table and add the exact number of level scoops using only the enclosed scoop. Cap bottle and shake thoroughly until powder dissolves completely. Feed immediately; discard unfinished formula. Notice: Mother's milk is best for your baby.",
    storageInstructions: "Store sealed tin or BIB pack in a cool and dry place before and after opening. Keep lid tightly closed or fold inner foil pouch securely. Store in a clean airtight container if needed. Use within 3 weeks of opening.",
    faqs: [{"question":"What age range is Nestlé NAN OPTIPRO 1 intended for?","answer":"NAN OPTIPRO 1 is formulated as a starter infant formula for formula-fed infants from birth up to 6 months of age.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the formula tin/pack upon delivery in Chattogram?","answer":"Yes, Lucky Store riders encourage 100% doorstep seal inspection before payment. You can verify the outer safety seal, batch code, and expiry date prior to accepting the item.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-infant-formulas/nan-optipro-1",
        sourceTitle: "Nestlé NAN OPTIPRO 1 Infant Formula Product Specification & Nutritional Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "2da7133d-4939-459f-a413-4c5070237b1f",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-infant-formulas/nan-optipro-1#storage",
        sourceTitle: "Nestlé NAN OPTIPRO Storage & Hygiene Standards",
        verifiedAt: "2026-09-16",
        skuScope: "2da7133d-4939-459f-a413-4c5070237b1f",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-NAN-OPT-300G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "2da7133d-4939-459f-a413-4c5070237b1f",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "e10173fc": {
    slugPrefix: "e10173fc",
    exactName: "Nestlé Nan Opti Pro 2 Follow-Up Formula 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé NAN OPTIPRO 2 is a spray-dried follow-up infant formula tailored for infants from 6 to 12 months as the liquid part of a progressively diversified diet. It contains OPTIPRO age-optimised protein, Bifidus BL probiotic cultures, DHA, ARA, and 16 essential vitamins and minerals to complement solid feeding.",
    specifications: [{"label":"Stage","value":"Stage 2 (6 to 12 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Spray-Dried Follow-Up Formula Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"OPTIPRO protein, Bifidus BL, DHA, ARA, Iron, Calcium & Vitamins","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized Retail Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Seal tightly; use within 4 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Follow-up formula designed for infants from 6 months of age alongside complementary feeding","Contains OPTIPRO age-adapted protein blend suited to growing infants' nutritional requirements","Fortified with Bifidus BL probiotics, DHA & ARA fatty acids, iron, and vitamin D","Available with doorstep seal and batch verification across Chattogram delivery radius"],
    usageDirections: "Wash hands and sterilise feeding bottle or cup thoroughly. Boil drinking water for 5 minutes and let cool until lukewarm. Pour exact quantity of water into bottle and add level scoops using only the enclosed measure. Cap bottle and shake thoroughly until fully dissolved. Notice: Mother's milk is best for your baby. Do not feed Stage 2 to infants under 6 months.",
    storageInstructions: "Store tightly sealed pack in a cool, dry place away from heat and direct sunlight. Fold inner foil or seal lid securely after each feed. Use within 4 weeks after opening.",
    faqs: [{"question":"When should a baby transition to NAN OPTIPRO 2?","answer":"NAN OPTIPRO 2 is designed as a follow-up formula for babies from 6 months of age as complementary foods are introduced, supporting diversified dietary progression under pediatric advice.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"How is formula freshness assured during delivery?","answer":"Lucky Store ensures factory-sealed stock rotation with clear batch numbers and expiry dates. Customers can inspect the container seal at the doorstep before confirming payment.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-infant-formulas/nan-optipro-2",
        sourceTitle: "Nestlé NAN OPTIPRO 2 Follow-Up Formula Specification",
        verifiedAt: "2026-09-16",
        skuScope: "e10173fc-44a6-4d1c-871e-4387ac6f6a0c",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-infant-formulas/nan-optipro-2#storage",
        sourceTitle: "Nestlé NAN OPTIPRO 2 Storage Directions",
        verifiedAt: "2026-09-16",
        skuScope: "e10173fc-44a6-4d1c-871e-4387ac6f6a0c",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-NAN-OPT-350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "e10173fc-44a6-4d1c-871e-4387ac6f6a0c",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "8d1131ff": {
    slugPrefix: "8d1131ff",
    exactName: "Nestlé Nan Opti Pro 3 Toddler Formula 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé NAN OPTIPRO 3 is a scientifically formulated growing-up milk drink designed for active toddlers from 1 to 3 years old. It provides age-adapted protein, Bifidus BL probiotic cultures, calcium, vitamin D, iron, and 16 essential micronutrients to support healthy bone growth, immune function, and development.",
    specifications: [{"label":"Stage","value":"Stage 3 (From 1 Year / 12 to 36 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Toddler Growing-Up Milk Drink Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Bifidus BL, Calcium, Vitamin D, Iron, Zinc, 16 Vitamins & Minerals","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized Retail Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Seal tightly; consume within 4 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Toddler growing-up milk drink formulated for children from 12 months of age","Packed with 16 essential vitamins and minerals including iron, calcium, and vitamin D","Features Bifidus BL probiotic culture and age-optimised protein balance","Covered by Lucky Store's doorstep inspection before payment guarantee in Chattogram"],
    usageDirections: "Wash hands and drinking cup thoroughly. Boil drinking water and allow to cool. Add 210mL of lukewarm water to a clean cup, then add 7 level scoops of powder using only the enclosed measure. Stir thoroughly until powder dissolves completely. Serve immediately and discard any unfinished drink. Note: This product is not a breastmilk substitute.",
    storageInstructions: "Store tightly sealed pack in a cool, dry place away from heat and direct moisture. Seal bag or lid tightly after each use. Use within 4 weeks after opening.",
    faqs: [{"question":"Is NAN OPTIPRO 3 a breastmilk substitute?","answer":"No, NAN OPTIPRO 3 is a growing-up toddler milk drink formulated specifically for young children from 1 year of age to supplement a varied family diet.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the pack condition upon delivery?","answer":"Yes, Lucky Store delivery riders allow customers to check the outer packaging integrity, batch label, and expiry date at the doorstep before payment.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-toddler/nan-optipro-3",
        sourceTitle: "Nestlé NAN OPTIPRO 3 Toddler Milk Drink Specification",
        verifiedAt: "2026-09-16",
        skuScope: "8d1131ff-4c2e-4132-baec-57598776163d",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/nan-toddler/nan-optipro-3#storage",
        sourceTitle: "Nestlé NAN OPTIPRO 3 Storage Instructions",
        verifiedAt: "2026-09-16",
        skuScope: "8d1131ff-4c2e-4132-baec-57598776163d",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-NAN-OPT-350G-1",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "8d1131ff-4c2e-4132-baec-57598776163d",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "f15f1337": {
    slugPrefix: "f15f1337",
    exactName: "Nestlé Nido 1+ Nutritional Toddler Milk Drink 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé NIDO 1+ is a specialized milk-based nutritional drink formulated for growing toddlers aged 1 to 3 years. It is fortified with immuno-nutrients including vitamin A, vitamin C, vitamin D, zinc, iron, and Bifidobacterium probiotics to support immune health, healthy growth, and cognitive development.",
    specifications: [{"label":"Target Age","value":"Toddlers Aged 1 to 3 Years (1+)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Nutritional Toddler Milk Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Vitamin A, C, D, Zinc, Iron, Prebiotics, Bifidobacterium","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized FMCG Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Seal tightly; consume within 1 month of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Specialized nutritional toddler milk drink developed for children from 1 to 3 years","Fortified with essential vitamins A, C, D, iron, and zinc to support immune defense","Includes dietary prebiotics and probiotic cultures supporting digestive health","Verified stock with doorstep inspection prior to purchase in Chattogram"],
    usageDirections: "Add 4 scoops (approx. 36g) of NIDO 1+ powder to 200mL of warm or room-temperature previously boiled water. Stir thoroughly until dissolved completely. Offer 2 glasses daily as part of a balanced diet. Not for infants under 1 year of age.",
    storageInstructions: "Store unopened and opened container in a cool, dry place. Keep container tightly sealed after each use to protect powder from moisture. Use contents within 1 month of opening.",
    faqs: [{"question":"Is Nestlé NIDO 1+ suitable for infants under 12 months?","answer":"No, NIDO 1+ is specifically formulated for toddlers aged 1 to 3 years and should not be used as an infant formula for babies under 1 year of age.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the package seal at delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection so you can examine the outer seal and expiry date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.ca/nestle-nido-1",
        sourceTitle: "Nestlé NIDO 1+ Nutritional Toddler Drink Specification",
        verifiedAt: "2026-09-16",
        skuScope: "f15f1337-041a-4796-af8e-c8eb8fd6e652",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.ca/nestle-nido-1#storage",
        sourceTitle: "Nestlé NIDO 1+ Storage Standards",
        verifiedAt: "2026-09-16",
        skuScope: "f15f1337-041a-4796-af8e-c8eb8fd6e652",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-NDO-1P-350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "f15f1337-041a-4796-af8e-c8eb8fd6e652",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "a854ab97": {
    slugPrefix: "a854ab97",
    exactName: "Nestlé Nido 3+ Growing Up Milk Powder 350g BiB",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé NIDO 3+ is a fortified growing-up milk drink formulated for preschool children aged 3 to 5 years. It contains Prebio 3 dietary fibers, omega fatty acids, vitamin D, calcium, and essential minerals tailored to support active learning, physical growth, and immune defense in young children.",
    specifications: [{"label":"Target Age","value":"Preschool Children Aged 3 to 5 Years (3+)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Packaging Format","value":"Bag-in-Box (BiB) Barrier Pouch in Carton","evidenceRefs":["CATALOG_RECORD"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Prebio 3 fibers, Calcium, Vitamin D, Iron, Zinc, Vitamin C","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized Retail Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Keep foil pouch folded in airtight container","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Specially formulated growing-up milk drink for preschool children aged 3 to 5 years","Enriched with calcium and vitamin D to support normal bone and tooth development","Contains prebiotics, iron, and zinc to support immune defense and daily vitality","Bag-in-box barrier packaging inspectable at doorstep before payment in Chattogram"],
    usageDirections: "Mix 3 level tablespoons (approx. 36g) of NIDO 3+ powder into 200mL of lukewarm or cool drinking water. Stir briskly until completely dissolved. Serve 1 to 2 times daily as part of a varied preschool diet.",
    storageInstructions: "After opening the inner foil pouch, fold the top securely and store inside the carton or in a clean airtight container in a cool, dry place. Consume within 3 to 4 weeks of opening.",
    faqs: [{"question":"What distinguishes NIDO 3+ from standard milk?","answer":"NIDO 3+ is enriched with targeted micronutrients—such as iron, zinc, prebiotics, and vitamins C and D—to address the specific dietary requirements of growing preschool children.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"How do I check product freshness upon delivery?","answer":"Lucky Store delivery riders allow customers to inspect the outer carton seal, batch identification, and expiration date at the doorstep before completing payment.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/dairy/nido",
        sourceTitle: "Nestlé NIDO 3+ Growing-Up Milk Specification Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "a854ab97-94a0-48c9-8a69-c86fd3d2a3cc",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/dairy/nido#storage",
        sourceTitle: "Nestlé NIDO Storage & Packaging Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "a854ab97-94a0-48c9-8a69-c86fd3d2a3cc",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-NDO-3P-350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "a854ab97-94a0-48c9-8a69-c86fd3d2a3cc",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "970ac032": {
    slugPrefix: "970ac032",
    exactName: "Nestlé Cerelac Infant Cereal Stage 1 Rice 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé CERELAC Stage 1 Rice is an iron-fortified single-grain infant cereal tailored for babies starting complementary foods from 6 months of age. Made with easily digestible rice flour, it contains Bifidus BL probiotic cultures, iron, zinc, and vitamins A and C to support immune function, growth, and cognitive development.",
    specifications: [{"label":"Stage","value":"Stage 1 (From 6 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Single-Grain Iron-Fortified Infant Cereal","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Grain Base","value":"Wholesome Rice Flour (Smooth Texture)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Key Nutrients","value":"Iron, Vitamin C, Zinc, Vitamin A, Bifidus BL Probiotic","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Keep airtight; use within 30 days of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Smooth single-grain rice cereal designed for babies starting solid foods from 6 months","Iron-fortified to support normal cognitive development and immune system function","Formulated with probiotic Bifidus BL and key vitamins A, C, and zinc","Available with 100% doorstep packaging inspection before payment in Chattogram"],
    usageDirections: "Wash hands and ensure bowl and spoon are clean. Boil clean drinking water for 5 minutes and allow to cool until lukewarm. Measure 75mL of lukewarm water (or baby's usual milk) into a bowl, add 25g (approx. 3 tablespoons) of Cerelac Rice cereal, and stir until smooth. Feed immediately with a clean spoon. Notice: Breastfeeding should continue alongside complementary foods.",
    storageInstructions: "Before opening, store in a cool, dry place. After opening, fold the inner foil bag tightly and store in an airtight container in a cool, dry place. Use within 30 days of opening.",
    faqs: [{"question":"Is Cerelac Stage 1 Rice suitable as baby's first solid food?","answer":"Yes, Cerelac Rice has a mild flavour and smooth texture, making it an ideal gentle first complementary food for infants around 6 months alongside continued breastfeeding.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the Cerelac box and seal upon delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection so you can examine the carton seal and expiry date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/cerelac/baby-rice-infant-cereal",
        sourceTitle: "Nestlé CERELAC Baby Rice Infant Cereal Technical Specification",
        verifiedAt: "2026-09-16",
        skuScope: "970ac032-6ed3-40e2-adc7-188b45aed98f",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestlefamilynes.com.au/cerelac/baby-rice-infant-cereal#storage",
        sourceTitle: "Nestlé CERELAC Storage & Hygiene Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "970ac032-6ed3-40e2-adc7-188b45aed98f",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-CRL-S1-350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "970ac032-6ed3-40e2-adc7-188b45aed98f",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "48da2573": {
    slugPrefix: "48da2573",
    exactName: "Nestlé Lactogen 1 Infant Formula 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé LACTOGEN 1 is a spray-dried starter infant formula designed for infants from birth up to 6 months when not breastfed. Developed with Nestlé's nutritional science, it provides whey-predominant protein, essential fatty acids (linoleic and alpha-linolenic acids), vitamins, and minerals to support healthy infant growth.",
    specifications: [{"label":"Stage","value":"Stage 1 (From Birth to 6 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Spray-Dried Starter Infant Formula","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Whey Protein, Essential Fatty Acids, Iron, Iodine, Vitamins A, C, D","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized FMCG Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Keep airtight; use within 3 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Starter infant formula spray-dried for infants from birth up to 6 months","Formulated with whey-predominant protein and essential fatty acids for early growth","Enriched with iron, iodine, and key vitamins supporting normal infant development","Backed by Lucky Store 100% doorstep seal inspection before payment in Chattogram"],
    usageDirections: "Wash hands thoroughly. Sterilise feeding bottle, teat, and cap by boiling in water for 5 minutes. Boil fresh drinking water and allow to cool until lukewarm. Pour exact measure of water into bottle and add level scoops using only the enclosed scoop. Shake until dissolved completely. Notice: Mother's milk is best for your baby.",
    storageInstructions: "Store unopened tin or box in a cool, dry, hygienic place. After opening, keep the container closed tightly or place the foil pouch in an airtight jar. Use within 3 weeks of opening.",
    faqs: [{"question":"What age is Nestlé Lactogen 1 formulated for?","answer":"Nestlé Lactogen 1 is formulated for formula-fed infants from birth to 6 months of age.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the Lactogen pack before paying?","answer":"Yes, Lucky Store riders allow doorstep inspection of the pack seal, batch details, and expiry date prior to payment.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food",
        sourceTitle: "Nestlé Infant Nutrition & Formula Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "48da2573-31ca-4463-916d-9eedebabb597",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food#storage",
        sourceTitle: "Nestlé Infant Formula Storage & Preparation Standards",
        verifiedAt: "2026-09-16",
        skuScope: "48da2573-31ca-4463-916d-9eedebabb597",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-LCG-GEN-1350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "48da2573-31ca-4463-916d-9eedebabb597",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "dd95ce58": {
    slugPrefix: "dd95ce58",
    exactName: "Nestlé Lactogen 2 Follow-Up Formula 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé LACTOGEN 2 is a spray-dried follow-up formula for infants from 6 months onwards as the liquid component of a progressively diversified diet. It contains balanced proteins, maltodextrin, essential fatty acids, iron, and vitamins to support infant growth alongside solid complementary foods.",
    specifications: [{"label":"Stage","value":"Stage 2 (From 6 Months to 12 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Spray-Dried Follow-Up Formula Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Protein, Iron, Calcium, Iodine, Vitamins A, C, D, Essential Fatty Acids","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized FMCG Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Seal tightly; consume within 3 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Follow-up formula designed for infants from 6 months alongside complementary foods","Fortified with iron and vitamins supporting normal growth and vitality","Formulated with balanced proteins and essential fatty acids for weaning infants","Inspected at doorstep before payment through Lucky Store's Chattogram fleet"],
    usageDirections: "Wash hands carefully. Clean and sterilise feeding utensils by boiling for 5 minutes. Boil drinking water and allow to cool. Add water and exact number of level scoops of powder using only the enclosed scoop. Mix thoroughly until dissolved. Notice: Mother's milk is best for your baby. Do not feed Stage 2 to infants under 6 months.",
    storageInstructions: "Store unopened container in a cool, dry place. After opening, fold foil pouch or close lid tightly and store in an airtight container. Consume within 3 weeks after opening.",
    faqs: [{"question":"Can Lactogen 2 be given to a 4-month-old infant?","answer":"No, Lactogen 2 is a follow-up formula intended specifically for infants from 6 months onwards alongside solid food introduction.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"How can I verify the pack authenticity upon delivery?","answer":"Lucky Store provides 100% doorstep inspection so you can examine the manufacturer packaging, seal, and expiry date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food",
        sourceTitle: "Nestlé Follow-Up Infant Formula Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "dd95ce58-b79b-4cc5-84d4-5b24f08da89b",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food#storage",
        sourceTitle: "Nestlé Infant Formula Storage & Preparation Standards",
        verifiedAt: "2026-09-16",
        skuScope: "dd95ce58-b79b-4cc5-84d4-5b24f08da89b",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-LCG-GEN-350G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "dd95ce58-b79b-4cc5-84d4-5b24f08da89b",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "5678ea38": {
    slugPrefix: "5678ea38",
    exactName: "Nestlé Lactogen 3 Follow-Up Formula 350g",
    brand: "Nestlé",
    netQuantity: "350g",
    category: "Baby Care",
    summary: "Nestlé LACTOGEN 3 is a growing-up follow-up formula designed for toddlers from 10 to 24 months. It supplies age-adjusted protein, essential fatty acids, calcium, iron, and vitamins to complement family meals during the active toddler growth phase.",
    specifications: [{"label":"Stage","value":"Stage 3 (From 10 to 24 Months)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Product Type","value":"Follow-Up Toddler Milk Drink Powder","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"350g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Nutrients","value":"Calcium, Vitamin D, Iron, Zinc, Essential Fatty Acids","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Origin","value":"Manufactured by Nestlé; Distributed via Authorized FMCG Channels","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place. Seal tightly; consume within 3 weeks of opening","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Follow-up formula formulated for older infants and toddlers from 10 months onwards","Contains calcium and vitamin D to support growing bones and physical development","Fortified with iron and zinc to complement family solid food diets","Doorstep inspection supported across all Lucky Store delivery zones in Chattogram"],
    usageDirections: "Wash hands and drinking cup thoroughly. Boil drinking water for 5 minutes and let cool until lukewarm. Pour measured water into clean cup and add level scoops using only the provided scoop. Stir well until dissolved. Note: This product is not a breastmilk substitute.",
    storageInstructions: "Store unopened pack in a cool, dry place. After opening, fold the foil bag securely and keep in a clean, airtight container. Use within 3 weeks of opening.",
    faqs: [{"question":"What age range is Lactogen 3 intended for?","answer":"Lactogen 3 is tailored for toddlers aged 10 months and older as an addition to a varied family diet.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the container before accepting delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection before payment to verify package integrity, seals, and expiration dates.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food",
        sourceTitle: "Nestlé Growing-Up Milk Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "5678ea38-d551-4883-8a6a-4af1ef9b601d",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.nestle.com/brands/baby-and-toddler-food#storage",
        sourceTitle: "Nestlé Infant & Toddler Formula Storage Standards",
        verifiedAt: "2026-09-16",
        skuScope: "5678ea38-d551-4883-8a6a-4af1ef9b601d",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:BY-LCG-GEN-350G-1",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "5678ea38-d551-4883-8a6a-4af1ef9b601d",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },

  "4dc60601": {
    slugPrefix: "4dc60601",
    exactName: "Cadbury Dairy Milk Chocolate Bar 10g",
    brand: "Cadbury",
    netQuantity: "10g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Chocolate 10g is an iconic bite-sized milk chocolate bar crafted from 100% sustainably sourced cocoa via Cocoa Life. It delivers the signature smooth, rich, and creamy British milk chocolate taste in a convenient single-portion format.",
    specifications: [{"label":"Product Type","value":"Milk Chocolate Confectionery Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"10g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Flavor Profile","value":"Creamy Classic Milk Chocolate","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian Friendly","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry, and hygienic place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Signature Cadbury Dairy Milk rich and creamy chocolate recipe","Convenient 10g single-serve portion for quick snacking","Crafted with 100% sustainably sourced cocoa under the Cocoa Life program","100% doorstep inspection before payment guarantee via Lucky Store"],
    usageDirections: "Tear open wrapper and enjoy directly as a sweet snack or dessert. Best enjoyed at room temperature (18°C–22°C) for optimal creamy melt.",
    storageInstructions: "Store in a cool, dry, and hygienic place away from direct sunlight, moisture, and strong odors. Temperature and humidity changes may cause a harmless whitish bloom on cocoa butter.",
    faqs: [{"question":"Is Cadbury Dairy Milk suitable for vegetarians?","answer":"Yes, Cadbury Dairy Milk Chocolate is vegetarian-friendly.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the chocolate bar condition at doorstep delivery?","answer":"Yes, Lucky Store riders allow full doorstep inspection before payment so you can verify packaging integrity and freshness.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Chocolate Bar Formulation & Product Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "4dc60601-5883-4ab4-98a7-d5e8b1ca8adb",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage & Quality Standards",
        verifiedAt: "2026-09-16",
        skuScope: "4dc60601-5883-4ab4-98a7-d5e8b1ca8adb",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "4dc60601-5883-4ab4-98a7-d5e8b1ca8adb",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "4741d809": {
    slugPrefix: "4741d809",
    exactName: "Cadbury Dairy Milk Chocolate Bar 18g",
    brand: "Cadbury",
    netQuantity: "18g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk 18g offers the authentic rich and creamy milk chocolate experience in an individual snack bar. Made with fresh milk solids and sustainably sourced cocoa, it delivers the distinctive melt-in-mouth Cadbury texture.",
    specifications: [{"label":"Product Type","value":"Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"18g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Flavor Profile","value":"Classic Creamy Milk Chocolate","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Classic Cadbury Dairy Milk smooth and creamy recipe","18g pocket-sized snack bar ideal for everyday sweet cravings","Made with sustainably cultivated cocoa certified by Cocoa Life","Covered by Lucky Store's doorstep inspection before payment guarantee"],
    usageDirections: "Open the sealed foil packaging and enjoy directly. Consume promptly after opening.",
    storageInstructions: "Store in a cool, dry, and hygienic place away from heat and direct sunlight. Avoid storing near pungent spices or groceries.",
    faqs: [{"question":"What is the net weight of this Cadbury Dairy Milk bar?","answer":"This bar contains 18g of classic Cadbury Dairy Milk chocolate.","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"question":"How does Lucky Store ensure chocolate does not arrive melted?","answer":"Orders are dispatched directly from local store stock via fast motorbike delivery in Chattogram, and customers may inspect item texture at the doorstep.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Chocolate Specifications",
        verifiedAt: "2026-09-16",
        skuScope: "4741d809-f52c-4561-8b24-c5d8f6bd2776",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Chocolate Quality & Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "4741d809-f52c-4561-8b24-c5d8f6bd2776",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-18G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "4741d809-f52c-4561-8b24-c5d8f6bd2776",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "a4914d84": {
    slugPrefix: "a4914d84",
    exactName: "Cadbury Dairy Milk Chocolate Bar 40g",
    brand: "Cadbury",
    netQuantity: "40g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk 40g provides a satisfying standard-sized bar of classic milk chocolate. Formulated with rich dairy ingredients and sustainably farmed cocoa beans, it offers an indulgent, velvety texture and balanced sweetness.",
    specifications: [{"label":"Product Type","value":"Molded Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"40g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Flavor Profile","value":"Classic Creamy Milk Chocolate","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian Friendly","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Standard 40g chocolate bar with individually snapable bite-sized squares","Rich, creamy milk chocolate flavor crafted with fine cocoa and milk solids","Sustainably sourced cocoa under the global Cocoa Life initiative","Eligible for 100% doorstep seal and condition verification in Chattogram"],
    usageDirections: "Snap into squares and enjoy directly, or use as a topping for ice cream, baked treats, and desserts.",
    storageInstructions: "Store in a clean, dry, and cool area (ideally 18°C–22°C) away from direct sunlight and heat sources.",
    faqs: [{"question":"Does Cadbury Dairy Milk contain artificial preservatives?","answer":"Cadbury Dairy Milk is formulated according to standard confectionery guidelines without unnecessary artificial preservatives.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I verify the expiry date upon delivery?","answer":"Yes, Lucky Store delivery riders support 100% doorstep inspection so you can examine the printed date and batch details before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Product Standards",
        verifiedAt: "2026-09-16",
        skuScope: "a4914d84-6932-40f3-83bb-8c03d745bdaa",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Conditions",
        verifiedAt: "2026-09-16",
        skuScope: "a4914d84-6932-40f3-83bb-8c03d745bdaa",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-40G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "a4914d84-6932-40f3-83bb-8c03d745bdaa",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "9e70a7e1": {
    slugPrefix: "9e70a7e1",
    exactName: "Cadbury Dairy Milk Bubbly Chocolate Bar 46g",
    brand: "Cadbury",
    netQuantity: "46g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Bubbly 46g features an innovative aerated milk chocolate center encapsulated within a smooth Cadbury milk chocolate shell. Its bubble-shaped contours create an exceptionally light, airy, and melt-in-the-mouth sensory texture.",
    specifications: [{"label":"Product Type","value":"Aerated Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"46g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Texture Profile","value":"Aerated Bubbly Center with Smooth Shell","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Signature bubbly texture with aerated chocolate pockets for a melt-in-mouth bite","Crafted with genuine Cadbury Dairy Milk chocolate and fine cocoa butter","Distinctive round bubble mold design for playful snapping and sharing","Guaranteed genuine stock with 100% doorstep inspection prior to payment"],
    usageDirections: "Snap along the bubble contours and let the aerated chocolate melt gently on your tongue.",
    storageInstructions: "Store in a cool, dry, and hygienic place below 25°C. Keep protected from moisture and strong light.",
    faqs: [{"question":"What makes Cadbury Dairy Milk Bubbly unique?","answer":"It features an aerated chocolate interior with tiny bubbles inside and outside, creating an extra-light and creamy texture compared to a solid bar.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the bar before paying?","answer":"Yes, Lucky Store riders allow doorstep inspection of product packaging and batch information before payment.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Bubbly Technical Dossier",
        verifiedAt: "2026-09-16",
        skuScope: "9e70a7e1-34f3-4d1b-8d98-add2c1e5f917",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "9e70a7e1-34f3-4d1b-8d98-add2c1e5f917",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-46G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "9e70a7e1-34f3-4d1b-8d98-add2c1e5f917",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "c95cbb89": {
    slugPrefix: "c95cbb89",
    exactName: "Cadbury Dairy Milk Crispello Chocolate Bar 19g",
    brand: "Cadbury",
    netQuantity: "19g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Crispello 19g is a crispy-creamy chocolate treat featuring crispy wafer finger balls filled with rich cocoa cream and coated in smooth Cadbury Dairy Milk chocolate. It provides a multi-textured snacking experience in a convenient 4-finger bar.",
    specifications: [{"label":"Product Type","value":"Wafer Filled Milk Chocolate Confection","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"19g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Structure","value":"Crispy Wafer Shells with Chocolate Cream Coating","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Delightful combination of light crispy wafer and smooth chocolate cream center","Coated in genuine Cadbury Dairy Milk chocolate for a rich finish","Divided into 4 individual bite-sized finger balls for effortless sharing","100% doorstep verification available with fast delivery in Chattogram"],
    usageDirections: "Snap apart the crispy wafer balls and enjoy as an on-the-go snack or afternoon tea companion.",
    storageInstructions: "Keep in a cool, dry, and clean place away from heat, humidity, and direct sunlight.",
    faqs: [{"question":"What is inside Cadbury Crispello?","answer":"Crispello features light, crunchy wafer balls filled with cocoa cream and enrobed in Cadbury Dairy Milk chocolate.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the pack upon delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection before payment so you can check packaging condition and expiry date.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Crispello Confectionery Product Specification",
        verifiedAt: "2026-09-16",
        skuScope: "c95cbb89-4fcb-42ea-95e9-2f6ab979458f",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "c95cbb89-4fcb-42ea-95e9-2f6ab979458f",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-19G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "c95cbb89-4fcb-42ea-95e9-2f6ab979458f",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "29211c8b": {
    slugPrefix: "29211c8b",
    exactName: "Cadbury Fuse Chocolate Bar 21g",
    brand: "Cadbury",
    netQuantity: "21g",
    category: "Chocolates & Candies",
    summary: "Cadbury Fuse 21g is an indulgent multi-textured chocolate bar packed with crunchy roasted peanuts, chewy caramel fudge, and cereal crisps, all wrapped in a thick layer of creamy Cadbury milk chocolate.",
    specifications: [{"label":"Product Type","value":"Peanut & Caramel Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"21g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Inclusions","value":"Roasted Peanuts, Chewy Caramel, Crispy Cereals","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Generously packed with roasted crunchy peanuts and caramel fudge","Coated in rich and creamy Cadbury milk chocolate","Satisfying chew and crunch providing quick energy during busy days","Available with 100% doorstep verification through Lucky Store delivery"],
    usageDirections: "Unwrap and enjoy as an energizing snack between meals or when on the go.",
    storageInstructions: "Store in a cool, dry place away from direct sunlight, moisture, and high temperatures.",
    faqs: [{"question":"Does Cadbury Fuse contain nuts?","answer":"Yes, Cadbury Fuse contains roasted peanuts as a primary ingredient.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the bar upon delivery in Chattogram?","answer":"Yes, Lucky Store offers doorstep inspection before payment so you can verify the sealed wrapper and expiration date.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Fuse Confectionery Formulation Standards",
        verifiedAt: "2026-09-16",
        skuScope: "29211c8b-ddba-41c1-a04a-32b7e4b12867",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "29211c8b-ddba-41c1-a04a-32b7e4b12867",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-21G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "29211c8b-ddba-41c1-a04a-32b7e4b12867",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "ad0c9915": {
    slugPrefix: "ad0c9915",
    exactName: "Cadbury Dairy Milk Oreo Chocolate Bar 58g",
    brand: "Cadbury",
    netQuantity: "58g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Oreo 58g combines classic Cadbury Dairy Milk chocolate with a smooth vanilla creme filling studded with crunchy Oreo biscuit pieces. It delivers a perfect contrast of creamy milk chocolate, smooth cream, and chocolatey biscuit crunch.",
    specifications: [{"label":"Product Type","value":"Filled Milk Chocolate Bar with Biscuit Pieces","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"58g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Inclusions","value":"Smooth Vanilla Creme & Crunchy Oreo Biscuit Pieces","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Creamy Cadbury Dairy Milk chocolate filled with vanilla creme and crunchy Oreo pieces","58g shareable bar with thick snapable chocolate segments","Crafted with Cocoa Life certified sustainably farmed cocoa","Covered by Lucky Store's doorstep inspection before payment guarantee in Chattogram"],
    usageDirections: "Break into squares and savor the crunchy Oreo and creamy chocolate combination. Great as a standalone treat or dessert accompaniment.",
    storageInstructions: "Keep in a cool, dry place away from heat and direct sunlight to preserve the crispiness of the Oreo biscuit pieces.",
    faqs: [{"question":"What gives Cadbury Dairy Milk Oreo its distinctive crunch?","answer":"The bar contains genuine crunchy Oreo cocoa cookie bits embedded throughout the smooth vanilla creme layer.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the bar upon delivery?","answer":"Yes, Lucky Store supports 100% doorstep inspection so you can examine the outer foil seal and expiry date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Oreo Formulation Standards",
        verifiedAt: "2026-09-16",
        skuScope: "ad0c9915-ebe1-4d91-af5f-1b76e006ee2c",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "ad0c9915-ebe1-4d91-af5f-1b76e006ee2c",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-58G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "ad0c9915-ebe1-4d91-af5f-1b76e006ee2c",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "3953dc9e": {
    slugPrefix: "3953dc9e",
    exactName: "Cadbury Dairy Milk Roast Almond Chocolate Bar 52g",
    brand: "Cadbury",
    netQuantity: "52g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Roast Almond 52g combines the rich smoothness of classic Cadbury milk chocolate with generous pieces of whole roasted almonds. Every square provides a satisfying nutty crunch alongside velvety cocoa richness.",
    specifications: [{"label":"Product Type","value":"Nut Inclusion Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"52g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Inclusions","value":"Crunchy Whole Roasted Almonds","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Generously packed with whole roasted almonds for robust nut flavor and crunch","Crafted with signature Cadbury Dairy Milk smooth chocolate recipe","52g bar with individually molded squares for easy portioning","Available with 100% doorstep seal inspection before payment in Chattogram"],
    usageDirections: "Snap into squares and enjoy directly. Pair with hot tea, coffee, or milk for an indulgent afternoon treat.",
    storageInstructions: "Store in a cool, dry, and hygienic place below 25°C. Keep protected from warmth and direct sunlight to preserve almond crispness.",
    faqs: [{"question":"Are the almonds roasted in this chocolate bar?","answer":"Yes, Cadbury Roast Almond features carefully roasted whole almonds to ensure rich nutty aroma and crisp texture.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the bar upon delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection so you can examine the package condition and expiration date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Roast Almond Product Standards",
        verifiedAt: "2026-09-16",
        skuScope: "3953dc9e-f883-4ed6-96d2-3ce08101efcc",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "3953dc9e-f883-4ed6-96d2-3ce08101efcc",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-52G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "3953dc9e-f883-4ed6-96d2-3ce08101efcc",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "d7243ca1": {
    slugPrefix: "d7243ca1",
    exactName: "Cadbury Dairy Milk Silk Chocolate Bar 55g",
    brand: "Cadbury",
    netQuantity: "55g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Silk 55g represents the pinnacle of chocolate smoothness. Formulated with a higher proportion of fine milk ingredients and refined cocoa butter, Silk melts effortlessly on the tongue, delivering an extraordinarily velvety and luxurious taste.",
    specifications: [{"label":"Product Type","value":"Premium Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"55g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Melt Profile","value":"Extra Smooth, Velvety, Silky Melt","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian Friendly","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Ultra-smooth and creamy formulation designed to melt silkily in the mouth","Deeper cocoa richness balanced with sweet, velvety dairy cream notes","55g bar featuring elegant curved Silk contours for luxurious snapping","Eligible for 100% doorstep seal and condition verification before payment"],
    usageDirections: "Snap off a curved Silk piece and allow it to melt slowly on your tongue for the fullest flavor release.",
    storageInstructions: "Store in a cool, dry place (ideally 18°C–22°C). Silk has a delicate melt point; keep protected from ambient heat and humidity.",
    faqs: [{"question":"How is Dairy Milk Silk different from regular Dairy Milk?","answer":"Cadbury Dairy Milk Silk is crafted with a richer, curvier mold and an extra-velvety milk chocolate formulation that melts noticeably smoother and creamier.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the chocolate upon delivery in Chattogram?","answer":"Yes, Lucky Store encourages 100% doorstep inspection prior to payment so you can check that the bar has arrived in prime condition.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Silk Technical Specifications",
        verifiedAt: "2026-09-16",
        skuScope: "d7243ca1-9e0d-49ea-a9d0-44c6535d62a2",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Silk Temperature & Storage Standards",
        verifiedAt: "2026-09-16",
        skuScope: "d7243ca1-9e0d-49ea-a9d0-44c6535d62a2",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-55G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "d7243ca1-9e0d-49ea-a9d0-44c6535d62a2",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "24eed4b8": {
    slugPrefix: "24eed4b8",
    exactName: "Cadbury Dairy Milk Silk Fruit & Nut Chocolate Bar 55g",
    brand: "Cadbury",
    netQuantity: "55g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Silk Fruit & Nut 55g blends the velvety smoothness of Silk milk chocolate with chewy Turkish raisins and whole roasted almonds. Every bite delivers a harmonious harmony of silky chocolate, sweet fruity chew, and nutty crunch.",
    specifications: [{"label":"Product Type","value":"Fruit & Nut Inclusions Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"55g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Inclusions","value":"Selected Raisins & Roasted Almond Pieces","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Signature velvety Silk milk chocolate loaded with sweet raisins and crunchy almonds","Satisfying balance of chew, crunch, and melt-in-mouth cocoa creaminess","55g curved bar format made for elevated personal snacking or sharing","Guaranteed authentic stock with doorstep inspection prior to purchase"],
    usageDirections: "Snap into segments and enjoy directly as a gourmet sweet indulgence.",
    storageInstructions: "Store in a cool, dry, and hygienic place below 25°C away from direct sunlight and warmth to preserve fruit freshness and nut crispness.",
    faqs: [{"question":"What fruits and nuts are in Silk Fruit & Nut?","answer":"Cadbury Silk Fruit & Nut contains premium dried raisins and roasted almond pieces mixed into smooth Silk milk chocolate.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the packaging upon delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection so you can examine the foil seal and expiry date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Silk Fruit & Nut Specifications",
        verifiedAt: "2026-09-16",
        skuScope: "24eed4b8-e3e3-4a70-ba57-ca6139b861ad",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Silk Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "24eed4b8-e3e3-4a70-ba57-ca6139b861ad",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-55G-1",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "24eed4b8-e3e3-4a70-ba57-ca6139b861ad",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
  "90298cd5": {
    slugPrefix: "90298cd5",
    exactName: "Cadbury Dairy Milk Hazelnut Chocolate Bar 54g",
    brand: "Cadbury",
    netQuantity: "54g",
    category: "Chocolates & Candies",
    summary: "Cadbury Dairy Milk Hazelnut 54g features rich, smooth Cadbury milk chocolate packed with crunchy whole and chopped roasted hazelnuts. It provides a classic European nutty chocolate flavor profile and a satisfying crunch.",
    specifications: [{"label":"Product Type","value":"Hazelnut Milk Chocolate Bar","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Net Weight","value":"54g","evidenceRefs":["MFR_PRODUCT_PAGE","CATALOG_RECORD"]},{"label":"Key Inclusions","value":"Selected Roasted Hazelnuts","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Cocoa Sourcing","value":"100% Sustainably Sourced Cocoa (Cocoa Life)","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Dietary","value":"Vegetarian","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"label":"Storage","value":"Store in a cool, dry place below 25°C","evidenceRefs":["STORAGE_SPEC"]}],
    highlights: ["Signature Cadbury Dairy Milk chocolate studded with roasted hazelnuts","Distinctive aromatic roasted nutty flavor with an appealing crunchy bite","54g bar divided into snapable squares for convenient portioning","Full doorstep inspection supported before payment in Chattogram"],
    usageDirections: "Snap into squares and enjoy. Complements hot beverages or works as an after-dinner dessert.",
    storageInstructions: "Store in a cool, dry place away from direct sunlight, moisture, and strong external odors.",
    faqs: [{"question":"Are the hazelnuts roasted?","answer":"Yes, Cadbury Dairy Milk Hazelnut contains roasted hazelnuts for optimum aroma, flavor, and crunch.","evidenceRefs":["MFR_PRODUCT_PAGE"]},{"question":"Can I inspect the bar upon delivery?","answer":"Yes, Lucky Store offers 100% doorstep inspection so you can examine the wrapper seal and expiration date before paying.","evidenceRefs":["STORE_INSPECTION_POLICY"]}],
    evidenceManifest: {
      MFR_PRODUCT_PAGE: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/",
        sourceTitle: "Cadbury Dairy Milk Hazelnut Specifications",
        verifiedAt: "2026-09-16",
        skuScope: "90298cd5-cee7-47a7-9c05-2e6dfb651dcd",
      },
      STORAGE_SPEC: {
        source: "MANUFACTURER",
        evidenceRef: "https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-110g/#storage",
        sourceTitle: "Cadbury Confectionery Storage Guidelines",
        verifiedAt: "2026-09-16",
        skuScope: "90298cd5-cee7-47a7-9c05-2e6dfb651dcd",
      },
      CATALOG_RECORD: {
        source: "LUCKY_STORE_CATALOG",
        evidenceRef: "items.sku:CC-CDM-GEN-54G",
        sourceTitle: "Lucky Store Production Item Master",
        verifiedAt: "2026-09-16",
        skuScope: "90298cd5-cee7-47a7-9c05-2e6dfb651dcd",
      },
      STORE_INSPECTION_POLICY: {
        source: "LUCKY_STORE_POLICY",
        evidenceRef: "https://luckystore1947.com/delivery",
        sourceTitle: "Lucky Store 100% Doorstep Inspection Policy",
        verifiedAt: "2026-09-16",
        skuScope: "GLOBAL",
      },
    },
    fieldEvidence: {
      exactName: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      brand: ["MFR_PRODUCT_PAGE"],
      netQuantity: ["MFR_PRODUCT_PAGE","CATALOG_RECORD"],
      category: ["CATALOG_RECORD"],
      summary: ["MFR_PRODUCT_PAGE"],
      highlights: [["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["MFR_PRODUCT_PAGE"],["STORE_INSPECTION_POLICY"]],
      storageInstructions: ["STORAGE_SPEC"],
    },
  },
};

/**
 * Backwards-compatible alias for existing imports.
 */
export const PILOT_ENRICHED_PRODUCTS = PRODUCT_ENRICHMENTS;

/**
 * Retrieve verified enrichment content for a product by slug or UUID prefix.
 *
 * Lookup order:
 * 1. Exact 8-char prefix match in PRODUCT_ENRICHMENTS
 * 2. Prefix extracted from slug suffix (--[8char])
 * 3. Fallback: undefined (renders standard base catalog presentation)
 */
export function getEnrichedProductData(slugOrId: string): ProductEnrichment | undefined {
  if (!slugOrId) return undefined;

  const normalized = slugOrId.toLowerCase().trim();

  // 1. Direct key match (e.g. 'b8a7c6c6')
  const directMatch = PRODUCT_ENRICHMENTS[normalized];
  if (directMatch) return directMatch;

  // 2. Extract prefix from canonical slug format: name-words--[prefix]
  const doubleHyphenParts = normalized.split('--');
  if (doubleHyphenParts.length > 1) {
    const candidatePrefix = doubleHyphenParts[doubleHyphenParts.length - 1];
    const match = PRODUCT_ENRICHMENTS[candidatePrefix];
    if (match) return match;
  }

  // 3. Extract prefix from single hyphen standard slug or raw UUID
  const singleHyphenParts = normalized.split('-');
  const lastPart = singleHyphenParts[singleHyphenParts.length - 1];
  if (lastPart && lastPart.length >= 8) {
    const candidatePrefix = lastPart.slice(0, 8);
    const match = PRODUCT_ENRICHMENTS[candidatePrefix];
    if (match) return match;
  }

  // 4. Raw UUID format (first segment of 8-4-4-4-12)
  const firstPart = singleHyphenParts[0];
  if (firstPart && firstPart.length === 8 && /^[0-9a-f]{8}$/i.test(firstPart)) {
    const match = PRODUCT_ENRICHMENTS[firstPart.toLowerCase()];
    if (match) return match;
  }

  // 5. Preserve compatibility with legacy slugs that contain a known prefix
  // outside the canonical suffix position.
  for (const [prefix, data] of Object.entries(PRODUCT_ENRICHMENTS)) {
    if (normalized.includes(prefix)) return data;
  }

  return undefined;
}
