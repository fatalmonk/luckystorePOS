export interface MobileOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
  total?: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface MobileOrderDto {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: MobileOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cod' | 'bkash';
  deliverySlot?: string;
  createdAt: string;
}

export const TIMELINE_STAGES: { id: OrderStatus; labelEn: string; labelBn: string }[] = [
  { id: 'pending', labelEn: 'Order Placed', labelBn: 'অর্ডার গৃহীত হয়েছে' },
  { id: 'confirmed', labelEn: 'Order Confirmed', labelBn: 'অর্ডার নিশ্চিত হয়েছে' },
  { id: 'preparing', labelEn: 'Preparing in Store', labelBn: 'প্যাকেট প্রস্তুত হচ্ছে' },
  { id: 'out_for_delivery', labelEn: 'Out for Delivery', labelBn: 'ডেলিভারির জন্য পাঠানো হয়েছে' },
  { id: 'delivered', labelEn: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন' },
];

export function getStatusStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
      return 1;
    case 'preparing':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
      return -1;
    default:
      return 0;
  }
}
