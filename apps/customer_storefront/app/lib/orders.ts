import { supabase } from './supabase';
import { checkoutSchema } from './validation';

const TENANT_ID = '00000000-0000-0000-0000-000000000001'; // TODO: set from env
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export interface OrderInput {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: { id: string; name: string; price: number; qty: number; unit?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export async function createOrder(input: OrderInput) {
  const parsed = checkoutSchema.safeParse({ ...input, tenantId: TENANT_ID, storeId: STORE_ID });
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join('; '));

  const { data, error } = await supabase.rpc('create_order_with_stock', {
    p_order_number: input.orderNumber,
    p_tenant_id: TENANT_ID,
    p_store_id: STORE_ID,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_address: input.customerAddress,
    p_notes: input.notes ?? null,
    p_items: input.items,
    p_subtotal: input.subtotal,
    p_delivery_fee: input.deliveryFee,
    p_total: input.total,
  });

  if (error) throw error;
  return data as { id: string; order_number: string };
}
