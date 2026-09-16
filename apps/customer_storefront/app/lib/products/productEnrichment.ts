/**
 * Product Enrichment Registry
 *
 * Hard Evidence Gate:
 * Every factual field in this registry MUST map to one of four verifiable sources:
 * - PACKAGING: Directly printed on physical packaging or primary container label.
 * - MANUFACTURER: Published specification or declaration from the verified manufacturer for this SKU.
 * - LUCKY_STORE_POLICY: Verified operational policy (1 km Chawkbazar delivery radius, ৳500+ free threshold, 100% doorstep inspection).
 * - CALCULATED_FROM_VERIFIED_FACTS: Transparent mathematical derivations explicitly labeled as calculations (e.g. net weight / serving size).
 *
 * Unsubstantiated marketing claims, biochemical/sensory assertions, unverified operational details,
 * and fabricated codes are STRICTLY FORBIDDEN.
 */

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
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
  /** Verified canonical category name [LUCKY_STORE_POLICY/CATALOG] */
  category: string;
  /** Answer-first opening summary (factual, concise, local purchase context) */
  summary: string;
  /** Structured tabular specifications [PACKAGING/MANUFACTURER/LUCKY_STORE_POLICY/CALCULATED] */
  specifications: ProductSpecification[];
  /** Packaging-supported key highlights [PACKAGING/MANUFACTURER/CALCULATED] */
  highlights?: string[];
  /** Practical preparation or culinary usage directions [PACKAGING] */
  usageDirections?: string;
  /** Storage instructions [PACKAGING] */
  storageInstructions?: string;
  /** Concise factual product Q&As [PACKAGING/MANUFACTURER/LUCKY_STORE_POLICY/CALCULATED] */
  faqs: ProductFaq[];
}

/**
 * Verified pilot product enrichments indexed by 8-char prefix and partial slug.
 */
