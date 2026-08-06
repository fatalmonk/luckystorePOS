export interface Product {
  id: string;
  name: string;
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
    slug: 'tea-&-coffee',
    label: 'Tea & Coffee',
    emoji: '☕',
    subCategories: ['tea-&-coffee', 'tea', 'coffee'],
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

/** Helper to normalize raw category strings (e.g. "Rice & Grain" -> "rice-and-grain") */
export function normalizeCategorySlug(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Check if a slug is a category group */
export function getCategoryGroup(slug: string): CategoryGroup | undefined {
  if (!slug) return undefined;
  const normSlug = normalizeCategorySlug(slug);
  return (
    CATEGORY_GROUPS.find((g) => normalizeCategorySlug(g.slug) === normSlug) ||
    CATEGORY_GROUPS.find((g) => normalizeCategorySlug(g.label) === normSlug) ||
    CATEGORY_GROUPS.find((g) => g.subCategories.some((sub) => normalizeCategorySlug(sub) === normSlug))
  );
}

/** Check if a slug is a category group */
export function isCategoryGroup(slug: string): boolean {
  if (!slug) return false;
  const normSlug = slug.toLowerCase().trim();
  return CATEGORY_GROUPS.some((g) => g.slug === normSlug || g.subCategories.includes(normSlug));
}

/** Find parent group for a sub-category slug */
export function getParentGroup(subSlug: string): CategoryGroup | undefined {
  if (!subSlug) return undefined;
  const normSlug = subSlug.toLowerCase().trim();
  const exactGroup = CATEGORY_GROUPS.find((g) => g.slug === normSlug);
  if (exactGroup) return exactGroup;
  return CATEGORY_GROUPS.find((g) => g.subCategories.includes(normSlug));
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
  paymentMethod: 'cod';
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';


