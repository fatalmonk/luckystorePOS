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

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
  stock?: number;
  availabilityUnknown?: boolean;
  catalogSnapshotFallback?: boolean;
  unit?: string;
}

interface CartState {
  items: Product[];
}

function getCart(): CartState {
  try {
    const raw = localStorage.getItem('cart');
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function saveCart(cart: CartState) {
  localStorage.setItem('cart', JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

function getCheckoutIdentity(payloadSignature: string) {
  const storageKey = 'lucky-webmcp-checkout-identity';
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const identity = JSON.parse(saved);
      if (identity.payloadSignature === payloadSignature
        && typeof identity.orderNumber === 'string'
        && typeof identity.idempotencyKey === 'string') return identity;
    }
  } catch {
    // Generate an identity when session storage is unavailable or invalid.
  }

  const identity = {
    payloadSignature,
    orderNumber: `LSO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    idempotencyKey: crypto.randomUUID(),
  };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(identity));
  } catch {
    // Continue with this in-memory identity when session storage is unavailable.
  }
  return identity;
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
      'Add a product to the shopping cart by product ID and quantity. Updates the cart in localStorage.',
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
      const id = String(input.id || '');
      const qty = Number(input.qty || 1);

      const prodRes = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { signal });
      if (!prodRes.ok) {
        return { error: `Product not found: ${prodRes.status}` };
      }
      const product = await prodRes.json();
      if (product.availabilityUnknown === true || product.catalogSnapshotFallback === true) {
        return { error: 'Product availability cannot be verified right now; it was not added to your cart.' };
      }

      const cart = getCart();
      const existing = cart.items.find((i) => i.id === id);
      if (existing) {
        existing.qty += qty;
      } else {
        cart.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          qty,
          unit: product.unit,
        });
      }
      saveCart(cart);
      return { ok: true, cart };
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
      const total = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
      return { ...cart, total };
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
      saveCart({ items: [] });
      return { ok: true, message: 'Cart cleared' };
    },
  },

  submit_order: {
    description:
      'Submit the current cart as a grocery order with customer delivery details. Requires customer name, phone, and address.',
    inputSchema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Customer full name' },
        customerPhone: { type: 'string', description: 'Customer phone number (BD format)' },
        customerAddress: { type: 'string', description: 'Delivery address in Chittagong' },
        notes: { type: 'string', description: 'Optional delivery notes' },
        paymentMethod: { type: 'string', enum: ['cod', 'bkash'], description: 'Payment method selected by the customer' },
      },
      required: ['customerName', 'customerPhone', 'customerAddress', 'paymentMethod'],
    },
    annotations: { readOnlyHint: false, consequentialHint: true },
    async execute(input, { signal }) {
      const cart = getCart();
      if (!cart.items.length) {
        return { error: 'Cart is empty' };
      }

      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const deliveryFee = subtotal >= 500 ? 0 : 40;
      const payloadSignature = JSON.stringify({
        items: cart.items.map(({ id, qty }) => ({ id, qty })).sort((a, b) => a.id.localeCompare(b.id)),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        notes: input.notes,
        paymentMethod: input.paymentMethod,
      });
      const identity = getCheckoutIdentity(payloadSignature);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: identity.orderNumber,
          idempotencyKey: identity.idempotencyKey,
          items: cart.items,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
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
        return { error: err.error || `Checkout failed: ${res.status}` };
      }

      const order = await res.json();
      // Clear cart on successful order
      saveCart({ items: [] });
      try { sessionStorage.removeItem('lucky-webmcp-checkout-identity'); } catch { /* Storage may be unavailable. */ }
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
