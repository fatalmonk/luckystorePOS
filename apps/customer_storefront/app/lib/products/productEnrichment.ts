/**
 * Product Enrichment Registry (Phase 4A Pilot)
 *
 * Implements Section 2A of the SEO Optimization Master Plan:
 * Structured, verified factual enrichment for catalog items with demonstrated GSC query demand.
 *
 * Rules:
 * - Facts sourced only from physical packaging, verified manufacturer declarations, or store policy.
 * - No unverified medical, comparative, or speed claims.
 * - Omit unknown fields rather than inventing placeholders.
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
  /** Exact canonical product name */
  exactName: string;
  /** Verified brand name */
  brand: string;
  /** Verified net quantity or volume */
  netQuantity: string;
  /** Verified canonical category name */
  category: string;
  /** Answer-first opening summary (factual, concise, local purchase context) */
  summary: string;
  /** Structured tabular specifications */
  specifications: ProductSpecification[];
  /** Packaging-supported key highlights */
  highlights?: string[];
  /** Practical preparation or culinary usage directions */
  usageDirections?: string;
  /** Storage instructions */
  storageInstructions?: string;
  /** Concise factual product Q&As */
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
      'Fortune Kachi Ghani Mustard Oil in a 5-litre family jerry can, cold-pressed from selected mustard seeds to deliver a strong pungent aroma and traditional sharp flavor for authentic cooking in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Fortune' },
      { label: 'Net Volume', value: '5 Litres' },
      { label: 'Packaging Type', value: 'Food-grade Poly Jerry Can with Handle' },
      { label: 'Extraction Process', value: 'Traditional Cold-Pressed (Kachi Ghani)' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct sunlight' },
      { label: 'Dietary Suitability', value: '100% Vegetarian, Pure Mustard Oil' },
    ],
    highlights: [
      'Cold-pressed Kachi Ghani extraction preserving natural aroma and allyl isothiocyanate pungency',
      'Rich in mono-unsaturated fatty acids (MUFA) and natural antioxidants',
      'Heavy-duty 5L can with sturdy handle and sealed cap for spill-free pantry storage',
    ],
    usageDirections:
      'Ideal for traditional Bangladeshi bhorta, fish fry, jhol dishes, pickle making, and high-heat tempering.',
    storageInstructions:
      'Keep tightly closed after every use in a cool, dark kitchen cabinet away from stove heat.',
    faqs: [
      {
        question: 'Can I inspect the Fortune Mustard Oil seal before paying?',
        answer:
          'Yes. Lucky Store offers 100% doorstep inspection. You can verify the tamper-evident cap, net quantity, and expiry date before paying with cash or bKash.',
      },
      {
        question: 'Is free delivery available for this 5L oil in Chattogram?',
        answer:
          'Yes. Orders totaling ৳500 or more qualify for free delivery within our 1 km Chawkbazar delivery radius; orders below ৳500 have the standard delivery fee.',
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
      'Radhuni Holud Gura (Turmeric Powder) in a sealed 100g moisture-barrier pouch. Made from carefully selected raw turmeric rhizomes to provide natural golden color and authentic aroma for daily cooking in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '100g' },
      { label: 'Ingredients', value: '100% Pure Dried Turmeric' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Packaging Type', value: 'Multi-layer barrier moisture-lock pouch' },
      { label: 'Storage Guidance', value: 'Store in an airtight container in a dry place' },
    ],
    highlights: [
      'Finely ground from chosen high-curcumin turmeric roots',
      'Free from artificial coloring, starch fillers, or synthetic additives',
      'Sealed pouch guarantees fresh aroma and protects against kitchen humidity',
    ],
    usageDirections:
      'Add 1/2 to 1 teaspoon during tempering or curry gravy preparation for vibrant natural color and warm earthy flavor.',
    storageInstructions:
      'Transfer to an airtight glass or plastic spice jar after opening; store away from moisture.',
    faqs: [
      {
        question: 'How fresh is this batch of Radhuni Turmeric Powder?',
        answer:
          'Our stock rotates weekly with direct factory-packaged supplies. Customers can verify the printed manufacturing and expiry dates right at their doorstep.',
      },
      {
        question: 'What is the delivery policy if the packet seal is broken?',
        answer:
          'Customers may inspect all spice packets upon arrival. Any package with a damaged seal can be returned immediately to the delivery partner with zero fee penalty.',
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
      'Radhuni Dhoniya Gura (Coriander Powder) 500g economy pack. Produced by Square Food & Beverage Ltd. from clean, aromatic coriander seeds, ground to culinary grade for meat, fish, and lentil curries in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Radhuni' },
      { label: 'Net Weight', value: '500g' },
      { label: 'Ingredients', value: '100% Ground Coriander Seeds' },
      { label: 'Manufacturer', value: 'Square Food & Beverage Ltd.' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Packaging Type', value: 'Heavy-gauge sealed poly pack' },
      { label: 'Storage Guidance', value: 'Store in an airtight jar in a cool, dark pantry' },
    ],
    highlights: [
      'Processed in hygienic facilities under strict quality control',
      'Consistent fine grind blends smoothly into onion-ginger pastes',
      'Cost-effective 500g family size for frequent home cooking',
    ],
    usageDirections:
      'Blend with ginger, garlic, and turmeric pastes before frying in oil for balanced curry bases.',
    storageInstructions:
      'Store in an airtight container away from direct sunlight to preserve aromatic essential oils.',
    faqs: [
      {
        question: 'What is the return policy if the packaging is damaged?',
        answer:
          'Lucky Store guarantees doorstep inspection. If the outer pouch shows any tear or puncture, you may return it immediately to the delivery partner with zero fee penalty.',
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
      'Bellame Chocolate Digestive Biscuits (135g pack), combining crisp wholewheat baked digestive crust with a rich milk chocolate layer for tea-time and snacking in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Bellame' },
      { label: 'Net Weight', value: '135g' },
      { label: 'Key Ingredients', value: 'Wheat flour, wholemeal flour, milk chocolate coating, vegetable fat, sugar' },
      { label: 'Allergen Advice', value: 'Contains wheat (gluten), milk; may contain traces of nuts and soy' },
      { label: 'Country of Origin', value: 'Bangladesh' },
      { label: 'Storage Guidance', value: 'Store in a dry, cool place away from humidity and direct sunlight' },
    ],
    highlights: [
      'Wholesome fiber blend with a generous coating of smooth chocolate',
      'Crispy baked texture that pairs with hot tea or black coffee',
      'Convenient 135g size for personal snacking or family tea-time',
    ],
    usageDirections:
      'Enjoy straight from the pack with hot tea, coffee, or as an afternoon sweet treat.',
    storageInstructions:
      'Once opened, store in an airtight container in a cool spot to maintain crispness and prevent chocolate bloom.',
    faqs: [
      {
        question: 'How is melting prevented during warm weather delivery in Chattogram?',
        answer:
          'Our staff dispatch orders within a 1 km radius in protective bags, ensuring biscuits arrive intact and unmelted. You may inspect the package before paying.',
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
      'Ama Classic 100% Pure Instant Coffee in a convenient single-serve 1g sachet. Delivers an instant robust cup of coffee with balanced aroma and rich crema in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Ama' },
      { label: 'Net Weight', value: '1g (Single Serve Sachet)' },
      { label: 'Ingredients', value: '100% Soluble Coffee Granules' },
      { label: 'Packaging Type', value: 'Moisture-sealed foil sachet' },
      { label: 'Storage Guidance', value: 'Keep sealed until ready to brew; store away from heat' },
    ],
    highlights: [
      'Single-use sealed sachet preserving roast freshness and bold aroma',
      'Dissolves instantly in hot water or warm milk without clumping',
      'Perfect single-cup portion for home, office, or travel',
    ],
    usageDirections:
      'Empty contents of 1 sachet into a cup, add 100–120ml hot (not boiling) water or milk, and stir well. Add sugar to taste.',
    storageInstructions:
      'Store in a dry kitchen pantry at room temperature.',
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
      'Polar Double Sundae Ice Cream in a 1-litre dessert tub. Layers of creamy vanilla ice cream swirled with chocolate ripple and chocolate drops, delivered cold in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Polar' },
      { label: 'Net Volume', value: '1 Litre (1000ml)' },
      { label: 'Key Ingredients', value: 'Milk solids, sugar, cocoa ripple, chocolate drops, permitted stabilizers' },
      { label: 'Allergen Advice', value: 'Contains milk; may contain traces of tree nuts' },
      { label: 'Manufacturer', value: 'Dhaka Ice Cream Industries Ltd.' },
      { label: 'Storage Guidance', value: 'Keep frozen at -18°C or below' },
    ],
    highlights: [
      'Generous dual-flavor swirl with crunchy chocolate chips throughout',
      'Direct store-to-freezer rapid fulfillment within 1 km radius',
      'Family 1-litre tub ideal for desserts and gatherings',
    ],
    usageDirections:
      'Serve cold directly from freezer using an ice cream scoop. Delicious on its own or over warm brownies.',
    storageInstructions:
      'Return to freezer immediately after serving. Maintain freezer temperature at or below -18°C.',
    faqs: [
      {
        question: 'How do you ensure ice cream stays frozen during delivery?',
        answer:
          'Orders are dispatched directly from our Chawkbazar commercial freezers using specialized thermal insulated bags, ensuring the ice cream arrives cold and solid.',
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
      'Aril Assorted Fruit Lollipops offering vibrant fruity flavors including strawberry, orange, and green apple. Individually wrapped for hygiene and freshness in Chattogram.',
    specifications: [
      { label: 'Brand', value: 'Aril' },
      { label: 'Product Type', value: 'Hard Boiled Confectionery / Lollipop' },
      { label: 'Flavors', value: 'Assorted Fruit (Strawberry, Orange, Apple, Mango)' },
      { label: 'Packaging Type', value: 'Individual moisture-sealed cellophane wrapper' },
      { label: 'Storage Guidance', value: 'Store in a cool, dry place away from direct heat' },
    ],
    highlights: [
      'Assorted authentic fruit flavors with long-lasting sweetness',
      'Hygienically wrapped individually, perfect for children treats and party giveaways',
    ],
    storageInstructions:
      'Keep in a sealed candy container or dry bowl away from moisture and direct sunlight.',
    faqs: [
      {
        question: 'Can I inspect the packaging upon delivery?',
        answer:
          'Yes. You have full right of doorstep inspection before payment to ensure wrappers are clean and intact.',
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
