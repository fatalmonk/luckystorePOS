/**
 * GTIN (Global Trade Item Number) Validation Utility
 *
 * Implements the GS1 Modulo-10 Check Digit Algorithm for:
 * - GTIN-8  (EAN-8)
 * - GTIN-12 (UPC-A)
 * - GTIN-13 (EAN-13)
 * - GTIN-14 (ITF-14)
 *
 * Any non-numeric string, unsupported length, or check-digit mismatch is rejected (returns null).
 * Internal store SKUs (e.g. "TC-NCF-GEN-90G") and arbitrary barcodes fail validation cleanly.
 */

export type GtinProperty = 'gtin8' | 'gtin12' | 'gtin13' | 'gtin14';

export interface ValidatedGtin {
  property: GtinProperty;
  value: string;
}

/**
 * Validates a barcode string as an authentic GS1 GTIN using modulo-10 check digit math.
 *
 * @param barcode Raw barcode string (e.g. from POS database or manufacturer pack)
 * @returns ValidatedGtin with the canonical Schema.org property name, or null if invalid
 */
export function validateGtin(barcode: string | null | undefined): ValidatedGtin | null {
  if (!barcode) return null;
  const clean = barcode.trim();

  // Must consist exclusively of digits
  if (!/^\d+$/.test(clean)) return null;

  let property: GtinProperty;
  if (clean.length === 8) property = 'gtin8';
  else if (clean.length === 12) property = 'gtin12';
  else if (clean.length === 13) property = 'gtin13';
  else if (clean.length === 14) property = 'gtin14';
  else return null;

  // GS1 Modulo-10 Check Digit Calculation:
  // Starting from the position immediately to the left of the check digit and moving left,
  // alternate weights of 3 and 1.
  const digits = clean.split('').map(Number);
  const checkDigit = digits[digits.length - 1];

  let sum = 0;
  for (let i = 0; i < digits.length - 1; i++) {
    const digit = digits[digits.length - 2 - i];
    const multiplier = i % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  if (calculatedCheckDigit !== checkDigit) return null;

  return { property, value: clean };
}