export const PILOT_ENRICHED_PRODUCTS: Record<string, ProductEnrichment> = {
  // Fortune Mustard Oil 5L (Query: fortune mustard oil 5 litre price in bangladesh)
  b8a7c6c6: {
    slugPrefix: 'b8a7c6c6',
    exactName: 'Fortune Kachi Ghani Mustard Oil 5L',
    brand: 'Fortune',
    netQuantity: '5 Litres',
    category: 'Oil & Ghee',
    summary:
      'Fortune Kachi Ghani Mustard Oil in a 5-litre family jerry can with carry handle. Suitable for daily traditional cooking, tempering, and culinary preparations in Chattogram. Packaged in a food-grade poly container with tamper-evident seal. Dispatched from Lucky Store in Chawkbazar under our verified 1 km local delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Fortune' },
      { label: 'Net Volume', value: '5 Litres' },
      { label: 'Packaging Type', value: 'Food-grade Poly Jerry Can with Handle' },
      { label: 'Product Type', value: 'Mustard Oil (Kachi Ghani)' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight' },
    ],
    highlights: [
      'Declared on-pack as Kachi Ghani Mustard Oil',
      '5-litre container equipped with built-in handle and sealed cap',
    ],
    usageDirections:
      'Suitable for cooking, frying, tempering, and traditional food preparations.',
    storageInstructions:
      'Keep tightly closed after each use in a cool, dry place away from heat.',
    faqs: [
      {
        question: 'Can I inspect the Fortune Mustard Oil seal before paying?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection. You can verify the tamper-evident cap, net quantity, and expiry date before paying with cash or bKash.',
      },
      {
        question: 'Is free delivery available for this 5L oil in Chattogram?',
        answer:
          'Yes. Orders totaling ৳500 or more qualify for free delivery within our 1 km Chawkbazar delivery radius; orders below ৳500 incur a flat ৳40 fee.',
      },
    ],
  },

  // Radhuni Turmeric Powder 100g (Query: radhuni holud gura price 100gm)
  '029b62d8': {
    slugPrefix: '029b62d8',
    exactName: 'Radhuni Holud Gura (Turmeric Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Cooking Essentials',
    summary:
      'Radhuni Holud Gura (Turmeric Powder) in a sealed 100g moisture-barrier pouch. Produced by Square Food & Beverage Ltd. with declared ingredient 100% pure dried turmeric for cooking in Chattogram. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection so you can verify the printed dates and sealed packaging before paying.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '100g' },
      { label: 'Declared Ingredients', value: '100% Pure Dried Turmeric' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Packaging Type', value: 'Multi-layer sealed barrier pouch' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place' },
    ],
    highlights: [
      '100% pure dried turmeric packaged by Square Food & Beverage Ltd.',
      'Multi-layer sealed moisture-barrier 100g pouch',
    ],
    usageDirections:
      'Add to curry bases, marinades, or tempering per recipe requirements.',
    storageInstructions:
      'Transfer to an airtight container after opening; store in a dry place away from moisture.',
    faqs: [
      {
        question: 'How can I verify the freshness of this Radhuni Turmeric Powder?',
        answer:
          'Customers can verify the printed manufacturing date, expiry date, and packaging seal directly at their doorstep before completing payment.',
      },
      {
        question: 'Can I reject the packet if the seal is damaged upon delivery?',
        answer:
          'Yes. Lucky Store guarantees doorstep inspection. If any package shows damage, you may reject it immediately before payment.',
      },
    ],
  },

  // Radhuni Coriander Powder 500g (Query: radhuni dhonia gura price 500gm)
  '1f4650a7': {
    slugPrefix: '1f4650a7',
    exactName: 'Radhuni Dhoniya Gura (Coriander Powder) 500g',
    brand: 'Radhuni',
    netQuantity: '500g',
    category: 'Cooking Essentials',
    summary:
      'Radhuni Dhoniya Gura (Coriander Powder) in a 500g sealed pack. Produced by Square Food & Beverage Ltd. with declared ingredients of 100% ground coriander seeds. Handled directly by Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '500g' },
      { label: 'Declared Ingredients', value: '100% Ground Coriander Seeds' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Packaging Type', value: 'Sealed poly pack' },
      { label: 'Storage Guidance', value: 'Store in an airtight jar in a cool, dry place' },
    ],
    highlights: [
      '100% ground coriander seeds in a 500g sealed pack',
      'Packaged by Square Food & Beverage Ltd.',
    ],
    usageDirections:
      'Add to curry bases, seasonings, and spice pastes during cooking.',
    storageInstructions:
      'Store in an airtight container in a cool, dry place away from direct sunlight.',
    faqs: [
      {
        question: 'Can I inspect the packaging upon delivery?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection before payment to ensure the pack is clean and sealed.',
      },
    ],
  },

  // Bellame Chocolate Digestive Biscuits 135g (Query: bellame chocolate digestive)
  '4d20b020': {
    slugPrefix: '4d20b020',
    exactName: 'Bellame Chocolate Digestive Biscuits 135g',
    brand: 'Bellame',
    netQuantity: '135g',
    category: 'Snacks & Confectionery',
    summary:
      'Bellame Chocolate Digestive Biscuits in a 135g sealed pack. Digestive biscuits topped with chocolate for tea-time and snacking. Delivered from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Bellame' },
      { label: 'Net Weight', value: '135g' },
      { label: 'Packaging Type', value: 'Sealed biscuit pack' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct heat' },
    ],
    highlights: [
      '135g chocolate-topped digestive biscuit pack',
      'Sealed wrapper suitable for pantry storage',
    ],
    usageDirections:
      'Ready to eat directly from the pack.',
    storageInstructions:
      'Store in an airtight container in a cool, dry place after opening.',
    faqs: [
      {
        question: 'Can I inspect the biscuit pack before paying?',
        answer:
          'Yes. You may inspect the package condition and printed expiry date at your doorstep before payment.',
      },
    ],
  },

  // Ama Classic Instant Coffee 1g Sachet (Query: ama classic coffee)
  '3448ed8a': {
    slugPrefix: '3448ed8a',
    exactName: 'Ama Classic Instant Coffee Sachet 1g',
    brand: 'Ama',
    netQuantity: '1g',
    category: 'Tea & Coffee',
    summary:
      'Ama Classic 100% Pure Instant Coffee in a single-serve 1g foil sachet. Declared as 100% soluble coffee granules for quick single-cup preparation in Chattogram. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection and no minimum order requirement.',
    specifications: [
      { label: 'Brand', value: 'Ama' },
      { label: 'Net Weight', value: '1g (Single Serve Sachet)' },
      { label: 'Declared Ingredients', value: '100% Soluble Coffee Granules' },
      { label: 'Packaging Type', value: 'Moisture-sealed foil sachet' },
      { label: 'Storage Guidance', value: 'Keep sealed until ready to brew; store away from heat' },
    ],
    highlights: [
      'Single-serve 1g sealed foil sachet',
      '100% pure soluble coffee granules',
    ],
    usageDirections:
      'Empty sachet into a cup, add hot water or milk, and stir.',
    storageInstructions:
      'Keep sealed until use in a dry place.',
    faqs: [
      {
        question: 'Can I order single sachets or small quantities?',
        answer:
          'Yes. Lucky Store has no minimum order requirement. Orders under ৳500 are delivered for a flat ৳40 fee across our 1 km zone.',
      },
    ],
  },

  // Polar Double Sundae Ice Cream 1L (Query: polar double sundae ice cream)
  '70a322a1': {
    slugPrefix: '70a322a1',
    exactName: 'Polar Double Sundae Ice Cream 1L',
    brand: 'Polar',
    netQuantity: '1 Litre',
    category: 'Dairy & Ice Cream',
    summary:
      'Polar Double Sundae Ice Cream in a 1-litre dessert tub. Produced by Dhaka Ice Cream Industries Ltd., featuring vanilla ice cream swirled with chocolate ripple and chocolate drops. Dispatched from Lucky Store freezers in Chawkbazar, Chattogram, with doorstep temperature and seal inspection prior to payment.',
    specifications: [
      { label: 'Brand', value: 'Polar' },
      { label: 'Net Volume', value: '1 Litre (1000ml)' },
      { label: 'Product Type', value: 'Ice Cream Tub' },
      { label: 'Manufacturer', value: 'Dhaka Ice Cream Industries Ltd.' },
      { label: 'Storage Guidance', value: 'Keep frozen at -18°C or below' },
    ],
    highlights: [
      '1-litre family dessert tub produced by Dhaka Ice Cream Industries Ltd.',
      'Vanilla ice cream with chocolate ripple and chocolate drops',
    ],
    usageDirections:
      'Serve cold directly from freezer using an ice cream scoop.',
    storageInstructions:
      'Return to freezer immediately after serving. Maintain freezer temperature at or below -18°C.',
    faqs: [
      {
        question: 'Can I check the ice cream temperature and tub seal upon delivery?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection. You can verify the tub seal and cold condition before paying.',
      },
    ],
  },

  // Aril Assorted Fruit Lollipops (Query: aril lollipop)
  ac68b2c3: {
    slugPrefix: 'ac68b2c3',
    exactName: 'Aril Assorted Fruit Lollipops',
    brand: 'Aril',
    netQuantity: '1 pc',
    category: 'Snacks & Confectionery',
    summary:
      'Aril Assorted Fruit Lollipops individually wrapped in cellophane. Confectionery lollipop delivered locally from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection prior to payment.',
    specifications: [
      { label: 'Brand', value: 'Aril' },
      { label: 'Product Type', value: 'Hard Boiled Confectionery / Lollipop' },
      { label: 'Packaging Type', value: 'Individual cellophane wrapper' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place' },
    ],
    highlights: [
      'Individually wrapped single-piece lollipop',
      'Fruit-flavored hard boiled confectionery',
    ],
    storageInstructions:
      'Store in a cool, dry place away from direct heat.',
    faqs: [
      {
        question: 'Can I inspect the packaging upon delivery?',
        answer:
          'Yes. You have full right of doorstep inspection before payment to ensure wrappers are clean and intact.',
      },
    ],
  },

  // Nescafé Classic 90g Jar (Query: nescafe classic 90g jar price in bangladesh, nescafe 90g price bd)
  ae09a3ef: {
    slugPrefix: 'ae09a3ef',
    exactName: 'Nescafé Classic Instant Coffee 90g Jar',
    brand: 'Nescafé',
    netQuantity: '90g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic 100% Pure Instant Coffee in a 90g glass jar with plastic screw cap and inner freshness seal. Marketed by Nestlé Bangladesh PLC, this product is declared on-pack as 100% pure soluble coffee. The manufacturer preparation guideline directs one teaspoon of coffee stirred into 150ml of hot water. On-pack instructions advise storing the jar in a cool, dry place and always using a dry spoon to maintain quality. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km local delivery radius. Orders totaling ৳500 or more qualify for free local delivery, with a flat ৳40 delivery fee for smaller baskets. Customers receive 100% doorstep inspection to verify the jar’s intact seal, glass container, net weight, and printed dates prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Nescafé' },
      { label: 'Net Weight', value: '90g' },
      { label: 'Product Type', value: '100% Pure Soluble Coffee' },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal' },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC' },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place. Always use a dry spoon.' },
    ],
    highlights: [
      'Declared on-pack as 100% pure soluble coffee',
      'Glass jar packaging with plastic screw cap and protective inner seal',
      'On-pack preparation guideline: 1 teaspoon in 150ml hot water',
      'On-pack storage instructions: store in a cool, dry place and always use a dry spoon',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml of hot water and stir per on-pack instructions.',
    storageInstructions:
      'Store in a cool, dry place. Always use a dry spoon and keep the cap tightly closed.',
    faqs: [
      {
        question: 'What is the declared ingredient in this Nescafé Classic 90g jar?',
        answer:
          'The physical product packaging declares 100% Pure Coffee (pure soluble coffee powder).',
      },
      {
        question: 'What is the on-pack preparation direction for this coffee?',
        answer:
          'The packaging directs adding one teaspoon of Nescafé Classic to 150ml of hot water and stirring well.',
      },
      {
        question: 'Can I inspect the glass jar and seal before paying in Chattogram?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection within our 1 km Chawkbazar delivery zone. You may inspect the glass container, cap seal, and printed expiry date before payment by cash or bKash.',
      },
      {
        question: 'Who markets this Nescafé Classic product in Bangladesh?',
        answer:
          'The back panel of the physical jar states that the product is marketed by Nestlé Bangladesh PLC.',
      },
    ],
  },
};

/**
 * Looks up verified enrichment data for a product by full slug or 8-char UUID prefix.
 */
export function getEnrichedProductData(slugOrPrefix: string): ProductEnrichment | undefined {
  if (!slugOrPrefix) return undefined;

  // Direct prefix match
  const cleanKey = slugOrPrefix.toLowerCase().trim();
  if (PILOT_ENRICHED_PRODUCTS[cleanKey]) {
    return PILOT_ENRICHED_PRODUCTS[cleanKey];
  }

  // Extract trailing 8-char prefix from slug if applicable (e.g. name--b8a7c6c6)
  const doubleDashIdx = cleanKey.lastIndexOf('--');
  if (doubleDashIdx !== -1) {
    const suffix = cleanKey.slice(doubleDashIdx + 2);
    if (PILOT_ENRICHED_PRODUCTS[suffix]) {
      return PILOT_ENRICHED_PRODUCTS[suffix];
    }
  }

  // Try matching any known prefix contained in slug
  for (const [prefix, data] of Object.entries(PILOT_ENRICHED_PRODUCTS)) {
    if (cleanKey.includes(prefix)) {
      return data;
    }
  }

  return undefined;
}
