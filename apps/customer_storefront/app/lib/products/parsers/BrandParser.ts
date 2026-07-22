/**
 * Brand Parser
 * 
 * Strategy interface for extracting brand names from product names.
 */

import type { Brand, BrandParser } from '../types';

/**
 * Rule-based brand parser using a known brands list.
 * This is the current implementation extracted from products.ts.
 * Can be swapped for ML-based or database-driven implementation.
 */
export class RuleBasedBrandParser implements BrandParser {
  private readonly knownBrands: string[];

  constructor(knownBrands?: string[]) {
    // Default list from current products.ts, but now injectable
    this.knownBrands = knownBrands ?? [
      // Dairy & Ice Cream
      'Polar', 'Igloo', 'Savoy', 'Kwality', 'Diploma', 'Aarong', 'Milk Vita',
      // Personal Care
      'Lux', 'Dove', 'Lifebuoy', 'Dettol', 'Sunsilk', 'Pantene', 'Clear',
      // Food & Beverage
      'Pran', 'Ruchi', 'Danish', 'Radhuni', 'ACI', 'Fresh', 'Teer',
      // Household & Paper
      'Bashundhara', 'Dekko', 'RFL',
      // Snacks & Confectionery
      'Bisk', 'Olympic', 'Haque', 'Bombay',
    ];
  }

  parse(productName: string): Brand | undefined {
    if (!productName) return undefined;
    
    const firstWord = productName.trim().split(/\s+/)[0];
    const brand = this.knownBrands.find(
      (b) => firstWord.toLowerCase() === b.toLowerCase()
    );
    
    return brand;
  }
}

