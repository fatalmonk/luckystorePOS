/** A deliberately narrow SEO contract for the Ice Cream leaf category. */
export const ICE_CREAM_PAGE_SIZE = 24;

export type IceCreamQuery = Record<string, string | string[] | undefined>;
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'msclkid', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
]);

export interface IceCreamPageState {
  page: number;
  /** Non-tracking parameters other than page use the legacy filtered catalog. */
  hasFilters: boolean;
  /** A page=1 URL or a combined page+filter URL is normalized to page-less. */
  needsRedirect: boolean;
  invalid: boolean;
  normalizedQuery: string;
}

export function iceCreamPaginationEnabled(slug: string): boolean {
  return slug === 'ice-cream' && process.env.LUCKYSTORE_ICE_CREAM_PAGINATION === 'enabled';
}

export function resolveIceCreamPage(params: IceCreamQuery): IceCreamPageState {
  const raw = params.page;
  const invalid = Array.isArray(raw)
    || (raw !== undefined && !/^[1-9]\d{0,3}$/.test(raw))
    || (typeof raw === 'string' && Number(raw) > Math.floor(100_000 / ICE_CREAM_PAGE_SIZE) + 1);
  const page = invalid || raw === undefined ? 1 : Number(raw);
  const hasFilters = Object.entries(params).some(([key, value]) =>
    key !== 'page' && !TRACKING_PARAMS.has(key.toLowerCase()) &&
    (Array.isArray(value) ? value.some(Boolean) : Boolean(value)),
  );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  return {
    page,
    hasFilters,
    invalid,
    needsRedirect: raw !== undefined && !invalid && (page === 1 || hasFilters),
    normalizedQuery: query.toString(),
  };
}

export function iceCreamPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}
