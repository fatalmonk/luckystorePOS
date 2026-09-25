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
  deliverySlot?: string;
  paymentMethod: 'cod' | 'bkash';
  items: { id: string; name: string; price: number; qty: number; unit?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  idempotencyKey: string;
}

export interface CreatedOrder {
  id: string;
  order_number: string;
  replayed?: boolean;
  trackingToken?: string;
}

interface RpcOrderResult {
  order?: CreatedOrder;
  replayed?: boolean;
  id?: string;
  order_number?: string;
}

export async function createOrder(input: OrderInput, rpcClient = supabase): Promise<CreatedOrder> {
  // Validate input with Zod — use parsed.data, NOT raw input
  const parsed = checkoutSchema.safeParse({
    ...input,
    tenantId: TENANT_ID,
    storeId: STORE_ID,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join('; '));
  }
  const data = parsed.data;

  const { data: result, error } = await rpcClient.rpc('create_order_with_stock_idempotent', {
    p_order_number: data.orderNumber,
    p_tenant_id: TENANT_ID,
    p_store_id: STORE_ID,
    p_customer_name: data.customerName,
    p_customer_phone: data.customerPhone,
    p_customer_address: data.customerAddress,
    p_notes: data.notes ?? null,
    p_items: data.items,
    p_subtotal: data.subtotal,
    p_delivery_fee: data.deliveryFee,
    p_total: data.total,
    p_payment_method: data.paymentMethod,
    p_delivery_slot: data.deliverySlot ?? null,
    p_idempotency_key: data.idempotencyKey ?? null,
  });

  if (error) throw error;

  const rpcResult = result as RpcOrderResult;
  const order = rpcResult.order ?? rpcResult;
  const replayed = rpcResult.order ? rpcResult.replayed === true : false;

  if (replayed) return { ...order, replayed: true } as CreatedOrder;

  return { ...order, replayed } as CreatedOrder;
}
