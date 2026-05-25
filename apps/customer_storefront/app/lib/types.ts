export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
  unit: string;
  category: Category;
  stock: number;
  description: string;
  nutrition?: string;
}

export type Category =
  | 'dairy'
  | 'grocery'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'produce'
  | 'bakery'
  | 'frozen';

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
};

// Sample catalog for demo
export const SAMPLE_CATALOG: Product[] = [
  {
    id: 'p1',
    name: 'Fresh Milk 1L',
    emoji: '🥛',
    price: 78,
    unit: '1 litre',
    category: 'dairy',
    stock: 12,
    description: 'Farm-fresh milk sourced daily from trusted local dairy farms. Pasteurized and packed under strict hygiene standards.',
    nutrition: 'Energy: 65 kcal · Protein: 3.4g · Fat: 3.5g · Calcium: 120mg',
  },
  {
    id: 'p2',
    name: 'Basmati Rice 5kg',
    emoji: '🍚',
    price: 340,
    unit: '5 kg bag',
    category: 'grocery',
    stock: 8,
    description: 'Premium aged basmati rice, long grain, aromatic. Perfect for biryani and daily meals.',
  },
  {
    id: 'p3',
    name: 'Brown Eggs 12pc',
    emoji: '🥚',
    price: 120,
    unit: '12 pieces',
    category: 'dairy',
    stock: 24,
    description: 'Farm fresh brown eggs, collected daily. Rich in protein and nutrients.',
  },
  {
    id: 'p4',
    name: 'Coconut Oil 500ml',
    emoji: '🧴',
    price: 180,
    unit: '500 ml',
    category: 'grocery',
    stock: 3,
    description: 'Pure cold-pressed coconut oil for cooking. Natural and unrefined.',
  },
  {
    id: 'p5',
    name: 'White Bread',
    emoji: '🍞',
    price: 45,
    unit: '400g loaf',
    category: 'bakery',
    stock: 36,
    description: 'Soft white bread, baked fresh every morning. Perfect for sandwiches and toast.',
  },
  {
    id: 'p6',
    name: 'Instant Noodles',
    emoji: '🍜',
    price: 18,
    unit: '1 packet',
    category: 'snacks',
    stock: 180,
    description: 'Quick and tasty instant noodles, ready in 3 minutes. Popular snack choice.',
  },
  {
    id: 'p7',
    name: 'Mango Juice 1L',
    emoji: '🧃',
    price: 85,
    unit: '1 litre',
    category: 'beverages',
    stock: 15,
    description: 'Real mango pulp juice, no preservatives. Made from seasonal mangoes.',
  },
  {
    id: 'p8',
    name: 'Laundry Soap',
    emoji: '🧼',
    price: 28,
    unit: '1 bar',
    category: 'household',
    stock: 42,
    description: 'Power stain removal laundry soap. Gentle on hands, tough on stains.',
  },
  {
    id: 'p9',
    name: 'Green Tea 100g',
    emoji: '🍵',
    price: 55,
    unit: '100g pack',
    category: 'beverages',
    stock: 20,
    description: 'Premium green tea leaves, rich in antioxidants.',
  },
  {
    id: 'p10',
    name: 'Red Lentils 1kg',
    emoji: '🫘',
    price: 110,
    unit: '1 kg',
    category: 'grocery',
    stock: 50,
    description: 'Masoor dal, cleaned and packed hygienically. High protein content.',
  },
  {
    id: 'p11',
    name: 'Cream Biscuits',
    emoji: '🍪',
    price: 35,
    unit: '150g pack',
    category: 'snacks',
    stock: 60,
    description: 'Cream filled sandwich biscuits. Perfect tea-time snack.',
  },
  {
    id: 'p12',
    name: 'Fresh Spinach',
    emoji: '🥬',
    price: 25,
    unit: '500g bunch',
    category: 'produce',
    stock: 18,
    description: 'Organic spinach, freshly harvested. Rich in iron and vitamins.',
  },
];
