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
  items: { id: string; name: string; price: number; qty: number; unit?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface CreatedOrder {
  id: string;
  order_number: string;
}

export async function createOrder(input: OrderInput): Promise<CreatedOrder> {
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

  const { data: result, error } = await supabase.rpc('create_order_with_stock', {
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
    p_delivery_slot: data.deliverySlot ?? null,
  });

  if (error) throw error;

  // Broadcast realtime notification to admin web and mobile app
  // Use a timeout to ensure channel cleanup even if subscription hangs
  let channel: ReturnType<typeof supabase.channel> | null = null;
  const cleanupTimer = setTimeout(() => {
    if (channel) {
      try {
        supabase.removeChannel(channel);
        channel = null;
      } catch (err) {
        console.error('Failed to cleanup channel after timeout:', err);
      }
    }
  }, 10_000); // 10s max wait for subscription

  try {
    channel = supabase.channel(`store-notifications:${STORE_ID}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel!.send({
          type: 'broadcast',
          event: 'new-delivery-order',
          payload: {
            id: (result as any).id,
            orderNumber: (result as any).order_number || data.orderNumber,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerAddress: data.customerAddress,
            total: data.total,
            itemsCount: data.items.length,
            storeId: STORE_ID,
          },
        }).then(() => {
          clearTimeout(cleanupTimer);
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
        }).catch((err) => {
          clearTimeout(cleanupTimer);
          console.error('Failed to send broadcast:', err);
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(cleanupTimer);
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      }
    });
  } catch (err) {
    clearTimeout(cleanupTimer);
    console.error('Failed to send realtime broadcast:', err);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (cleanupErr) {
        console.error('Failed to cleanup channel after error:', cleanupErr);
      }
    }
  }

  return result as CreatedOrder;
}