const INTERNAL_ORIGIN = 'https://luckystore.internal';
const DEFAULT_AUTH_RETURN_PATH = '/profile';

/** Accept only root-relative destinations so auth flows cannot redirect off-site. */
export function getSafeAuthReturnPath(destination: string | null | undefined): string {
  if (
    !destination ||
    !destination.startsWith('/') ||
    destination.startsWith('//') ||
    destination.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(destination)
  ) {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  try {
    const parsed = new URL(destination, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return DEFAULT_AUTH_RETURN_PATH;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }
}
