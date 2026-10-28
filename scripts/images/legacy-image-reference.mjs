const PREFIX_RULES = new Map([
  ['item-images', 'item-images-prefix'],
  ['product-images', 'product-images-prefix'],
  ['products', 'products-prefix'],
]);

/** Parse recognized legacy object paths without fetching or mutating anything. */
export function parseLegacyImageReference(value) {
  if (typeof value !== 'string' || !value.trim()) return { key: null, rule: null };

  let path;
  try {
    path = /^https?:\/\//i.test(value) ? new URL(value).pathname : value.split(/[?#]/, 1)[0];
  } catch {
    return { key: null, rule: null };
  }
  let parts;
  try {
    parts = path.split('/').filter(Boolean).map((part) => {
      const decoded = decodeURIComponent(part);
      return encodeURIComponent(decoded);
    });
  } catch {
    return { key: null, rule: null };
  }
  const prefixIndex = parts.findIndex((part) => PREFIX_RULES.has(part));
  const brandIndex = parts.findIndex((part) => ['brand', 'brands'].includes(part.toLowerCase()));
  const start = brandIndex >= 0 && (prefixIndex < 0 || brandIndex < prefixIndex) ? brandIndex : prefixIndex;
  if (start < 0 || start >= parts.length - 1) return { key: null, rule: null };
  const key = parts.slice(start).join('/');
  const rule = start === brandIndex && brandIndex >= 0 ? 'brand-prefix' : PREFIX_RULES.get(parts[start]);
  return { key, rule };
}
