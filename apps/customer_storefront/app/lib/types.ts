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
    slug: 'ice-cream',
    label: 'Ice Cream',
    emoji: '🍦',
    subCategories: ['ice-cream', 'ice-creams'],
  },
  {
    slug: 'cold-beverages',
    label: 'Cold Beverages',
    emoji: '🥤',
    subCategories: ['cold-beverages', 'beverages', 'juices', 'soft-drinks'],
  },
  {
    slug: 'chips-and-pretzels',
    label: 'Chips & Pretzels',
    emoji: '🍿',
    subCategories: ['chips-&-pretzels', 'chips-pretzels', 'chips', 'pretzels'],
  },
  {
    slug: 'condiments',
    label: 'Condiments',
    emoji: '🥫',
    subCategories: ['condiments', 'sauces', 'pickles'],
  },
  {
    slug: 'energy-boosters',
    label: 'Energy Boosters',
    emoji: '⚡',
    subCategories: ['energy-boosters', 'energy-drinks', 'malt-drinks'],
  },
  {
    slug: 'biscuits-and-cookies',
    label: 'Biscuits & Cookies',
    emoji: '🍪',
    subCategories: ['biscuits-&-cookies', 'biscuits-cookies', 'biscuits', 'cookies'],
  },
  {
    slug: 'chocolates-and-candies',
    label: 'Chocolates & Candies',
    emoji: '🍫',
    subCategories: ['chocolates-&-candies', 'chocolates-candies', 'chocolates', 'candies'],
  },
  {
    slug: 'dairy-and-eggs',
    label: 'Dairy & Eggs',
    emoji: '🥛',
    subCategories: ['dairy-&-eggs', 'dairy-eggs', 'dairy', 'eggs', 'milk'],
  },
  {
    slug: 'rice-and-grain',
    label: 'Rice & Grains',
    emoji: '🍚',
    subCategories: ['rice-&-grain', 'rice-grain', 'rice', 'grains'],
  },
  {
    slug: 'spices',
    label: 'Spices & Masala',
    emoji: '🌶️',
    subCategories: ['spices', 'masala'],
  },
  {
    slug: 'oil-and-ghee',
    label: 'Oil & Ghee',
    emoji: '🛢️',
    subCategories: ['oil-&-ghee', 'oil-ghee', 'oil', 'ghee'],
  },
  {
    slug: 'cereals',
    label: 'Cereals & Oats',
    emoji: '🥣',
    subCategories: ['cereals', 'oats'],
  },
  {
    slug: 'personal-care',
    label: 'Personal Care',
    emoji: '🧴',
    subCategories: ['personal-care', 'dental', 'facial', 'hair', 'skin', 'perfume-&-body-spray', 'grooming'],
  },
  {
    slug: 'cooking-essentials',
    label: 'Cooking Essentials',
    emoji: '🌾',
    subCategories: ['cooking-essentials', 'salt-&-sugar', 'premium-ingredients'],
  },
  {
    slug: 'snacks',
    label: 'Snacks',
    emoji: '🍿',
    subCategories: ['snacks', 'chanachur'],
  },
  {
    slug: 'breakfast',
    label: 'Breakfast',
    emoji: '🍳',
    subCategories: ['breakfast'],
  },
  {
    slug: 'tea-&-coffee',
    label: 'Tea & Coffee',
    emoji: '☕',
    subCategories: ['tea-&-coffee', 'tea', 'coffee'],
  },
  {
    slug: 'baking-needs',
    label: 'Baking Needs',
    emoji: '🧁',
    subCategories: ['baking-needs'],
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    emoji: '🔌',
    subCategories: ['electronics'],
  },
  {
    slug: 'cleaning-supplies',
    label: 'Cleaning Supplies',
    emoji: '🧼',
    subCategories: ['cleaning-supplies'],
  },
  {
    slug: 'pest-control',
    label: 'Pest Control',
    emoji: '🐛',
    subCategories: ['pest-control'],
  },
  {
    slug: 'air-freshner',
    label: 'Air Freshener',
    emoji: '🌬️',
    subCategories: ['air-freshner'],
  },
  {
    slug: 'baby-care',
    label: 'Baby Care',
    emoji: '🍼',
    subCategories: ['baby-care'],
  },
];

/** Check if a slug is a category group */
export function getCategoryGroup(slug: string): CategoryGroup | undefined {
  if (!slug) return undefined;
  const normSlug = slug.toLowerCase().trim();
  return (
    CATEGORY_GROUPS.find((g) => g.slug === normSlug) ||
    CATEGORY_GROUPS.find((g) => g.subCategories.includes(normSlug))
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


