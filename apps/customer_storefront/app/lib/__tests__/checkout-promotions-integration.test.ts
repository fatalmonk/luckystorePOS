import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder, type OrderInput } from '../orders';

/**
 * End-to-end simulation of PostgreSQL server checkout validation
 * matching public.create_order_with_stock_idempotent_unowned
 * defined in supabase/migrations/20261015100000_add_week_one_online_item_promotion.sql
 */
interface ServerItem {
  id: string;
  name: string;
  price: number;
  mrp: number;
  isActive: boolean;
  qtyOnHand: number;
  reserved: number;
  qtyReservedOnline: number;
}

interface ServerPromotion {
  itemId: string;
  expectedName: string;
  expectedPrice: number;
  expectedMrp: number;
  discountPercent: number;
  campaignKey: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
}

interface ServerState {
  tenantId: string;
  storeId: string;
  items: Map<string, ServerItem>;
  promotions: ServerPromotion[];
  idempotencyStore: Map<string, any>;
  currentTime: Date;
}

function createSimulatedPostgresCheckout(state: ServerState) {
  return async (rpcName: string, args: Record<string, any>) => {
    if (rpcName !== 'create_order_with_stock_idempotent') {
      throw new Error(`Unexpected RPC: ${rpcName}`);
    }

    // 1. Store & Tenant isolation check
    if (args.p_store_id !== state.storeId) {
      return { data: null, error: { message: 'Unsupported storefront store' } };
    }
    if (args.p_tenant_id !== state.tenantId) {
      return { data: null, error: { message: 'Invalid storefront tenant' } };
    }

    // 2. Idempotency replay check before validating potentially stale cart
    const idempotencyKey = (args.p_idempotency_key || '').trim();
    if (idempotencyKey && state.idempotencyStore.has(idempotencyKey)) {
      const priorResponse = state.idempotencyStore.get(idempotencyKey);
      return {
        data: {
          order: priorResponse,
          replayed: true,
        },
        error: null,
      };
    }

    // 3. Validate items array
    const items = args.p_items;
    if (!Array.isArray(items) || items.length === 0) {
      return { data: null, error: { message: 'Cart is empty' } };
    }

    // 4. Validate each cart item exists, is active, and has available stock
    for (const item of items) {
      const serverItem = state.items.get(item.id);
      if (!serverItem || !serverItem.isActive || serverItem.price === null || serverItem.price < 0) {
        return {
          data: null,
          error: { message: 'Item is not available in the storefront catalog' },
        };
      }
      const sellableQty = Math.max(
        0,
        serverItem.qtyOnHand - serverItem.reserved - serverItem.qtyReservedOnline,
      );
      if (sellableQty < item.qty) {
        return {
          data: null,
          error: { message: `Insufficient stock for item ${serverItem.name}` },
        };
      }
    }

    // 5. Authoritatively calculate promotional pricing on server
    let computedSubtotal = 0;
    const canonicalItems: any[] = [];

    for (const item of items) {
      const serverItem = state.items.get(item.id)!;
      const nowIso = state.currentTime.toISOString();

      // Find matching active promotion
      const activePromo = state.promotions
        .filter(
          (p) =>
            p.itemId === item.id &&
            p.isCurrent &&
            p.expectedName === serverItem.name &&
            p.expectedPrice === serverItem.price &&
            p.expectedMrp === serverItem.mrp &&
            p.startsAt <= nowIso &&
            p.endsAt > nowIso,
        )
        .sort((a, b) => b.discountPercent - a.discountPercent)[0];

      const discountPercent = activePromo ? activePromo.discountPercent : 0;
      const unitPrice = Math.round(serverItem.price * (1 - discountPercent / 100) * 100) / 100;
      const lineTotal = Math.round(unitPrice * item.qty * 100) / 100;
      computedSubtotal = Math.round((computedSubtotal + lineTotal) * 100) / 100;

      canonicalItems.push({
        id: item.id,
        name: serverItem.name,
        price: unitPrice,
        base_price: serverItem.price,
        discount_percent: discountPercent,
        campaign_key: activePromo?.campaignKey,
        qty: item.qty,
      });
    }

    // 6. Delivery fee rule: >= 500 => free (0), otherwise 40
    const computedDeliveryFee = computedSubtotal >= 500 ? 0 : 40;
    const computedTotal = Math.round((computedSubtotal + computedDeliveryFee) * 100) / 100;

    // 7. Verify submitted pricing matches authoritative server calculations
    if (Math.round(args.p_subtotal * 100) / 100 !== computedSubtotal) {
      return {
        data: null,
        error: { message: 'Subtotal does not match catalog prices and active offers' },
      };
    }
    if (Math.round(args.p_delivery_fee * 100) / 100 !== computedDeliveryFee) {
      return {
        data: null,
        error: { message: 'Delivery fee does not match order rules' },
      };
    }
    if (Math.round(args.p_total * 100) / 100 !== computedTotal) {
      return {
        data: null,
        error: { message: 'Total does not match subtotal and delivery fee' },
      };
    }

    // 8. Order success: reserve inventory & store idempotency record
    for (const item of items) {
      const serverItem = state.items.get(item.id)!;
      serverItem.qtyReservedOnline += item.qty;
    }

    const orderRecord = {
      id: `ord-${Date.now()}`,
      order_number: args.p_order_number,
      trackingToken: idempotencyKey,
      subtotal: computedSubtotal,
      deliveryFee: computedDeliveryFee,
      total: computedTotal,
      items: canonicalItems,
    };

    if (idempotencyKey) {
      state.idempotencyStore.set(idempotencyKey, orderRecord);
    }

    return {
      data: {
        order: orderRecord,
        replayed: false,
      },
      error: null,
    };
  };
}

