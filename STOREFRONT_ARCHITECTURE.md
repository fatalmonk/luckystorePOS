# Lucky Store — Online Storefront Architecture

## System Overview
A separate customer-facing Next.js 15 storefront that connects to the existing Lucky Store POS Supabase backend. Guest checkout only. 5km delivery radius. Cash on Delivery (COD) for Week 1.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS v3 (same tokens as admin)
- Supabase JS v2
- shadcn/ui components
- Google Maps JS API (distance calculation)

## Database Schema

### online_orders
```sql
CREATE TABLE online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES stores(id) NOT NULL,

  -- Guest customer (no account system)
  customer_name VARCHAR(100) NOT NULL,
  customer_whatsapp VARCHAR(20) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_lat DECIMAL(10,8),
  customer_lng DECIMAL(11,8),

  -- Order
  order_number VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),

  -- Financial
  subtotal DECIMAL(12,2) NOT NULL,
  delivery_fee DECIMAL(12,2) DEFAULT 40,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,

  -- Payment (COD only for Week 1)
  payment_method VARCHAR(20) DEFAULT 'cod' 
    CHECK (payment_method IN ('cod')),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid')),

  -- Delivery
  rider_id UUID,
  rider_assigned_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_online_orders_tenant ON online_orders(tenant_id);
CREATE INDEX idx_online_orders_status ON online_orders(status);
CREATE INDEX idx_online_orders_whatsapp ON online_orders(customer_whatsapp);
```

### online_order_items
```sql
CREATE TABLE online_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES online_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL
);

CREATE INDEX idx_online_order_items_order ON online_order_items(order_id);
```

### delivery_zones
```sql
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES stores(id) NOT NULL,
  store_lat DECIMAL(10,8) NOT NULL,
  store_lng DECIMAL(11,8) NOT NULL,
  radius_km DECIMAL(5,2) DEFAULT 5.0,
  delivery_fee DECIMAL(12,2) DEFAULT 40,
  UNIQUE(tenant_id)
);
```

### RLS Policies
```sql
-- Tenant isolation for online_orders
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_online_orders_isolation ON online_orders
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Public read for order status tracking (via order_number, no auth needed)
CREATE POLICY public_order_tracking ON online_orders
  FOR SELECT
  USING (true); -- Filtered by order_number in query

-- Tenant isolation for online_order_items
ALTER TABLE online_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_online_order_items_isolation ON online_order_items
  USING (order_id IN (
    SELECT id FROM online_orders 
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
  ));

-- Tenant isolation for delivery_zones
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_delivery_zones_isolation ON delivery_zones
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

## Order Number Format
`LSO-YYYYMMDD-###` where ### is daily sequence (001, 002, etc.)

## Week 1 Scope (Minimal Viable Launch)

### Must Have
1. Supabase schema (migration file)
2. Next.js scaffold with Tailwind + tokens
3. Storefront: category grid, product listing, search
4. Product detail with add to cart
5. Cart: review items, adjust qty, remove
6. Checkout: guest form (name, WhatsApp, address), 5km radius check, delivery fee calc
7. Order confirmation page with status tracking
8. Real-time stock sync (Supabase realtime subscriptions)

### Must NOT Have (Week 2+)
- bKash/SSLCommerz prepay
- Rider app
- WhatsApp auto-messages
- Cashier UI for online orders (POS integration)
- Admin dashboard online order management
- Customer accounts / login
- Reviews / ratings

## Storefront Pages

| Route | Purpose |
|-------|---------|
| `/` | Storefront home: categories, featured products |
| `/category/[slug]` | Product grid with filters |
| `/product/[id]` | Product detail, image, price, add to cart |
| `/cart` | Cart review, proceed to checkout |
| `/checkout` | Guest info, address, delivery check, place order |
| `/order/[orderNumber]` | Order status tracking (public, no auth) |

## State Management
- Cart: `localStorage` (persists across sessions)
- Order tracking: URL param only (no auth)
- Real-time stock: Supabase realtime channel per product

## API Routes (Next.js App Router)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/distance` | POST | Calculate distance from store to customer address |
| `/api/order` | POST | Create order + items in single transaction |
| `/api/order/[orderNumber]` | GET | Fetch order status (public) |

## Critical Business Rules

1. **5km Gate:** Before showing products, verify customer location is within 5km of store. If not, show "Delivery not available" with store phone.
2. **Stock Sync:** When customer adds to cart, check real-time stock. If POS sells last unit, immediately show "Out of Stock" and disable add.
3. **Order Lock:** When order is placed, items are "reserved" (not yet deducted). Deduction happens when cashier "accepts" order (Week 2).
4. **Guest Only:** No signup, no login, no accounts. WhatsApp number is the customer identifier.
5. **COD Only:** No online payment in Week 1. Cashier collects from rider upon delivery.
