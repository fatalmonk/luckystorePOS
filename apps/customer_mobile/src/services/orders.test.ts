import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStatusStepIndex,
  buildWhatsAppOrderMessage,
  MobileOrderDtoSchema,
  MobileOrderDto,
} from './orders';

describe('mobile orders service', () => {
  it('parses valid order DTO', () => {
    const raw = {
      orderNumber: 'LSO-20261008-ABCD1234',
      customerName: 'Karim Ahmed',
      customerPhone: '01712345678',
      customerAddress: 'House 5, Road 2, Nasirabad, Chittagong',
      notes: 'Ring the bell twice',
      items: [
        { id: 'item-1', name: 'Miniket Rice 5kg', price: 420, qty: 1, unit: 'bag' },
      ],
      subtotal: 420,
      deliveryFee: 40,
      total: 460,
      status: 'pending',
      paymentMethod: 'cod',
      deliverySlot: 'morning',
    };

    const parsed = MobileOrderDtoSchema.parse(raw);
    assert.strictEqual(parsed.orderNumber, 'LSO-20261008-ABCD1234');
    assert.strictEqual(parsed.status, 'pending');
    assert.strictEqual(parsed.total, 460);
  });

  it('calculates step indices for statuses correctly', () => {
    assert.strictEqual(getStatusStepIndex('pending'), 0);
    assert.strictEqual(getStatusStepIndex('confirmed'), 1);
    assert.strictEqual(getStatusStepIndex('preparing'), 2);
    assert.strictEqual(getStatusStepIndex('out_for_delivery'), 3);
    assert.strictEqual(getStatusStepIndex('delivered'), 4);
    assert.strictEqual(getStatusStepIndex('cancelled'), -1);
  });

  it('builds clear WhatsApp confirmation message', () => {
    const order: MobileOrderDto = {
      orderNumber: 'LSO-1234',
      customerName: 'Rahim',
      customerPhone: '01812345678',
      customerAddress: 'Agrabad, Chittagong',
      items: [{ id: '1', name: 'Soybean Oil 2L', price: 340, qty: 1 }],
      subtotal: 340,
      deliveryFee: 40,
      total: 380,
      status: 'pending',
      paymentMethod: 'cod',
      deliverySlot: 'morning',
    };

    const message = buildWhatsAppOrderMessage(order);
    assert.ok(message.includes('#LSO-1234'));
    assert.ok(message.includes('Soybean Oil 2L'));
    assert.ok(message.includes('Total: ৳380.00'));
    assert.ok(message.includes('Cash on Delivery'));
  });
});
