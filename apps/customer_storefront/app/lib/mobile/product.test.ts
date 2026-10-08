import { describe, expect, it } from 'vitest';
import { toMobileProductDto } from './product';
import type { Product } from '../products/types';
import { createProductId } from '../products/types';

describe('mobile product adapter', () => {
  const dummyProduct: Product = {
    id: createProductId('p1'),
    name: 'Mustard Oil 1L',
    emoji: '🛢️',
    price: 260,
    originalPrice: 280,
    unit: '1 L',
    category: 'oil-and-ghee',
    stock: 8,
    description: 'Pure mustard oil',
    bengaliName: 'সরিষার তেল ১ লিটার',
    bengaliDescription: 'খাঁটি ঘানির সরিষার তেল',
  };

  it('maps product to mobile DTO in English', () => {
    const dto = toMobileProductDto(dummyProduct, 'en');
    expect(dto.name).toBe('Mustard Oil 1L');
    expect(dto.price).toBe(260);
    expect(dto.originalPrice).toBe(280);
    expect(dto.stock).toBe(8);
  });

  it('maps product to mobile DTO in Bengali when translation is present', () => {
    const dto = toMobileProductDto(dummyProduct, 'bn');
    expect(dto.name).toBe('সরিষার তেল ১ লিটার');
    expect(dto.description).toBe('খাঁটি ঘানির সরিষার তেল');
  });

  it('falls back to English name if Bengali translation is absent', () => {
    const productWithoutBn: Product = {
      ...dummyProduct,
      bengaliName: undefined,
      bengaliDescription: undefined,
    };
    const dto = toMobileProductDto(productWithoutBn, 'bn');
    expect(dto.name).toBe('Mustard Oil 1L');
    expect(dto.description).toBe('Pure mustard oil');
  });
});
