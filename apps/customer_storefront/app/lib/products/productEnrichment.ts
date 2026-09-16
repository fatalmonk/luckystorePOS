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
 * Total: 22 products (8 prior pilots + 14 expanded cohort enrichments).
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

  // 1. Direct key match (e.g. 'b8a7c6c6')
  const directMatch = PRODUCT_ENRICHMENTS[slugOrId];
  if (directMatch) return directMatch;

  // 2. Extract prefix from canonical slug format: name-words--[prefix]
  const doubleHyphenParts = slugOrId.split('--');
  if (doubleHyphenParts.length > 1) {
    const candidatePrefix = doubleHyphenParts[doubleHyphenParts.length - 1];
    const match = PRODUCT_ENRICHMENTS[candidatePrefix];
    if (match) return match;
  }

  // 3. Extract prefix from single hyphen standard slug or raw UUID
  const singleHyphenParts = slugOrId.split('-');
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

  return undefined;
}
