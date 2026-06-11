export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  unit: string;
  category: Category;
  stock: number;
  description: string;
  nutrition?: string;
  image_url?: string;
}

export type Category =
  | 'dairy'
  | 'grocery'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'produce'
  | 'bakery'
  | 'frozen'
  | 'chips'
  | 'biscuits-cookies'
  | 'chocolates-candies'
  | 'ice-cream'
  | 'tea-coffee'
  | 'cereals'
  | 'oil'
  | 'rice-grain'
  | 'condiments'
  | 'spices'
  | 'eggs'
  | 'personal-care'
  | 'cleaning-supply'
  | 'air-freshener'
  | 'baby-care'
  | 'electronics'
  | 'baking-needs';

export interface CategoryGroup {
  slug: string;
  label: string;
  emoji: string;
  subCategories: Category[];
}

/** Category groups — each group page aggregates multiple sub-categories into swimlanes */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    slug: 'snacks',
    label: 'Snacks',
    emoji: '🍪',
    subCategories: ['snacks', 'chips', 'biscuits-cookies', 'chocolates-candies', 'ice-cream', 'tea-coffee', 'beverages', 'cereals'],
  },
  {
    slug: 'cooking-needs',
    label: 'Cooking Needs',
    emoji: '🍳',
    subCategories: ['oil', 'rice-grain', 'condiments', 'spices'],
  },
  {
    slug: 'dairy-eggs',
    label: 'Dairy & Eggs',
    emoji: '🥛',
    subCategories: ['dairy', 'eggs'],
  },
  {
    slug: 'personal-care',
    label: 'Personal Care',
    emoji: '🧴',
    subCategories: ['personal-care', 'cleaning-supply', 'air-freshener'],
  },
  {
    slug: 'baby-care',
    label: 'Baby Care',
    emoji: '🍼',
    subCategories: ['baby-care'],
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    emoji: '🔌',
    subCategories: ['electronics'],
  },
  {
    slug: 'baking-needs',
    label: 'Baking Needs',
    emoji: '🧁',
    subCategories: ['baking-needs'],
  },
];

/** Check if a slug is a category group */
export function getCategoryGroup(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.slug === slug);
}

/** Check if a slug is a category group */
export function isCategoryGroup(slug: string): boolean {
  return CATEGORY_GROUPS.some((g) => g.slug === slug);
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

export const CATEGORY_LABELS: Record<Category, string> = {
  dairy: 'Dairy',
  grocery: 'Grocery',
  beverages: 'Beverages',
  snacks: 'Snacks',
  household: 'Household',
  produce: 'Fresh',
  bakery: 'Bakery',
  frozen: 'Frozen',
  chips: 'Chips',
  'biscuits-cookies': 'Biscuits & Cookies',
  'chocolates-candies': 'Chocolates & Candies',
  'ice-cream': 'Ice Cream',
  'tea-coffee': 'Tea & Coffee',
  cereals: 'Cereals',
  oil: 'Oil',
  'rice-grain': 'Rice & Grain',
  condiments: 'Condiments',
  spices: 'Spices',
  eggs: 'Eggs',
  'personal-care': 'Personal Care',
  'cleaning-supply': 'Cleaning Supply',
  'air-freshener': 'Air Freshener',
  'baby-care': 'Baby Care',
  electronics: 'Electronics',
  'baking-needs': 'Baking Needs',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  dairy: '🥛',
  grocery: '🍚',
  beverages: '🧃',
  snacks: '🍪',
  household: '🧼',
  produce: '🥬',
  bakery: '🍞',
  frozen: '🧊',
  chips: '🥔',
  'biscuits-cookies': '🍘',
  'chocolates-candies': '🍫',
  'ice-cream': '🍦',
  'tea-coffee': '☕',
  cereals: '🥣',
  oil: '🫒',
  'rice-grain': '🌾',
  condiments: '🥫',
  spices: '🌶️',
  eggs: '🥚',
  'personal-care': '🧴',
  'cleaning-supply': '🧽',
  'air-freshener': '🌸',
  'baby-care': '🍼',
  electronics: '🔌',
  'baking-needs': '🧁',
};
