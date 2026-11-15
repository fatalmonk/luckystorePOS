/**
 * WebMCP Client — exposes site tools to AI agents via the browser.
 * https://webmachinelearning.github.io/webmcp/
 * https://developer.chrome.com/blog/webmcp-epp
 *
 * Tools use Chrome's current document.modelContext imperative API.
 * A page-lifecycle AbortSignal unregisters them when the component unmounts.
 */

type WebMCPAnnotations = {
  readOnlyHint?: boolean;
  consequentialHint?: boolean;
  untrustedContentHint?: boolean;
};

type WebMCPToolContext = { signal: AbortSignal };

type WebMCPTool = {
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMCPAnnotations;
  execute: (input: Record<string, unknown>, context: WebMCPToolContext) => Promise<unknown>;
};

interface WebMCPDocument extends Document {
  modelContext?: {
    registerTool: (tool: WebMCPTool & { name: string }, options?: { signal?: AbortSignal }) => Promise<void>;
  };
}

import type { CartItem, Product } from './types';

/** Browser tools use the mounted CartProvider, never a second localStorage cart. */
export interface WebMCPCartBridge {
  isReady(): boolean;
  snapshot(): {
    items: CartItem[];
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
  };
  add(product: Product, quantity: number): boolean;
  clear(): void;
  removePurchased(items: Array<{ id: string; qty: number }>): void;
}

let cartBridge: WebMCPCartBridge | null = null;

/** Called by WebMCPInit while it is mounted under the real CartProvider. */
export function bindWebMCPCartBridge(bridge: WebMCPCartBridge): () => void {
  cartBridge = bridge;
  return () => {
    if (cartBridge === bridge) cartBridge = null;
  };
}

function requireCartBridge(): WebMCPCartBridge | null {
  return cartBridge?.isReady() ? cartBridge : null;
}

function getCart() {
  const bridge = requireCartBridge();
  return bridge ? bridge.snapshot() : null;
}

/**
 * Module-level in-memory fallback for checkout identity.
 * Used when sessionStorage is unavailable (private browsing restrictions, etc.).
 * Keyed by payloadSignature so a different cart/customer resets naturally.
 */
type PendingCheckoutQuote = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
};

const _memoryIdentity: {
  payloadSignature?: string;
  orderNumber?: string;
  idempotencyKey?: string;
  pendingQuote?: PendingCheckoutQuote;
} = {};

// Corrupted stored quotes must not allow an unreviewed checkout request.
let _invalidPendingQuoteSignature: string | undefined;

/**
 * Last server-returned PRICE_MISMATCH quote, kept between calls so the
 * confirmed-quote retry can validate the customer's acknowledgment matches
 * the actual server quote — not a client-fabricated amount.
 */
const _lastServerQuote: {
  payloadSignature?: string;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total?: number;
} = {};

const CHECKOUT_IDENTITY_KEY = 'lucky-webmcp-checkout-identity';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// If a stored identity might identify an already-committed checkout but is
// malformed, fail closed rather than risk creating a duplicate with a new key.
let _invalidStoredIdentity = false;

function isValidPendingQuote(value: unknown): value is PendingCheckoutQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Record<string, unknown>;
  const fields = [quote.subtotal, quote.discount, quote.deliveryFee, quote.total];
  return fields.every((amount) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0)
    && Math.abs((quote.subtotal as number) + (quote.deliveryFee as number) - (quote.total as number)) <= 0.01;
}

function restorePendingQuote(identity: {
  payloadSignature: string;
  pendingQuote?: unknown;
}) {
  if (identity.pendingQuote === undefined) return;
  if (!isValidPendingQuote(identity.pendingQuote)) {
    _invalidPendingQuoteSignature = identity.payloadSignature;
    return;
  }
  Object.assign(_lastServerQuote, { payloadSignature: identity.payloadSignature, ...identity.pendingQuote });
}

function rememberPendingQuote(
  identity: { payloadSignature: string; orderNumber: string; idempotencyKey: string },
  quote: PendingCheckoutQuote,
) {
  // Persist the quote in the SAME record as the idempotency identity so reloads
  // cannot restore one without the other when sessionStorage works.
  const saved = { ...identity, pendingQuote: quote };
  Object.assign(_memoryIdentity, saved);
  Object.assign(_lastServerQuote, { payloadSignature: identity.payloadSignature, ...quote });
  _invalidPendingQuoteSignature = undefined;
  try {
    sessionStorage.setItem(CHECKOUT_IDENTITY_KEY, JSON.stringify(saved));
  } catch {
    // Current-page retries remain possible through module memory.
  }
}

