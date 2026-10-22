/** Returns the fractional price difference; positive means our price is higher. */
export function calculatePriceGapFraction(
  ourPrice: number | null | undefined,
  referencePrice: number | null | undefined,
): number | null {
  if (
    ourPrice == null ||
    referencePrice == null ||
    !Number.isFinite(ourPrice) ||
    !Number.isFinite(referencePrice) ||
    ourPrice <= 0 ||
    referencePrice <= 0
  ) {
    return null;
  }

  const fraction = (ourPrice - referencePrice) / referencePrice;
  return Number.isFinite(fraction) ? fraction : null;
}
