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
  private readonly brandAliases: Record<string, string>;

  constructor(knownBrands?: string[], brandAliases?: Record<string, string>) {
    // Default list from current products.ts, but now injectable
    this.knownBrands = knownBrands ?? [
      // Dairy & Ice Cream
      'Polar', 'Igloo', 'Savoy', 'Kwality', 'Diploma', 'Aarong', 'Milk Vita',
      // Personal Care
      'Lux', 'Dove', 'Lifebuoy', 'Dettol', 'Sunsilk', 'Pantene', 'Clear',
      // Food & Beverage
      'Pran', 'Ruchi', 'Danish', 'Radhuni', 'ACI', 'Fresh', 'Teer', 'Nestle', 'Nescafe', 'Nescafé', 'Maggi', 'KitKat', 'Nido', 'Milo', 'Koko Crunch',
      // Household & Paper
      'Bashundhara', 'Dekko', 'RFL',
      // Snacks & Confectionery
      'Bisk', 'Olympic', 'Haque', 'Bombay',
    ];

    this.brandAliases = brandAliases ?? {
      nescafe: 'Nestle',
      nescafé: 'Nestle',
      maggi: 'Nestle',
      kitkat: 'Nestle',
      'kit kat': 'Nestle',
      nido: 'Nestle',
      milo: 'Nestle',
      'koko crunch': 'Nestle',
      kokocrunch: 'Nestle',
      'coffee mate': 'Nestle',
      coffeemate: 'Nestle',
      'nestle coffee mate': 'Nestle',
      'nestlé coffee mate': 'Nestle',
      'nestle gold': 'Nestle',
      'nestlé gold': 'Nestle',
      nestle: 'Nestle',
      nestlé: 'Nestle',
    };
  }

  parse(productNameOrBrand: string): Brand | undefined {
    if (!productNameOrBrand) return undefined;
    
    const cleanStr = productNameOrBrand.trim().toLowerCase();
    
    // Check multi-word or single-word prefix against brandAliases keys
    for (const [aliasKey, targetBrand] of Object.entries(this.brandAliases)) {
      if (cleanStr === aliasKey || cleanStr.startsWith(aliasKey + ' ') || cleanStr.startsWith(aliasKey + '-')) {
        return targetBrand;
      }
    }
    
    // Check first word against aliases
    const firstWord = cleanStr.split(/\s+/)[0];
    if (this.brandAliases[firstWord]) {
      return this.brandAliases[firstWord];
    }
    
    // Check known brands list
    const brand = this.knownBrands.find(
      (b) => firstWord === b.toLowerCase()
    );

    if (brand && this.brandAliases[brand.toLowerCase()]) {
      return this.brandAliases[brand.toLowerCase()];
    }
    
    return brand;
  }
}

