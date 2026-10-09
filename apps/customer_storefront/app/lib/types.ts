export interface Product {
  id: string;
  name: string;
  /** Compatibility-only data field. Storefront presentation must not render emoji. */
  emoji: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  unit: string;
  category: Category;
  category_id?: string;
  stock: number;
  description: string;
  nutrition?: string;
  image_url?: string;
  created_at?: string;
  brand?: string;
}

export type Category = string;

export interface CategoryGroup {
  slug: string;
  label: string;
  /** Compatibility-only data field. Use CategoryIcon for storefront presentation. */
  emoji: string;
  subCategories: Category[];
}

/** Category groups — root categories and aggregated sub-categories */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    slug: 'snacks',
    label: 'Snacks',
    emoji: '🍿',
    subCategories: [
      'snacks', 'ice-cream', 'ice-creams', 'cold-beverages', 'beverages', 'juices', 'soft-drinks', 'chocolates-and-candies', 'chocolates-&-candies', 'chips-and-pretzels', 'chips-pretzels', 'chanachur'
    ],
  },
  {
    slug: 'baby-care',
    label: 'Baby Care',
    emoji: '🍼',
    subCategories: ['baby-care'],
  },
  {
    slug: 'tea-and-coffee',
    label: 'Tea & Coffee',
    emoji: '☕',
    subCategories: ['tea-and-coffee', 'tea-&-coffee', 'tea-coffee', 'tea', 'coffee'],
  },
  {
    slug: 'cleaning-supplies',
    label: 'Cleaning Supplies',
    emoji: '🧼',
    subCategories: ['cleaning-supplies'],
  },
  {
    slug: 'biscuits-and-cookies',
    label: 'Biscuits & Cookies',
    emoji: '🍪',
    subCategories: ['biscuits-&-cookies', 'biscuits-cookies', 'biscuits', 'cookies'],
  },
  {
    slug: 'cooking-essentials',
    label: 'Cooking Essentials',
    emoji: '🌾',
    subCategories: [
      'cooking-essentials', 'rice-and-grain', 'rice-&-grain', 'oil-and-ghee', 'oil-&-ghee', 'spices', 'salt-and-sugar', 'salt-&-sugar', 'premium-ingredients'
    ],
  },
  {
    slug: 'breakfast',
    label: 'Breakfast',
    emoji: '🍳',
    subCategories: [
      'breakfast', 'dairy-and-eggs', 'dairy-&-eggs', 'cereals', 'jam-and-spreads', 'jam-spreads', 'soup'
    ],
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    emoji: '🔌',
    subCategories: ['electronics'],
  },
  {
    slug: 'personal-care',
    label: 'Personal Care',
    emoji: '🧺',
    subCategories: [
      'personal-care', 'skin', 'skin-care', 'oral-care', 'dental', 'hair', 'facial', 'grooming', 'fragrance', 'perfume-&-body-spray'
    ],
  },
  {
    slug: 'condiments',
    label: 'Condiments',
    emoji: '🥫',
    subCategories: ['condiments', 'sauces', 'pickles'],
  },
  {
    slug: 'baking-needs',
    label: 'Baking Needs',
    emoji: '🥐',
    subCategories: ['baking-needs'],
  },
  {
    slug: 'energy-boosters',
    label: 'Energy Boosters',
    emoji: '⚡',
    subCategories: ['energy-boosters', 'energy-drinks', 'malt-drinks'],
  },
  {
    slug: 'noodles',
    label: 'Noodles',
    emoji: '🍜',
    subCategories: ['noodles'],
  },
  {
    slug: 'air-freshner',
    label: 'Air Freshener',
    emoji: '🌬️',
    subCategories: ['air-freshner'],
  },
  {
    slug: 'pest-control',
    label: 'Pest Control',
    emoji: '🐀',
    subCategories: ['pest-control'],
  },
];

export interface CategoryRailItem {
  slug: string;
  label: string;
}

/**
 * Categories displayed in the Header horizontal category rail.
 * Sub-categories are shown for parent groups (Snacks, Cooking Essentials, Breakfast, Personal Care)
 * and parent categories are shown for groups without sub-categories (Electronics, Tea & Coffee, etc.).
 */
export const CATEGORY_RAIL_ITEMS: CategoryRailItem[] = [
  // Snacks sub-categories
  { slug: 'ice-cream', label: 'Ice-Cream' },
  { slug: 'cold-beverages', label: 'Cold Beverages' },
  { slug: 'chocolates-and-candies', label: 'Chocolates & Candies' },
  { slug: 'chips-pretzels', label: 'Chips & Pretzels' },

  // Cooking Essentials sub-categories
  { slug: 'rice-and-grain', label: 'Rice & Grain' },
  { slug: 'oil-and-ghee', label: 'Oil & Ghee' },
  { slug: 'spices', label: 'Spices' },
  { slug: 'salt-and-sugar', label: 'Salt & Sugar' },
  { slug: 'premium-ingredients', label: 'Premium Ingredients' },

  // Breakfast sub-categories
  { slug: 'dairy-and-eggs', label: 'Dairy & Eggs' },
  { slug: 'cereals', label: 'Cereals' },
  { slug: 'jam-spreads', label: 'Jam & Spreads' },
  { slug: 'soup', label: 'Soup' },

  // Personal Care sub-categories
  { slug: 'skin', label: 'Skin Care' },
  { slug: 'hair', label: 'Hair' },
  { slug: 'facial', label: 'Facial' },
  { slug: 'oral-care', label: 'Oral Care' },
  { slug: 'fragrance', label: 'Fragrance' },
  { slug: 'grooming', label: 'Grooming' },

  // Categories without sub-categories
  { slug: 'biscuits-and-cookies', label: 'Biscuits & Cookies' },
  { slug: 'tea-and-coffee', label: 'Tea & Coffee' },
  { slug: 'noodles', label: 'Noodles' },
  { slug: 'baking-needs', label: 'Baking Needs' },
  { slug: 'condiments', label: 'Condiments' },
  { slug: 'energy-boosters', label: 'Energy Boosters' },
  { slug: 'baby-care', label: 'Baby Care' },
  { slug: 'cleaning-supplies', label: 'Cleaning Supplies' },
  { slug: 'pest-control', label: 'Pest Control' },
  { slug: 'air-freshner', label: 'Air Freshener' },
  { slug: 'electronics', label: 'Electronics' },
];

