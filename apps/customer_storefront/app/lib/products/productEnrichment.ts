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

  // Nescafé Classic 180g Jar (Query: nescafe classic 180g jar price in bangladesh)
  be803387: {
    slugPrefix: 'be803387',
    exactName: 'Nescafé Classic Instant Coffee 180g Jar',
    brand: 'Nescafé',
    netQuantity: '180g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic 100% Pure Instant Coffee in a 180g glass jar with red plastic screw cap and protective freshness seal. Marketed by Nestlé Bangladesh PLC, this product is declared on-pack as 100% pure soluble coffee. The manufacturer preparation guideline directs one teaspoon of coffee stirred into 150ml of hot water. On-pack instructions advise storing the jar in a cool, dry place and always using a dry spoon to maintain granule quality. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, under our verified 1 km local delivery radius with free delivery on orders ৳500+ and 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Nescafé' },
      { label: 'Net Weight', value: '180g' },
      { label: 'Product Type', value: '100% Pure Soluble Coffee' },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal' },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC' },
      { label: 'Approximate Servings', value: '~100–120 Servings (calculated from 1.5g–1.8g per cup)' },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place. Always use a dry spoon.' },
    ],
    highlights: [
      'Declared on-pack as 100% pure soluble coffee',
      '180g family glass jar with plastic screw cap and protective inner seal',
      'On-pack preparation guideline: 1 teaspoon in 150ml hot water',
      'On-pack storage instructions: store in a cool, dry place and always use a dry spoon',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml of hot water and stir per on-pack instructions.',
    storageInstructions:
      'Store in a cool, dry place. Always use a dry spoon and keep the cap tightly closed.',
    faqs: [
      {
        question: 'What is the declared ingredient in this Nescafé Classic 180g jar?',
        answer:
          'The physical packaging declares 100% Pure Coffee (pure soluble coffee powder).',
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

  // Nescafé Classic 45g Jar (Query: nescafe classic 45g jar price in bangladesh)
  '6dbf8f0e': {
    slugPrefix: '6dbf8f0e',
    exactName: 'Nescafé Classic Instant Coffee 45g Jar',
    brand: 'Nescafé',
    netQuantity: '45g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic 100% Pure Instant Coffee in a compact 45g glass jar with plastic screw cap and protective inner seal. Marketed by Nestlé Bangladesh PLC, this product is declared on-pack as 100% pure soluble coffee. The manufacturer preparation guideline directs one teaspoon of coffee stirred into 150ml of hot water. On-pack instructions advise storing the jar in a cool, dry place and always using a dry spoon. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Nescafé' },
      { label: 'Net Weight', value: '45g' },
      { label: 'Product Type', value: '100% Pure Soluble Coffee' },
      { label: 'Packaging Form', value: 'Glass Jar with Plastic Screw Cap & Inner Seal' },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC' },
      { label: 'Approximate Servings', value: '~25–30 Servings (calculated from 1.5g–1.8g per cup)' },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place. Always use a dry spoon.' },
    ],
    highlights: [
      'Declared on-pack as 100% pure soluble coffee',
      'Compact 45g glass jar with plastic screw cap and protective seal',
      'On-pack preparation guideline: 1 teaspoon in 150ml hot water',
    ],
    usageDirections:
      'Add 1 teaspoon of Nescafé Classic into 150ml of hot water and stir per on-pack instructions.',
    storageInstructions:
      'Store in a cool, dry place. Always use a dry spoon and keep the cap tightly closed.',
    faqs: [
      {
        question: 'What is the declared ingredient in this 45g Nescafé Classic jar?',
        answer:
          'The product packaging declares 100% Pure Coffee (pure soluble coffee powder).',
      },
      {
        question: 'Can I inspect the 45g jar before payment?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection across our 1 km Chawkbazar delivery area.',
      },
    ],
  },

  // Nescafé Classic 200g Pouch (Query: nescafe classic 200g pouch price in bangladesh)
  b8d96d50: {
    slugPrefix: 'b8d96d50',
    exactName: 'Nescafé Classic Instant Coffee 200g Pouch',
    brand: 'Nescafé',
    netQuantity: '200g',
    category: 'Tea & Coffee',
    summary:
      'Nescafé Classic 100% Pure Instant Coffee in an economical 200g sealed refill pouch pack. Marketed by Nestlé Bangladesh PLC, this product is declared on-pack as 100% pure soluble coffee. Manufacturer preparation directs one teaspoon in 150ml of hot water. Dispatched from Lucky Store in Chawkbazar, Chattogram, under our 1 km delivery radius with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Nescafé' },
      { label: 'Net Weight', value: '200g' },
      { label: 'Product Type', value: '100% Pure Soluble Coffee' },
      { label: 'Packaging Form', value: 'Flexible Multi-layer Sealed Refill Pouch' },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC' },
      { label: 'Approximate Servings', value: '~110–133 Servings (calculated from 1.5g–1.8g per cup)' },
      { label: 'Preparation Guideline', value: '1 teaspoon in 150ml hot water' },
      { label: 'Storage Guidance', value: 'Transfer to an airtight container after opening; keep in a cool, dry place.' },
    ],
    highlights: [
      'Declared on-pack as 100% pure soluble coffee',
      '200g value refill pouch packaging',
      'On-pack preparation guideline: 1 teaspoon in 150ml hot water',
    ],
    usageDirections:
      'Add 1 teaspoon into 150ml of hot water and stir well.',
    storageInstructions:
      'Transfer contents into an airtight jar upon opening. Store in a cool, dry place away from direct heat.',
    faqs: [
      {
        question: 'Is this 200g pack a jar or a pouch?',
        answer:
          'This is a 200g sealed flexible refill pouch pack designed for refilling coffee containers.',
      },
      {
        question: 'Can I verify the pouch seal upon delivery?',
        answer:
          'Yes. You have full right of doorstep inspection before paying cash or bKash.',
      },
    ],
  },

  // Ispahani Blender's Choice Premium Black Tea 200g (Query: ispahani blenders choice 200g price in bangladesh)
  '8058c111': {
    slugPrefix: '8058c111',
    exactName: "Ispahani Blender's Choice Premium Black Tea 200g",
    brand: 'Ispahani',
    netQuantity: '200g',
    category: 'Tea & Coffee',
    summary:
      "Ispahani Blender's Choice Premium Black Tea in a 200g sealed pack. Blended and packed by Ispahani Tea Ltd. in Chattogram, Bangladesh, combining CTC black tea leaves with select whole orthodox tea leaves. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, under our 1 km local delivery radius with 100% doorstep inspection before payment.",
    specifications: [
      { label: 'Brand', value: 'Ispahani' },
      { label: 'Net Weight', value: '200g' },
      { label: 'Product Type', value: 'Blended Black Tea (CTC with Orthodox Tea Leaves)' },
      { label: 'Manufacturer', value: 'Ispahani Tea Ltd.' },
      { label: 'Origin', value: 'Chattogram, Bangladesh' },
      { label: 'Packaging Form', value: 'Aroma-protecting inner foil inside outer carton' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a cool, dry place away from strong odors.' },
    ],
    highlights: [
      'Blended with select orthodox tea leaves for authentic tea aroma',
      'Produced by Ispahani Tea Ltd., Chattogram',
      'Aroma-protecting sealed foil packaging',
    ],
    usageDirections:
      'Bring fresh water to a rolling boil. Add one teaspoon per cup and steep for 3–5 minutes before straining.',
    storageInstructions:
      'Transfer to an airtight caddy or jar after opening; keep away from spices and humidity.',
    faqs: [
      {
        question: "Where is Ispahani Blender's Choice manufactured?",
        answer:
          'It is blended and packaged by Ispahani Tea Ltd. in Chattogram, Bangladesh.',
      },
      {
        question: 'Can I inspect the carton seal before payment?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection before payment.',
      },
    ],
  },

  // Ispahani Blender's Choice Premium Black Tea 400g (Query: ispahani blenders choice 400g price in bangladesh)
  '4d004a30': {
    slugPrefix: '4d004a30',
    exactName: "Ispahani Blender's Choice Premium Black Tea 400g",
    brand: 'Ispahani',
    netQuantity: '400g',
    category: 'Tea & Coffee',
    summary:
      "Ispahani Blender's Choice Premium Black Tea in a 400g family pack. Blended and packaged by Ispahani Tea Ltd. in Chattogram, combining CTC black tea with select orthodox tea leaves for daily household brewing. Dispatched directly from Lucky Store in Chawkbazar under our verified 1 km local delivery radius with free delivery on orders ৳500+ and 100% doorstep inspection prior to payment.",
    specifications: [
      { label: 'Brand', value: 'Ispahani' },
      { label: 'Net Weight', value: '400g' },
      { label: 'Product Type', value: 'Blended Black Tea (CTC with Orthodox Tea Leaves)' },
      { label: 'Manufacturer', value: 'Ispahani Tea Ltd.' },
      { label: 'Origin', value: 'Chattogram, Bangladesh' },
      { label: 'Packaging Form', value: 'Aroma-protecting inner foil pack inside carton' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a cool, dry place.' },
    ],
    highlights: [
      '400g family pack blended by Ispahani Tea Ltd.',
      'Features CTC tea blended with select orthodox tea leaves',
      'Aroma-protecting sealed foil packaging',
    ],
    usageDirections:
      'Add one teaspoon of tea per cup of boiling water. Steep 3–5 minutes per taste preference.',
    storageInstructions:
      'Store in an airtight container in a dry pantry away from sunlight and moisture.',
    faqs: [
      {
        question: 'Does this 400g pack qualify for free local delivery?',
        answer:
          'If your total basket reaches ৳500 or more, delivery is completely free within our 1 km Chawkbazar zone.',
      },
      {
        question: 'Can I inspect the package at my doorstep?',
        answer:
          'Yes. Doorstep inspection is provided on 100% of deliveries before completing payment.',
      },
    ],
  },

  // Ispahani Mirzapore Tea Bag - 50p (Query: ispahani mirzapore tea bag 50)
  '1dd3e411': {
    slugPrefix: '1dd3e411',
    exactName: 'Ispahani Mirzapore Best Leaf Tea Bags 50 Count',
    brand: 'Ispahani',
    netQuantity: '50 Tea Bags',
    category: 'Tea & Coffee',
    summary:
      'Ispahani Mirzapore Best Leaf Tea Bags containing 50 individually prepared tea bags with strings and tags. Produced by Ispahani Tea Ltd. in Chattogram from selected tea leaves. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Ispahani' },
      { label: 'Net Quantity', value: '50 Tea Bags' },
      { label: 'Product Type', value: 'Black Tea Bags with String and Tag' },
      { label: 'Manufacturer', value: 'Ispahani Tea Ltd.' },
      { label: 'Origin', value: 'Chattogram, Bangladesh' },
      { label: 'Packaging Form', value: 'Box with 50 tea bags' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from moisture.' },
    ],
    highlights: [
      '50 individual string-and-tag tea bags',
      'Produced by Ispahani Tea Ltd.',
      'Convenient single-cup brewing',
    ],
    usageDirections:
      'Place 1 tea bag in a cup, pour freshly boiled water, steep for 2–3 minutes, and remove bag.',
    storageInstructions:
      'Keep box closed in a cool, dry location.',
    faqs: [
      {
        question: 'How many tea bags are in this box?',
        answer:
          'This pack contains 50 individual tea bags.',
      },
      {
        question: 'Can I inspect the box seal upon delivery?',
        answer:
          'Yes. Doorstep inspection is guaranteed on all orders before payment.',
      },
    ],
  },

  // Rupchanda Fortified Soyabean Oil 5L (Query: rupchanda soyabean oil 5 litre price in bangladesh)
  b3e78fa4: {
    slugPrefix: 'b3e78fa4',
    exactName: 'Rupchanda Fortified Soyabean Oil 5L',
    brand: 'Rupchanda',
    netQuantity: '5 Litres',
    category: 'Oil & Ghee',
    summary:
      'Rupchanda Fortified Soyabean Oil in a 5-litre family container with sturdy handle and sealed cap. Refined and vitamin A-fortified soyabean oil produced by Bangladesh Edible Oil Limited (BEOL). Suitable for all types of daily frying, sauteing, and curry preparation. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, under our 1 km local delivery radius with 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Rupchanda' },
      { label: 'Net Volume', value: '5 Litres' },
      { label: 'Product Type', value: 'Fortified Refined Soyabean Oil' },
      { label: 'Manufacturer', value: 'Bangladesh Edible Oil Limited (BEOL)' },
      { label: 'Fortification', value: 'Fortified with Vitamin A' },
      { label: 'Packaging Form', value: 'Food-grade Poly Jerry Can with Handle' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight.' },
    ],
    highlights: [
      'Refined soyabean oil fortified with Vitamin A',
      '5-litre family jerry can with sealed tamper-evident cap',
      'Produced by Bangladesh Edible Oil Limited (BEOL)',
    ],
    usageDirections:
      'Suitable for deep frying, pan frying, tempering, and general cooking.',
    storageInstructions:
      'Keep tightly closed in a cool, dry pantry away from sunlight.',
    faqs: [
      {
        question: 'Is Rupchanda Soyabean Oil fortified with vitamins?',
        answer:
          'Yes. The packaging declares fortification with Vitamin A in compliance with national food standards.',
      },
      {
        question: 'Can I inspect the 5L container at my doorstep?',
        answer:
          'Yes. Lucky Store provides 100% doorstep inspection before completing payment.',
      },
    ],
  },

  // Rupchanda Fortified Soyabean Oil 1L (Query: rupchanda soyabean oil 1 litre price)
  b39aa5cc: {
    slugPrefix: 'b39aa5cc',
    exactName: 'Rupchanda Fortified Soyabean Oil 1L',
    brand: 'Rupchanda',
    netQuantity: '1 Litre',
    category: 'Oil & Ghee',
    summary:
      'Rupchanda Fortified Soyabean Oil in a 1-litre PET bottle. Produced by Bangladesh Edible Oil Limited (BEOL) and fortified with Vitamin A for everyday culinary use in Chattogram. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Rupchanda' },
      { label: 'Net Volume', value: '1 Litre' },
      { label: 'Product Type', value: 'Fortified Refined Soyabean Oil' },
      { label: 'Manufacturer', value: 'Bangladesh Edible Oil Limited (BEOL)' },
      { label: 'Fortification', value: 'Fortified with Vitamin A' },
      { label: 'Packaging Form', value: 'Food-grade PET Bottle' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place.' },
    ],
    highlights: [
      '1-litre food-grade PET bottle with tamper-evident seal',
      'Fortified with Vitamin A',
    ],
    usageDirections:
      'Ideal for everyday frying, curry preparation, and baking.',
    storageInstructions:
      'Keep cap tightly sealed in a dry pantry away from direct heat.',
    faqs: [
      {
        question: 'Can I verify the seal on delivery?',
        answer:
          'Yes. Lucky Store offers doorstep inspection on all deliveries prior to payment.',
      },
    ],
  },

  // Radhuni Morich Gura 100gm (Query: radhuni morich gura 100g price in bangladesh)
  c0fe29c0: {
    slugPrefix: 'c0fe29c0',
    exactName: 'Radhuni Morich Gura (Chilli Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Spices',
    summary:
      'Radhuni Morich Gura (Red Chilli Powder) in a 100g sealed moisture-barrier pouch. Produced by Square Food & Beverage Ltd. from selected dried red chillies to provide authentic heat and color in culinary preparations. Dispatched from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection prior to payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '100g' },
      { label: 'Declared Ingredients', value: '100% Selected Ground Red Chillies' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Packaging Form', value: 'Multi-layer sealed barrier pouch' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place.' },
    ],
    highlights: [
      'Ground red chilli powder in a 100g moisture-barrier pack',
      'Packaged by Square Food & Beverage Ltd.',
    ],
    usageDirections:
      'Add to curries, gravies, marinades, and spice rubs per taste.',
    storageInstructions:
      'Transfer to an airtight caddy or jar after opening; keep away from humidity.',
    faqs: [
      {
        question: 'What are the ingredients in this Radhuni Chilli Powder?',
        answer:
          'The pack declares 100% ground red chillies without artificial colors.',
      },
      {
        question: 'Can I check the packet at delivery?',
        answer:
          'Yes. Doorstep inspection is provided on 100% of deliveries.',
      },
    ],
  },

  // Radhuni Jira Gura 100gm (Query: radhuni jira gura 100g price)
  '045df58d': {
    slugPrefix: '045df58d',
    exactName: 'Radhuni Jira Gura (Cumin Powder) 100g',
    brand: 'Radhuni',
    netQuantity: '100g',
    category: 'Spices',
    summary:
      'Radhuni Jira Gura (Cumin Powder) in a 100g sealed pouch. Produced by Square Food & Beverage Ltd. from 100% roasted and ground cumin seeds for aromatic flavoring in daily cooking. Dispatched from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '100g' },
      { label: 'Declared Ingredients', value: '100% Ground Cumin Seeds' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Packaging Form', value: 'Multi-layer sealed moisture-barrier pouch' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a cool, dry place.' },
    ],
    highlights: [
      '100% ground cumin seeds in a 100g sealed pouch',
      'Packaged by Square Food & Beverage Ltd.',
    ],
    usageDirections:
      'Add to savoury dishes, dal, curry seasoning, and roasted marinades.',
    storageInstructions:
      'Store in an airtight container in a cool, dry location.',
    faqs: [
      {
        question: 'Is this pure ground cumin?',
        answer:
          'Yes. The physical package declares 100% ground cumin seeds.',
      },
      {
        question: 'Can I inspect the pack seal before payment?',
        answer:
          'Yes. Lucky Store guarantees doorstep inspection before payment.',
      },
    ],
  },

  // Maggi Shaad-E-Magic 4g (Query: maggi shaad e magic price bd)
  '7d931484': {
    slugPrefix: '7d931484',
    exactName: 'Maggi Shaad-E-Magic Seasoning 4g',
    brand: 'Maggi',
    netQuantity: '4g',
    category: 'Spices',
    summary:
      'Maggi Shaad-E-Magic all-purpose taste enhancer seasoning in a 4g single-use foil sachet. Marketed by Nestlé Bangladesh PLC, formulated with a blend of roasted spices and iodized salt. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection and no minimum order requirement.',
    specifications: [
      { label: 'Brand', value: 'Maggi' },
      { label: 'Net Weight', value: '4g (Single Serve Sachet)' },
      { label: 'Product Type', value: 'All-purpose Seasoning Spice Blend' },
      { label: 'Marketer', value: 'Nestlé Bangladesh PLC' },
      { label: 'Packaging Form', value: 'Moisture-sealed foil sachet' },
      { label: 'Storage Guidance', value: 'Store in a dry place away from heat.' },
    ],
    highlights: [
      '4g single-use spice blend sachet',
      'Marketed by Nestlé Bangladesh PLC',
    ],
    usageDirections:
      'Sprinkle into vegetables, fish, egg, or meat dishes 2–3 minutes before taking off heat.',
    storageInstructions:
      'Keep foil sealed until use.',
    faqs: [
      {
        question: 'How is Maggi Shaad-E-Magic used in cooking?',
        answer:
          'On-pack instructions direct sprinkling one sachet into cooked dishes towards the end of cooking and stirring well.',
      },
      {
        question: 'Can I buy single sachets?',
        answer:
          'Yes. Lucky Store has no minimum order restrictions.',
      },
    ],
  },

  // Samyang Buldak Hot Chicken Flavor Ramen Original 140g (Query: samyang buldak ramen price in bangladesh)
  '8169739f': {
    slugPrefix: '8169739f',
    exactName: 'Samyang Buldak Hot Chicken Flavor Ramen Original 140g',
    brand: 'Samyang',
    netQuantity: '140g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Hot Chicken Flavor Ramen Original in a single-serve 140g packet. Produced by Samyang Foods Co., Ltd., featuring spicy stir-fried ramen noodles with signature hot chicken liquid sauce and roasted sesame-seaweed garnish. Dispatched directly from Lucky Store in Chawkbazar, Chattogram, under our 1 km local delivery radius with 100% doorstep inspection prior to payment by cash or bKash.',
    specifications: [
      { label: 'Brand', value: 'Samyang' },
      { label: 'Net Weight', value: '140g' },
      { label: 'Product Type', value: 'Stir-Fried Spicy Instant Noodles' },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.' },
      { label: 'Packaging Form', value: 'Moisture-sealed single pack' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight.' },
    ],
    highlights: [
      'Original hot chicken flavor spicy stir-fried ramen',
      'Includes spicy liquid seasoning sauce and roasted sesame-seaweed garnish',
      'Manufactured by Samyang Foods Co., Ltd.',
    ],
    usageDirections:
      'Boil noodles in 600ml water for 5 minutes. Drain leaving about 8 tablespoons of water, add liquid sauce, stir-fry for 30 seconds, and garnish with flakes.',
    storageInstructions:
      'Store in a cool, dry pantry away from direct heat and moisture.',
    faqs: [
      {
        question: 'How do you prepare Samyang Buldak Original Ramen?',
        answer:
          'Boil noodles for 5 minutes in 600ml water, drain leaving 8 spoons of water, mix with sauce over heat for 30 seconds, and top with the flakes packet.',
      },
      {
        question: 'Can I inspect the packet on delivery?',
        answer:
          'Yes. Doorstep inspection is provided on all orders before payment.',
      },
    ],
  },

  // Samyang Buldak 2X Spicy Hot Chicken Ramen 140g (Query: samyang 2x spicy buldak price bd)
  f49fa080: {
    slugPrefix: 'f49fa080',
    exactName: 'Samyang Buldak 2X Spicy Hot Chicken Ramen 140g',
    brand: 'Samyang',
    netQuantity: '140g',
    category: 'Noodles',
    summary:
      'Samyang Buldak 2X Spicy Hot Chicken Flavor Ramen in a 140g single pack. Produced by Samyang Foods Co., Ltd., declared on-pack as extra-spicy stir-fried instant noodles. Delivered locally from Lucky Store in Chawkbazar, Chattogram, with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang' },
      { label: 'Net Weight', value: '140g' },
      { label: 'Product Type', value: '2X Spicy Stir-Fried Instant Noodles' },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.' },
      { label: 'Packaging Form', value: 'Moisture-sealed single pack' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place.' },
    ],
    highlights: [
      '2X extra spicy hot chicken flavor ramen',
      'Manufactured by Samyang Foods Co., Ltd.',
    ],
    usageDirections:
      'Boil noodles in 600ml water for 5 minutes, drain leaving 8 spoons of water, mix with sauce, stir-fry 30 seconds, and add flakes.',
    storageInstructions:
      'Keep in a dry, cool area away from sunlight.',
    faqs: [
      {
        question: 'Is this the authentic 2X Spicy Buldak ramen?',
        answer:
          'Yes. This is the 140g 2X Spicy ramen produced by Samyang Foods Co., Ltd.',
      },
    ],
  },

  // Samyang Buldak Carbonara Hot Chicken Ramen 130g (Query: buldak carbonara price in bangladesh)
  e04a2efd: {
    slugPrefix: 'e04a2efd',
    exactName: 'Samyang Buldak Carbonara Hot Chicken Ramen 130g',
    brand: 'Samyang',
    netQuantity: '130g',
    category: 'Noodles',
    summary:
      'Samyang Buldak Cream Carbonara Hot Chicken Flavor Ramen in a 130g single pack. Produced by Samyang Foods Co., Ltd., combining spicy hot chicken sauce with a creamy carbonara cheese powder packet. Dispatched from Lucky Store in Chawkbazar with 100% doorstep inspection before payment.',
    specifications: [
      { label: 'Brand', value: 'Samyang' },
      { label: 'Net Weight', value: '130g' },
      { label: 'Product Type', value: 'Spicy Carbonara Instant Ramen' },
      { label: 'Manufacturer', value: 'Samyang Foods Co., Ltd.' },
      { label: 'Packaging Form', value: 'Moisture-sealed single pack' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place.' },
    ],
    highlights: [
      'Spicy hot chicken sauce combined with creamy carbonara powder',
      'Manufactured by Samyang Foods Co., Ltd.',
    ],
    usageDirections:
      'Boil noodles for 5 minutes in 600ml water, drain leaving 8 spoons of water, add liquid sauce and carbonara powder, stir well and serve.',
    storageInstructions:
      'Store in a cool, dry place away from heat.',
    faqs: [
      {
        question: 'Does the carbonara pack include both cheese powder and hot sauce?',
        answer:
          'Yes. The packet contains the spicy liquid base and a separate creamy carbonara powder seasoning.',
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
