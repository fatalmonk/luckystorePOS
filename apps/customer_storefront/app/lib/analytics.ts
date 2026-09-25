import type { CartItem, Product } from './types';

export const ANALYTICS_CONSENT_KEY = 'lucky-analytics-consent';
const PURCHASE_DEDUPE_PREFIX = 'lucky-ga4-purchase:';
const CURRENCY = 'BDT';

type AnalyticsValue = string | number | boolean | undefined | AnalyticsItem[];

type ZarazEcommerceValue = string | number | undefined | ZarazEcommerceProduct | ZarazEcommerceProduct[];

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

interface ZarazEcommerceProduct {
  product_id: string;
  category?: string;
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  position?: number;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    zaraz?: {
      track?: (eventName: string, properties?: Record<string, AnalyticsValue>) => void;
      ecommerce?: (eventName: string, properties?: Record<string, ZarazEcommerceValue>) => void;
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

function toZarazEcommerceProduct(
  item: AnalyticsItem,
): ZarazEcommerceProduct {
  return {
    product_id: item.item_id,
    category: item.item_category,
    name: item.item_name,
    variant: item.item_variant,
    price: item.price,
    quantity: item.quantity,
    position: item.index,
  };
}

function sendEcommerceEvent(
  zarazEventName: string,
  zarazParams: Record<string, ZarazEcommerceValue>,
  fallbackEventName: string,
  fallbackParams: Record<string, AnalyticsValue>,
): boolean {
  if (!hasAnalyticsConsent()) return false;

  try {
    if (typeof window.zaraz?.ecommerce === 'function') {
      window.zaraz.ecommerce(zarazEventName, zarazParams);
      return true;
    }
  } catch {
    return sendAnalyticsEvent(fallbackEventName, fallbackParams);
  }

  return sendAnalyticsEvent(fallbackEventName, fallbackParams);
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
  const items = products.map((product, index) =>
    toAnalyticsItem(product, { index, listId, listName }),
  );
  return sendEcommerceEvent('Product List Viewed', {
    products: items.map(toZarazEcommerceProduct),
  }, 'view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

export function trackSelectItem(
  product: Product,
  options: { index?: number; listId?: string; listName?: string } = {},
): boolean {
  const item = toAnalyticsItem(product, options);
  return sendEcommerceEvent('Product Clicked', {
    ...toZarazEcommerceProduct(item),
  }, 'select_item', {
    item_list_id: options.listId,
    item_list_name: options.listName,
    items: [item],
  });
}

export function trackViewItem(product: Product): boolean {
  const item = toAnalyticsItem(product);
  return sendEcommerceEvent('Product Viewed', {
    ...toZarazEcommerceProduct(item),
    currency: CURRENCY,
    value: Number(product.price),
  }, 'view_item', {
    currency: CURRENCY,
    value: Number(product.price),
    items: [item],
  });
}

export function trackAddToCart(product: Product, quantity = 1): boolean {
  const item = toAnalyticsItem(product, { quantity });
  return sendEcommerceEvent('Product Added', {
    ...toZarazEcommerceProduct(item),
    currency: CURRENCY,
    value: Number(product.price) * quantity,
  }, 'add_to_cart', {
    currency: CURRENCY,
    value: Number(product.price) * quantity,
    items: [item],
  });
}

export function trackViewCart(items: CartItem[], value: number): boolean {
  if (!items.length) return false;
  const analyticsItems = items.map((item) => toAnalyticsItem(item));
  return sendEcommerceEvent('Cart Viewed', {
    currency: CURRENCY,
    value,
    products: analyticsItems.map(toZarazEcommerceProduct),
  }, 'view_cart', {
    currency: CURRENCY,
    value,
    items: analyticsItems,
  });
}

export function trackBeginCheckout(items: CartItem[], value: number): boolean {
  if (!items.length) return false;
  const analyticsItems = items.map((item) => toAnalyticsItem(item));
  return sendEcommerceEvent('Checkout Started', {
    currency: CURRENCY,
    value,
    products: analyticsItems.map(toZarazEcommerceProduct),
  }, 'begin_checkout', {
    currency: CURRENCY,
    value,
    items: analyticsItems,
  });
}

export function trackAddShippingInfo(
  items: CartItem[],
  value: number,
  shippingTier: string,
): boolean {
  if (!items.length) return false;
  const analyticsItems = items.map((item) => toAnalyticsItem(item));
  return sendEcommerceEvent('Shipping Info Entered', {
    currency: CURRENCY,
    value,
    shipping_tier: shippingTier,
    products: analyticsItems.map(toZarazEcommerceProduct),
  }, 'add_shipping_info', {
    currency: CURRENCY,
    value,
    shipping_tier: shippingTier,
    items: analyticsItems,
  });
}

export function trackAddPaymentInfo(
  items: CartItem[],
  value: number,
  paymentType: 'cod' | 'bkash',
): boolean {
  if (!items.length) return false;
  const analyticsItems = items.map((item) => toAnalyticsItem(item));
  return sendEcommerceEvent('Payment Info Entered', {
    currency: CURRENCY,
    value,
    payment_type: paymentType,
    products: analyticsItems.map(toZarazEcommerceProduct),
  }, 'add_payment_info', {
    currency: CURRENCY,
    value,
    payment_type: paymentType,
    items: analyticsItems,
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

  const analyticsItems = input.items.map((item) => toAnalyticsItem(item));
  const sent = sendEcommerceEvent('Order Completed', {
    order_id: input.transactionId,
    currency: CURRENCY,
    total: input.value,
    shipping: input.shipping,
    products: analyticsItems.map(toZarazEcommerceProduct),
  }, 'purchase', {
    transaction_id: input.transactionId,
    currency: CURRENCY,
    value: input.value,
    shipping: input.shipping,
    items: analyticsItems,
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