export const BENGALI_CATEGORY_NAMES: Record<string, string> = {
  'cooking-essentials': 'রান্নার প্রয়োজনীয় পণ্য',
  'breakfast': 'সকালের নাস্তা',
  'snacks': 'নাস্তা ও পানীয়',
  'household': 'ঘরের টুকিটাকি',
  'cleaning-supplies': 'পরিচ্ছন্নতার সামগ্রী',
  'personal-care': 'ব্যক্তিগত যত্ন',
  'rice-and-grain': 'চাল ও শস্য',
  'oil-and-ghee': 'তেল ও ঘি',
  'tea-and-coffee': 'চা ও কফি',
  'tea-&-coffee': 'চা ও কফি',
  'dairy-and-eggs': 'দুধ ও ডিম',
  'biscuits-and-cookies': 'বিস্কুট ও কুকিজ',
  'baby-care': 'শিশুর যত্ন',
  'electronics': 'ইলেকট্রনিক্স',
  'condiments': 'সস ও আচার',
  'baking-needs': 'বেকিং উপকরণ',
  'energy-boosters': 'এনার্জি ড্রিংকস',
  'noodles': 'নুডলস',
  'air-freshner': 'এয়ার ফ্রেশনার',
  'pest-control': 'পোকামাকড় নিয়ন্ত্রণ',
  'spices': 'মসলা',
  'chocolates-and-candies': 'চকলেট ও ক্যান্ডি',
  'ice-cream': 'আইসক্রিম',
  'cold-beverages': 'পানীয়',
  'cereals': 'সিরিয়াল',
  'chips-pretzels': 'চিপস ও স্ন্যাক্স',
  'chips-and-pretzels': 'চিপস ও স্ন্যাক্স',
  'salt-and-sugar': 'লবণ ও চিনি',
  'salt-&-sugar': 'লবণ ও চিনি',
  'premium-ingredients': 'প্রিমিয়াম উপাদান',
  'jam-spreads': 'জ্যাম ও স্প্রেড',
  'jam-and-spreads': 'জ্যাম ও স্প্রেড',
  'soup': 'সুপ',
  'skin': 'ত্বকের যত্ন',
  'skin-care': 'ত্বকের যত্ন',
  'hair': 'চুলের যত্ন',
  'facial': 'ফেসিয়াল',
  'oral-care': 'মুখের যত্ন',
  'grooming': 'গ্রুমিং',
  'fragrance': 'সুগন্ধি',
};

/** Helper to normalize raw category strings (e.g. "Rice & Grain" -> "rice-and-grain") */
export function normalizeCategorySlug(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'tea-coffee': 'tea-and-coffee',
  'dairy': 'dairy-and-eggs',
  'pantry': 'cooking-essentials',
  'rice-and-grains': 'rice-and-grain',
  'skin-care': 'personal-care',
  'chips-and-pretzels': 'snacks',
};

/**
 * Resolves the single canonical category slug across the entire application.
 * Both storefront routing and sitemap generation MUST use this function.
 */
export function getCanonicalCategorySlug(raw: string): string {
  const normalized = normalizeCategorySlug(raw);
  if (!normalized) return '';
  if (CATEGORY_SLUG_ALIASES[normalized]) {
    return CATEGORY_SLUG_ALIASES[normalized];
  }
  const group = CATEGORY_GROUPS.find(
    (g) => normalizeCategorySlug(g.slug) === normalized || normalizeCategorySlug(g.label) === normalized,
  );
  if (group) return normalizeCategorySlug(group.slug);
  return normalized;
}

/** Check if a slug is a category group */
export function getCategoryGroup(slug: string): CategoryGroup | undefined {
  if (!slug) return undefined;
  const normSlug = normalizeCategorySlug(slug);
  return (
    CATEGORY_GROUPS.find((g) => normalizeCategorySlug(g.slug) === normSlug) ||
    CATEGORY_GROUPS.find((g) => normalizeCategorySlug(g.label) === normSlug)
  );
}

/** Check if a slug is a category group */
export function isCategoryGroup(slug: string): boolean {
  if (!slug) return false;
  const normSlug = normalizeCategorySlug(slug);
  return CATEGORY_GROUPS.some((g) => normalizeCategorySlug(g.slug) === normSlug || g.subCategories.some((sub) => normalizeCategorySlug(sub) === normSlug));
}

/** Find parent group for a sub-category slug */
export function getParentGroup(subSlug: string): CategoryGroup | undefined {
  if (!subSlug) return undefined;
  const normSlug = normalizeCategorySlug(subSlug);
  const exactGroup = CATEGORY_GROUPS.find((g) => normalizeCategorySlug(g.slug) === normSlug);
  if (exactGroup) return exactGroup;
  return CATEGORY_GROUPS.find((g) => g.subCategories.some((sub) => normalizeCategorySlug(sub) === normSlug));
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethod: 'cod' | 'bkash';
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
