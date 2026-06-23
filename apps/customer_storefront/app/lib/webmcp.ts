/**
 * WebMCP Client — exposes site tools to AI agents via the browser.
 * https://webmachinelearning.github.io/webmcp/
 *
 * This script calls navigator.modelContext.provideContext() with tool
 * definitions that allow AI agents to interact with the Lucky Store
 * storefront programmatically.
 */

interface WebMCPNavigator extends Navigator {
  modelContext?: {
    provideContext: (context: {
      tools: Record<string, {
        description: string;
        inputSchema: object;
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      }>;
    }) => void;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
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

export function initWebMCP() {
  const nav = navigator as WebMCPNavigator;

  if (!nav.modelContext?.provideContext) {
    return;
  }

  nav.modelContext.provideContext({
    tools: {
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
        async execute(input: Record<string, unknown>) {
          const query = String(input.query || '');
          const limit = Number(input.limit || 10);
          const res = await fetch(
            `/api/products?q=${encodeURIComponent(query)}&limit=${limit}`
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
        async execute() {
          const res = await fetch('/api/categories');
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
        async execute(input: Record<string, unknown>) {
          const id = String(input.id || '');
          const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`);
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
        async execute(input: Record<string, unknown>) {
          const id = String(input.id || '');
          const qty = Number(input.qty || 1);

          const prodRes = await fetch(`/api/products?id=${encodeURIComponent(id)}`);
          if (!prodRes.ok) {
            return { error: `Product not found: ${prodRes.status}` };
          }
          const product = await prodRes.json();

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
          },
          required: ['customerName', 'customerPhone', 'customerAddress'],
        },
        async execute(input: Record<string, unknown>) {
          const cart = getCart();
          if (!cart.items.length) {
            return { error: 'Cart is empty' };
          }

          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart.items,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              customerAddress: input.customerAddress,
              notes: input.notes,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: err.error || `Checkout failed: ${res.status}` };
          }

          const order = await res.json();
          // Clear cart on successful order
          saveCart({ items: [] });
          return order;
        },
      },

      check_health: {
        description: 'Check the health status of the Lucky Store API.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        async execute() {
          const res = await fetch('/api/health');
          return res.json();
        },
      },
    },
  });
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebMCP);
  } else {
    initWebMCP();
  }
}