describe('Checkout Promotions Integration Test Suite (create_order_with_stock_idempotent_unowned)', () => {
  const STOREFRONT_STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
  const STOREFRONT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

  let state: ServerState;
  let mockRpcClient: { rpc: ReturnType<typeof createSimulatedPostgresCheckout> };

  beforeEach(() => {
    state = {
      tenantId: STOREFRONT_TENANT_ID,
      storeId: STOREFRONT_STORE_ID,
      items: new Map([
        [
          '550e8400-e29b-41d4-a716-446655440001',
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Aarong Pure Ghee 500g',
            price: 700,
            mrp: 800,
            isActive: true,
            qtyOnHand: 10,
            reserved: 0,
            qtyReservedOnline: 0,
          },
        ],
        [
          '550e8400-e29b-41d4-a716-446655440002',
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Ceylon Black Tea 400g',
            price: 200,
            mrp: 240,
            isActive: true,
            qtyOnHand: 5,
            reserved: 0,
            qtyReservedOnline: 0,
          },
        ],
      ]),
      promotions: [
        {
          itemId: '550e8400-e29b-41d4-a716-446655440002',
          expectedName: 'Ceylon Black Tea 400g',
          expectedPrice: 200,
          expectedMrp: 240,
          discountPercent: 5,
          campaignKey: 'dealoftheweek-2026-10-19',
          startsAt: '2026-10-18T18:00:00.000Z',
          endsAt: '2026-10-25T18:00:00.000Z',
          isCurrent: true,
        },
      ],
      idempotencyStore: new Map(),
      currentTime: new Date('2026-10-20T10:00:00.000Z'), // During active campaign
    };

    mockRpcClient = {
      rpc: createSimulatedPostgresCheckout(state),
    };
  });

  it('proves valid promotional pricing is authoritatively recalculated and accepted', async () => {
    // Ceylon Tea: base price 200, 5% promo discount => 190 unit price
    // Subtotal for 1 unit: 190. Subtotal < 500 => delivery fee 40. Total: 230.
    const input: OrderInput = {
      orderNumber: 'LSO-20261020-0001',
      customerName: 'Rahim Chowdhury',
      customerPhone: '01712345678',
      customerAddress: 'GEC Circle, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 190,
          qty: 1,
        },
      ],
      subtotal: 190,
      deliveryFee: 40,
      total: 230,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000001',
    };

    const order = await createOrder(input, mockRpcClient as any);
    expect(order.order_number).toBe('LSO-20261020-0001');
    expect(order.replayed).toBe(false);

    // Verify online reservation was incremented by 1
    const serverItem = state.items.get('550e8400-e29b-41d4-a716-446655440002')!;
    expect(serverItem.qtyReservedOnline).toBe(1);
  });

  it('rejects checkout when client attempts to inject an unauthorized or tampered discount', async () => {
    // Client attempts to pay 150 instead of the authoritative promo price 190
    const tamperedInput: OrderInput = {
      orderNumber: 'LSO-20261020-0002',
      customerName: 'Malicious Client',
      customerPhone: '01712345678',
      customerAddress: 'Agrabad, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 150,
          qty: 1,
        },
      ],
      subtotal: 150,
      deliveryFee: 40,
      total: 190,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000002',
    };

    await expect(createOrder(tamperedInput, mockRpcClient as any)).rejects.toThrow(
      'Subtotal does not match catalog prices and active offers',
    );
  });

  it('rejects stale promotional price when campaign has expired and requires updated catalogue price', async () => {
    // Advance time past the promotional campaign end date
    state.currentTime = new Date('2026-10-26T00:00:00.000Z');

    // Attempting checkout with previous promo price (190) now fails because server expects full price (200)
    const expiredPromoOrder: OrderInput = {
      orderNumber: 'LSO-20261026-0003',
      customerName: 'Late Shopper',
      customerPhone: '01712345678',
      customerAddress: 'Nasirabad, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 190,
          qty: 1,
        },
      ],
      subtotal: 190,
      deliveryFee: 40,
      total: 230,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000003',
    };

    await expect(createOrder(expiredPromoOrder, mockRpcClient as any)).rejects.toThrow(
      'Subtotal does not match catalog prices and active offers',
    );

    // When customer updates cart to current catalogue price 200, checkout succeeds
    const refreshedOrder: OrderInput = {
      ...expiredPromoOrder,
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 200,
          qty: 1,
        },
      ],
      subtotal: 200,
      deliveryFee: 40,
      total: 240,
    };

    const successOrder = await createOrder(refreshedOrder, mockRpcClient as any);
    expect(successOrder.order_number).toBe('LSO-20261026-0003');
  });

  it('rejects promotion when catalogue price changed from promotion baseline (MRP/price mismatch)', async () => {
    // Catalogue price changed to 220 (mismatch with promotion expectedPrice 200)
    const item = state.items.get('550e8400-e29b-41d4-a716-446655440002')!;
    item.price = 220;

    const input: OrderInput = {
      orderNumber: 'LSO-20261020-0004',
      customerName: 'Price Change Shopper',
      customerPhone: '01712345678',
      customerAddress: 'Khulshi, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 190,
          qty: 1,
        },
      ],
      subtotal: 190,
      deliveryFee: 40,
      total: 230,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000004',
    };

    // Promotion is invalidated by the server because expected_price != i.price
    await expect(createOrder(input, mockRpcClient as any)).rejects.toThrow(
      'Subtotal does not match catalog prices and active offers',
    );
  });

  it('prevents overselling when stock is exhausted or committed to other reservations', async () => {
    // Tea has 5 in stock; set reserved + online_reserved to 5 (0 sellable)
    const item = state.items.get('550e8400-e29b-41d4-a716-446655440002')!;
    item.qtyOnHand = 5;
    item.qtyReservedOnline = 5;

    const input: OrderInput = {
      orderNumber: 'LSO-20261020-0005',
      customerName: 'Out of Stock Buyer',
      customerPhone: '01712345678',
      customerAddress: 'Panchlaish, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 190,
          qty: 1,
        },
      ],
      subtotal: 190,
      deliveryFee: 40,
      total: 230,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000005',
    };

    await expect(createOrder(input, mockRpcClient as any)).rejects.toThrow(
      'Insufficient stock for item Ceylon Black Tea 400g',
    );
  });

  it('guarantees idempotent checkout replay without double-decrementing stock', async () => {
    const input: OrderInput = {
      orderNumber: 'LSO-20261020-0006',
      customerName: 'Idempotency Test User',
      customerPhone: '01712345678',
      customerAddress: 'Chawkbazar, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Ceylon Black Tea 400g',
          price: 190,
          qty: 1,
        },
      ],
      subtotal: 190,
      deliveryFee: 40,
      total: 230,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000006',
    };

    // First request: succeeds
    const firstOrder = await createOrder(input, mockRpcClient as any);
    expect(firstOrder.replayed).toBe(false);
    expect(state.items.get('550e8400-e29b-41d4-a716-446655440002')!.qtyReservedOnline).toBe(1);

    // Second request with same idempotencyKey: returns replayed order without additional stock deduction
    const secondOrder = await createOrder(input, mockRpcClient as any);
    expect(secondOrder.replayed).toBe(true);
    expect(secondOrder.order_number).toBe('LSO-20261020-0006');
    expect(state.items.get('550e8400-e29b-41d4-a716-446655440002')!.qtyReservedOnline).toBe(1);
  });

  it('enforces free delivery above 500 BDT threshold', async () => {
    // Aarong Ghee: 700 BDT >= 500 BDT => delivery fee must be 0
    const input: OrderInput = {
      orderNumber: 'LSO-20261020-0007',
      customerName: 'High Value Shopper',
      customerPhone: '01712345678',
      customerAddress: 'Khulshi, Chattogram',
      paymentMethod: 'cod',
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Aarong Pure Ghee 500g',
          price: 700,
          qty: 1,
        },
      ],
      subtotal: 700,
      deliveryFee: 0,
      total: 700,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000007',
    };

    const order = await createOrder(input, mockRpcClient as any);
    expect(order.order_number).toBe('LSO-20261020-0007');

    // Attempting to charge 40 delivery fee on >= 500 order is rejected by server
    const invalidFeeInput: OrderInput = {
      ...input,
      orderNumber: 'LSO-20261020-0008',
      deliveryFee: 40,
      total: 740,
      idempotencyKey: 'a0000000-0000-4000-8000-000000000008',
    };

    await expect(createOrder(invalidFeeInput, mockRpcClient as any)).rejects.toThrow(
      'Delivery fee does not match order rules',
    );
  });
});
