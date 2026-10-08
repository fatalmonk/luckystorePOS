import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePhone,
  validateCheckoutForm,
  generateUUID,
  CheckoutFormData,
} from './checkout';

describe('mobile checkout service', () => {
  it('validates Bangladeshi mobile phone numbers correctly', () => {
    assert.strictEqual(validatePhone('01712345678'), true);
    assert.strictEqual(validatePhone('+8801812345678'), true);
    assert.strictEqual(validatePhone('019-1234-5678'), true);
    assert.strictEqual(validatePhone('013 1234 5678'), true);
    assert.strictEqual(validatePhone('029123456'), false);
    assert.strictEqual(validatePhone('0112345'), false);
    assert.strictEqual(validatePhone(''), false);
  });

  it('validates checkout form fields and detects errors', () => {
    const invalidForm: CheckoutFormData = {
      name: 'A',
      phone: '12345',
      address: 'Short',
      notes: '',
      deliverySlot: 'morning',
      paymentMethod: 'cod',
      trxId: '',
    };

    const errors = validateCheckoutForm(invalidForm, false);
    assert.ok(errors.name);
    assert.ok(errors.phone);
    assert.ok(errors.address);
  });

  it('passes validation when required fields are valid', () => {
    const validForm: CheckoutFormData = {
      name: 'Rahim Uddin',
      phone: '01712345678',
      address: 'House 12, Road 4, Sector 7, Uttara, Dhaka',
      notes: 'Call before arriving',
      deliverySlot: 'morning',
      paymentMethod: 'cod',
      trxId: '',
    };

    const errors = validateCheckoutForm(validForm, false);
    assert.strictEqual(Object.keys(errors).length, 0);
  });

  it('generates valid UUID v4 strings', () => {
    const uuid = generateUUID();
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
