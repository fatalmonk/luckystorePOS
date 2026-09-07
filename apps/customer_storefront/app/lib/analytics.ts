import type { CartItem, Product } from './types';

export const ANALYTICS_CONSENT_KEY = 'lucky-analytics-consent';
const PURCHASE_DEDUPE_PREFIX = 'lucky-ga4-purchase:';
const CURRENCY = 'BDT';

type AnalyticsValue = string | number | boolean | undefined | AnalyticsItem[];

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    zaraz?: {
      track?: (eventName: string, properties?: Record<string, AnalyticsValue>) => void;
    };
  }
}

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function sendAnalyticsEvent(
  eventName: string,
  params: Record<string, AnalyticsValue>,
): boolean {
  if (!hasAnalyticsConsent()) return false;

  try {
    if (typeof window.zaraz?.track === 'function') {
      window.zaraz.track(eventName, params);
      return true;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function toAnalyticsItem(
  product: Product | CartItem,
  options: {
    quantity?: number;
    index?: number;
    listId?: string;
    listName?: string;
  } = {},
): AnalyticsItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category || undefined,
    item_variant: product.unit || undefined,
    price: Number(product.price),
    quantity: options.quantity ?? ('qty' in product ? product.qty : 1),
    index: options.index,
    item_list_id: options.listId,
    item_list_name: options.listName,
  };
}

export function trackViewItemList(
  products: Product[],
  listId: string,
  listName: string,
): boolean {
  if (!products.length) return false;
  return sendAnalyticsEvent('view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items: products.map((product, index) =>
      toAnalyticsItem(product, { index, listId, listName }),
    ),
  });
}

export function trackSelectItem(
  product: Product,
  options: { index?: number; listId?: string; listName?: string } = {},
): boolean {
  return sendAnalyticsEvent('select_item', {
    item_list_id: options.listId,
    item_list_name: options.listName,
    items: [toAnalyticsItem(product, options)],
  });
}

export function trackViewItem(product: Product): boolean {
  return sendAnalyticsEvent('view_item', {
    currency: CURRENCY,
    value: Number(product.price),
    items: [toAnalyticsItem(product)],
  });
}

export function trackAddToCart(product: Product, quantity = 1): boolean {
  return sendAnalyticsEvent('add_to_cart', {
    currency: CURRENCY,
    value: Number(product.price) * quantity,
    items: [toAnalyticsItem(product, { quantity })],
  });
}

export function trackViewCart(items: CartItem[], value: number): boolean {
  if (!items.length) return false;
  return sendAnalyticsEvent('view_cart', {
    currency: CURRENCY,
    value,
    items: items.map((item) => toAnalyticsItem(item)),
  });
}

export function trackBeginCheckout(items: CartItem[], value: number): boolean {
  if (!items.length) return false;
  return sendAnalyticsEvent('begin_checkout', {
    currency: CURRENCY,
    value,
    items: items.map((item) => toAnalyticsItem(item)),
  });
}

export function trackAddShippingInfo(
  items: CartItem[],
  value: number,
  shippingTier: string,
): boolean {
  if (!items.length) return false;
  return sendAnalyticsEvent('add_shipping_info', {
    currency: CURRENCY,
    value,
    shipping_tier: shippingTier,
    items: items.map((item) => toAnalyticsItem(item)),
  });
}

export function trackAddPaymentInfo(
  items: CartItem[],
  value: number,
  paymentType: 'cod' | 'bkash',
): boolean {
  if (!items.length) return false;
  return sendAnalyticsEvent('add_payment_info', {
    currency: CURRENCY,
    value,
    payment_type: paymentType,
    items: items.map((item) => toAnalyticsItem(item)),
  });
}

export function trackPurchase(input: {
  transactionId: string;
  items: CartItem[];
  value: number;
  shipping: number;
}): boolean {
  if (!input.transactionId || !input.items.length || typeof window === 'undefined') return false;

  const dedupeKey = `${PURCHASE_DEDUPE_PREFIX}${input.transactionId}`;
  try {
    if (window.sessionStorage.getItem(dedupeKey) === 'sent') return false;
  } catch {
    // Continue without storage-based deduplication when storage is unavailable.
  }

  const sent = sendAnalyticsEvent('purchase', {
    transaction_id: input.transactionId,
    currency: CURRENCY,
    value: input.value,
    shipping: input.shipping,
    items: input.items.map((item) => toAnalyticsItem(item)),
  });

  if (sent) {
    try {
      window.sessionStorage.setItem(dedupeKey, 'sent');
    } catch {
      // The event was sent; storage failure must not break checkout completion.
    }
  }

  return sent;
}
