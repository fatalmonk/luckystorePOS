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
  created_at?: string;
}

export type Category = string;

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
    subCategories: ['biscuits-&-cookies', 'chocolates-&-candies', 'ice-cream', 'cold-beverages'],
  },
  {
    slug: 'cooking-essentials',
    label: 'Cooking Essentials',
    emoji: '🍳',
    subCategories: ['rice-&-grain', 'spices', 'oil-&-ghee', 'salt-&-sugar', 'premium-ingredients', 'condiments'],
  },
  {
    slug: 'personal-care',
    label: 'Personal Care',
    emoji: '🧴',
    subCategories: ['dental', 'facial', 'hair', 'skin'],
  },
  {
    slug: 'cleaning-supplies',
    label: 'Cleaning Supplies',
    emoji: '🧼',
    subCategories: ['cleaning-supplies'],
  },
  {
    slug: 'air-freshner',
    label: 'Air Freshner',
    emoji: '🌬️',
    subCategories: ['air-freshner'],
  },
  {
    slug: 'pest-control',
    label: 'Pest Control',
    emoji: '🐀',
    subCategories: ['pest-control'],
  },
  {
    slug: 'breakfast',
    label: 'Breakfast',
    emoji: '🍳',
    subCategories: ['cereals', 'dairy-&-eggs', 'energy-boosters'],
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
    subCategories: ['tea-&-coffee'],
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


