export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  qty: number;
  imageUrl?: string;
  emoji?: string;
  stock?: number;
}
