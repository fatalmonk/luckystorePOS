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