function getCheckoutIdentity(payloadSignature: string) {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(CHECKOUT_IDENTITY_KEY);
  } catch {
    // Unavailable session storage still permits the in-memory identity.
  }

  if (stored) {
    let identity: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid identity');
      identity = parsed as Record<string, unknown>;
    } catch {
      // A corrupted record could belong to an order whose response was lost.
      _invalidStoredIdentity = true;
      return null;
    }

    if (identity.payloadSignature === payloadSignature) {
      if (typeof identity.idempotencyKey === 'string' && UUID_V4.test(identity.idempotencyKey)) {
        if (typeof identity.orderNumber !== 'string' || !identity.orderNumber.trim()) {
          _invalidStoredIdentity = true;
          return null;
        }
        _invalidStoredIdentity = false;
        Object.assign(_memoryIdentity, identity);
        restorePendingQuote({ payloadSignature, pendingQuote: identity.pendingQuote });
        return {
          payloadSignature,
          orderNumber: identity.orderNumber,
          idempotencyKey: identity.idempotencyKey,
        };
      }
      // A malformed record could also be storage corruption *after* an order
      // committed. Never mint a new identity without first verifying the order.
      _invalidStoredIdentity = true;
      return null;
    }
  }

  // When storage is denied, retain the exact in-memory retry identity.
  if (
    _memoryIdentity.payloadSignature === payloadSignature
    && typeof _memoryIdentity.orderNumber === 'string'
    && _memoryIdentity.orderNumber.trim().length > 0
    && typeof _memoryIdentity.idempotencyKey === 'string'
    && UUID_V4.test(_memoryIdentity.idempotencyKey)
  ) {
    _invalidStoredIdentity = false;
    restorePendingQuote({
      payloadSignature,
      pendingQuote: _memoryIdentity.pendingQuote,
    });
    return {
      payloadSignature: _memoryIdentity.payloadSignature,
      orderNumber: _memoryIdentity.orderNumber,
      idempotencyKey: _memoryIdentity.idempotencyKey,
    };
  }

  if (_invalidStoredIdentity) return null;

  const identity = {
    payloadSignature,
    orderNumber: `LSO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    idempotencyKey: crypto.randomUUID(),
  };
  try {
    sessionStorage.setItem(CHECKOUT_IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Storage unavailable; use module memory for same-page retries.
  }
  Object.assign(_memoryIdentity, identity);
  delete _memoryIdentity.pendingQuote;
  return identity;
}

function clearCheckoutIdentity() {
  try { sessionStorage.removeItem(CHECKOUT_IDENTITY_KEY); } catch { /* Storage may be unavailable. */ }
  delete _memoryIdentity.payloadSignature;
  delete _memoryIdentity.orderNumber;
  delete _memoryIdentity.idempotencyKey;
  delete _memoryIdentity.pendingQuote;
  _invalidPendingQuoteSignature = undefined;
  _invalidStoredIdentity = false;
}

function clearServerQuote() {
  delete _lastServerQuote.payloadSignature;
  delete _lastServerQuote.subtotal;
  delete _lastServerQuote.discount;
  delete _lastServerQuote.deliveryFee;
  delete _lastServerQuote.total;
  delete _memoryIdentity.pendingQuote;
  _invalidPendingQuoteSignature = undefined;
  try {
    const saved = sessionStorage.getItem(CHECKOUT_IDENTITY_KEY);
    if (saved) {
      const identity = JSON.parse(saved) as Record<string, unknown>;
      if (Object.hasOwn(identity, 'pendingQuote')) {
        delete identity.pendingQuote;
        sessionStorage.setItem(CHECKOUT_IDENTITY_KEY, JSON.stringify(identity));
      }
    }
  } catch {
    // Storage can be inaccessible; in-memory state is still cleared.
  }
}

/**
 * Resets module-level checkout state. Exported for testing only.
 * Do not call in production code.
 */
export function __resetCheckoutStateForTesting() {
  delete _memoryIdentity.payloadSignature;
  delete _memoryIdentity.orderNumber;
  delete _memoryIdentity.idempotencyKey;
  delete _memoryIdentity.pendingQuote;
  _invalidPendingQuoteSignature = undefined;
  _invalidStoredIdentity = false;
  delete _lastServerQuote.payloadSignature;
  delete _lastServerQuote.subtotal;
  delete _lastServerQuote.discount;
  delete _lastServerQuote.deliveryFee;
  delete _lastServerQuote.total;
}

/** Tool definitions registered through document.modelContext.registerTool. */
export const WEBMCP_TOOLS: Record<string, WebMCPTool> = {
  search_products: {
    description:
      'Search the Lucky Store product catalog by keyword. Returns matching products with id, name, price, and category.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for product name (e.g., "chips", "rice", "milk")',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default 10, max 50)',
        },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input, { signal }) {
      const query = String(input.query || '');
      const limit = Number(input.limit || 10);
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(query)}&limit=${limit}`,
        { signal },
      );
      if (!res.ok) {
        return { error: `Search failed: ${res.status}` };
      }
      return res.json();
    },
  },

  list_categories: {
    description:
      'List all product categories available at Lucky Store with their slugs and emoji icons.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: { readOnlyHint: true },
    async execute(_input, { signal }) {
      const res = await fetch('/api/categories', { signal });
      if (!res.ok) {
        return { error: `Failed to list categories: ${res.status}` };
      }
      return res.json();
    },
  },

  get_product: {
    description:
      'Get detailed information about a specific product by its ID, including price, stock, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Product UUID',
        },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input, { signal }) {
      const id = String(input.id || '');
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { signal });
      if (!res.ok) {
        return { error: `Product not found: ${res.status}` };
      }
      return res.json();
    },
  },

  add_to_cart: {
    description:
      'Add an available product by ID and quantity to the same cart shown in the Lucky Store UI.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Product UUID to add',
        },
        qty: {
          type: 'number',
          description: 'Quantity to add (default 1)',
        },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input, { signal }) {
      const bridge = requireCartBridge();
      if (!bridge) return { error: 'Storefront cart is not ready. Try again after the page loads.' };
      const id = String(input.id || '');
      const qty = input.qty === undefined ? 1 : Number(input.qty);
      if (!Number.isSafeInteger(qty) || qty < 1) {
        return { error: 'Quantity must be a positive integer.' };
      }

      const prodRes = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { signal });
      if (!prodRes.ok) {
        return { error: `Product not found: ${prodRes.status}` };
      }
      const product = await prodRes.json() as Product & { catalogSnapshotFallback?: boolean };
      if (product.id !== id || product.availabilityUnknown === true
          || product.catalogSnapshotFallback === true || !Number.isFinite(product.stock)
          || product.stock < qty) {
        return { error: 'Product stock or availability cannot be verified for this quantity.' };
      }
      if (!bridge.add(product, qty)) {
        return { error: 'Quantity exceeds available stock or cart is no longer ready.' };
      }
      return { ok: true, cart: bridge.snapshot() };
    },
  },

  get_cart: {
    description: 'Get the current shopping cart contents including items and total price.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: { readOnlyHint: true },
    async execute() {
      const cart = getCart();
      if (!cart) return { error: 'Storefront cart is not ready. Try again after the page loads.' };
      return cart;
    },
  },

  clear_cart: {
    description: 'Remove all items from the shopping cart.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: { readOnlyHint: false },
    async execute() {
      const bridge = requireCartBridge();
      if (!bridge) return { error: 'Storefront cart is not ready. Try again after the page loads.' };
      bridge.clear();
      return { ok: true, message: 'Cart cleared' };
    },
  },

  submit_order: {
    description:
      'Submit the current cart as a grocery order with customer delivery details. ' +
      'If the server returns PRICE_MISMATCH, the response includes requiresCustomerReview:true ' +
      'and a server-computed quote (subtotal/discount/deliveryFee/total). ' +
      'The order is NOT submitted automatically. Present the quote to the customer and obtain ' +
      'explicit approval. Then call this tool again with the same cart/customer/payment fields ' +
      'plus confirmedQuote set to the exact quote values the customer approved. ' +
      'If prices change again a second review is required.',
    inputSchema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Customer full name' },
        customerPhone: { type: 'string', description: 'Customer phone number (BD format)' },
        customerAddress: { type: 'string', description: 'Delivery address in Chittagong' },
        notes: { type: 'string', description: 'Optional delivery notes' },
        paymentMethod: { type: 'string', enum: ['cod', 'bkash'], description: 'Payment method selected by the customer' },
        confirmedQuote: {
          type: 'object',
          description:
            'Provide this only after the customer has explicitly approved a PRICE_MISMATCH quote. ' +
            'Must match the exact server quote returned in the previous response. ' +
            'All four numeric fields are required.',
          properties: {
            subtotal: { type: 'number' },
            discount: { type: 'number' },
            deliveryFee: { type: 'number' },
            total: { type: 'number' },
          },
          required: ['subtotal', 'discount', 'deliveryFee', 'total'],
        },
      },
      required: ['customerName', 'customerPhone', 'customerAddress', 'paymentMethod'],
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    async execute(input, { signal }) {
      const bridge = requireCartBridge();
      if (!bridge) return { error: 'Storefront cart is not ready. Try again after the page loads.' };
      const cart = bridge.snapshot();
      if (!cart.items.length) return { error: 'Cart is empty' };

      // Canonicalize the transmitted item sequence, not only its fingerprint.
      // PostgreSQL binds an idempotency key to the ordered items payload:
      // a reordered cart after a lost response must produce the same RPC input.
      const itemsForRequest = cart.items
        .map(({ id, name, price, qty, unit }) => ({ id, name, price, qty, unit }))
        .sort((a, b) => a.id.localeCompare(b.id));
      // confirmedQuote is excluded deliberately: new server quotes do not
      // change the idempotency identity before an order is committed.
      const payloadSignature = JSON.stringify({
        items: itemsForRequest.map(({ id, qty }) => ({ id, qty })),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        notes: input.notes,
        paymentMethod: input.paymentMethod,
      });
      // Restore the pending quote from the same persisted record as the checkout
      // identity before deciding whether a new checkout POST can be sent.
      const identity = getCheckoutIdentity(payloadSignature);
      if (!identity) {
        return {
          error: 'Stored checkout identity could belong to an existing order. Check order status before retrying.',
          requiresOrderVerification: true,
        };
      }
      // A changed cart, customer, or payment method invalidates prior price approval.
      if (_lastServerQuote.payloadSignature && _lastServerQuote.payloadSignature !== payloadSignature) {
        clearServerQuote();
      }
      if (_invalidPendingQuoteSignature && _invalidPendingQuoteSignature !== payloadSignature) {
        _invalidPendingQuoteSignature = undefined;
      }

      if (_invalidPendingQuoteSignature === payloadSignature) {
        return {
          error: 'The saved price quote is invalid. Change the cart to restart checkout safely.',
          requiresCustomerReview: true,
        };
      }

      // After a mismatch, never retry checkout without a fresh, explicit confirmation.
      // In particular, a repeated unconfirmed call must not happen to succeed
      // just because pricing changed back in the meantime.
      if (input.confirmedQuote === undefined && _lastServerQuote.total !== undefined) {
        return {
          code: 'PRICE_MISMATCH',
          error: 'An updated server quote is awaiting customer approval.',
          subtotal: _lastServerQuote.subtotal,
          discount: _lastServerQuote.discount,
          deliveryFee: _lastServerQuote.deliveryFee,
          total: _lastServerQuote.total,
          requiresCustomerReview: true,
        };
      }

      // Determine which totals to send.
      // If the customer has confirmed a server quote, use those server-computed
      // amounts. The server will re-validate independent of what we send, so this
      // is not a security bypass — it lets the server compare the retry request
      // against the same quote it previously issued.
      let subtotal: number;
      let deliveryFee: number;
      let discount: number;
      let total: number;

      const confirmedQuote = input.confirmedQuote as
        | { subtotal: number; discount: number; deliveryFee: number; total: number }
        | undefined;

      if (confirmedQuote !== undefined) {
        // Validate confirmedQuote is an object with the required numeric fields.
        if (
          typeof confirmedQuote !== 'object'
          || confirmedQuote === null
          || typeof confirmedQuote.subtotal !== 'number'
          || typeof confirmedQuote.discount !== 'number'
          || typeof confirmedQuote.deliveryFee !== 'number'
          || typeof confirmedQuote.total !== 'number'
          || ![confirmedQuote.subtotal, confirmedQuote.discount, confirmedQuote.deliveryFee, confirmedQuote.total]
            .every(Number.isFinite)
        ) {
          return { error: 'confirmedQuote must include numeric subtotal, discount, deliveryFee, and total.' };
        }

        // Validate the confirmed quote matches the last server quote for this same payload.
        // This prevents the agent from fabricating or altering the quote amounts.
        const sq = _lastServerQuote;
        if (
          sq.payloadSignature !== payloadSignature
          || sq.subtotal === undefined
          || sq.discount === undefined
          || sq.deliveryFee === undefined
          || sq.total === undefined
          || confirmedQuote.subtotal !== sq.subtotal
          || confirmedQuote.discount !== sq.discount
          || confirmedQuote.deliveryFee !== sq.deliveryFee
          || confirmedQuote.total !== sq.total
        ) {
          return {
            error:
              'The provided confirmedQuote does not match the last server quote for this order. ' +
              'Present the server quote to the customer again and obtain approval of the correct amounts.',
            requiresCustomerReview: true,
            ...(sq.payloadSignature === payloadSignature && sq.total !== undefined
              ? { subtotal: sq.subtotal, discount: sq.discount, deliveryFee: sq.deliveryFee, total: sq.total }
              : {}),
          };
        }

        subtotal = confirmedQuote.subtotal;
        discount = confirmedQuote.discount;
        deliveryFee = confirmedQuote.deliveryFee;
        total = confirmedQuote.total;
      } else {
        // No confirmed quote — compute from local cart. This is the first attempt.
        // The server will validate and may return PRICE_MISMATCH.
        subtotal = cart.subtotal;
        discount = cart.discount;
        deliveryFee = cart.deliveryFee;
        total = cart.total;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: identity.orderNumber,
          idempotencyKey: identity.idempotencyKey,
          items: itemsForRequest,
          subtotal,
          discount,
          deliveryFee,
          total,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
        }),
        signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.code === 'PRICE_MISMATCH') {
          // Store the server quote so a subsequent confirmed retry can validate against it.
          // Do NOT clear the checkout identity — the same orderNumber/idempotencyKey must
          // be reused on the confirmed retry to preserve idempotency.
          const quote = {
            subtotal: err.subtotal,
            discount: err.discount ?? 0,
            deliveryFee: err.deliveryFee,
            total: err.total,
          };
          if (
            [quote.subtotal, quote.discount, quote.deliveryFee, quote.total]
              .every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
            && Math.abs(quote.subtotal + quote.deliveryFee - quote.total) <= 0.01
          ) {
            rememberPendingQuote(identity, quote);
          } else {
            // Never retain a malformed quote as a customer-approved amount.
            clearServerQuote();
          }

          return {
            error: err.error || 'Prices changed. Review the updated total before placing the order.',
            code: err.code,
            items: err.items,
            subtotal: err.subtotal,
            discount: err.discount,
            deliveryFee: err.deliveryFee,
            total: err.total,
            requiresCustomerReview: true,
          };
        }
        return { error: err.error || `Checkout failed: ${res.status}` };
      }

      // Success: reconcile only submitted quantities, preserving additions made
      // while the request was in flight. A missing cart bridge is an explicit
      // error, not permission to mutate storage behind the provider.
      const order = await res.json();
      clearCheckoutIdentity();
      clearServerQuote();
      bridge.removePurchased(cart.items.map(({ id, qty }) => ({ id, qty })));
      return order;
    },
  },

  check_health: {
    description: 'Check the health status of the Lucky Store API.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: { readOnlyHint: true },
    async execute(_input, { signal }) {
      const res = await fetch('/api/health', { signal });
      return res.json();
    },
  },
};

export async function initWebMCP(signal: AbortSignal): Promise<void> {
  const modelContext = (document as WebMCPDocument).modelContext;
  if (!modelContext || signal.aborted) return;

  await Promise.all(Object.entries(WEBMCP_TOOLS).map(async ([name, tool]) => {
    try {
      await modelContext.registerTool({
        name,
        ...tool,
        execute: (input, context) => tool.execute(input, context ?? { signal }),
      }, { signal });
    } catch (error) {
      if (!signal.aborted) console.warn(`[WebMCP] Failed to register tool "${name}":`, error);
    }
  }));
}
