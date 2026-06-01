## Core Problems

**1. Product Discovery is Broken**
- 8-item grid forces excessive scrolling
- Category pills buried on left sidebar
- Search input competes with scan button
- No keyboard shortcuts for common actions

**2. Cart Friction**
- Discount controls demand precision typing (terrible for touchscreens)
- Quantity buttons too small for tablet taps
- No bulk add workflow
- Mobile sheet wastes vertical space with handle/header chrome

**3. Visual Hierarchy Chaos**
- Primary yellow (#E8B84B) on product cards AND continue button dilutes focus
- Stock badges (gray) invisible against card backgrounds
- Price typography too small (13px) for glance-reading

**4. Missing Tablet Patterns**
- No numpad for quantity/payment entry
- No recent items memory
- No hold/park sale workflow
- Scanner input requires manual focus toggle

## Refactor Plan

### Layout: 3-Column → 2-Column
```
┌─────────────────────────────────────────────┬──────────────┐
│ SEARCH + CATEGORIES (horizontal pills)      │   CART       │
├─────────────────────────────────────────────┤   PANEL      │
│                                             │              │
│         PRODUCT GRID (4 columns)            │   Always     │
│         Larger cards, faster scanning       │   Visible    │
│                                             │              │
└─────────────────────────────────────────────┴──────────────┘
```

### Product Card Redesign
```tsx
// Before: 200px card with cluttered info
<div className="product-card">
  <img 48px /> 
  <name 14px>
  <sku 12px gray>
  <stock badge>
  <price 13px>
  <button>
</div>

// After: 180px card, scannable hierarchy
<div className="product-card" onClick={addToCart}>
  <img 64px circle />
  <name 16px bold truncate-1-line>
  <price 20px primary> ৳100 </price>
  <stock 24px badge IF <10> 
  {/* Tap card = +1 qty. No button. */}
</div>
```

### Search Bar Overhaul
```tsx
// Add keyboard shortcuts
<input 
  autoFocus
  placeholder="Search or scan (F2)"
  onKeyDown={(e) => {
    if (e.key === 'Enter' && e.ctrlKey) focusCart();
    if (e.key === 'F2') toggleScanner();
  }}
/>
```

### Category Pills: Horizontal Scroll
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 mb-4">
  {categories.map(cat => (
    <button className={cn(
      "px-4 py-2 rounded-full whitespace-nowrap",
      active ? "bg-primary text-primary-on" : "bg-surface border"
    )}>
      {cat.name} <span className="opacity-60">{cat.count}</span>
    </button>
  ))}
</div>
```

### Cart Panel: Fixed Numpad
```tsx
function CartPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Items list - scroll */}
      <div className="flex-1 overflow-auto">
        {cart.map(item => (
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-muted">
                ৳{item.price} × {item.qty}
              </div>
            </div>
            <div className="text-lg font-bold">৳{item.total}</div>
            <button onClick={() => remove(item)}>
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Sticky footer: totals + numpad */}
      <div className="border-t p-4 bg-surface">
        {/* Discount: tap ৳/% to toggle type, numpad to input */}
        <div className="flex gap-2 mb-3">
          <button 
            className={cn("flex-1 py-2", discountType === 'amount' && "bg-primary")}
            onClick={() => setDiscountType('amount')}
          >
            Discount ৳
          </button>
          <button 
            className={cn("flex-1 py-2", discountType === '%' && "bg-primary")}
            onClick={() => setDiscountType('percentage')}
          >
            Discount %
          </button>
          <div className="flex-1 text-right text-xl">
            {discountValue || '0'}
          </div>
        </div>

        {/* Numpad for discount/qty/payment */}
        <Numpad onInput={handleNumpadInput} />

        {/* Total */}
        <div className="flex justify-between text-2xl font-bold mt-4">
          <span>TOTAL</span>
          <span className="text-success">৳{total}</span>
        </div>

        <button className="w-full mt-4 py-4 bg-primary text-primary-on text-lg font-bold">
          Continue (F12)
        </button>
      </div>
    </div>
  );
}
```

### Numpad Component
```tsx
function Numpad({ onInput }: { onInput: (value: string) => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <button
          key={key}
          className="aspect-square text-xl font-semibold bg-background-subtle hover:bg-border-default rounded-md"
          onClick={() => onInput(key)}
        >
          {key === '⌫' ? <Delete size={20} /> : key}
        </button>
      ))}
    </div>
  );
}
```

### Payment Modal: Single Screen
```tsx
// No tabs. Show all methods + numpad in one view.
<div className="payment-modal">
  {/* Total */}
  <div className="text-center mb-6">
    <div className="text-muted">Total Amount</div>
    <div className="text-4xl font-bold">৳{total}</div>
  </div>

  {/* Payment methods: tap to select */}
  <div className="grid grid-cols-2 gap-3 mb-6">
    {methods.map(m => (
      <button className={cn(
        "p-4 border-2 rounded-lg",
        selected === m.id && "border-primary bg-primary-subtle"
      )}>
        <Icon size={24} />
        <div className="font-semibold mt-2">{m.name}</div>
      </button>
    ))}
  </div>

  {/* Numpad for amount */}
  <Numpad onInput={setAmount} />

  {/* Quick amounts */}
  <div className="grid grid-cols-4 gap-2 mt-4">
    <button onClick={() => setAmount(100)}>৳100</button>
    <button onClick={() => setAmount(500)}>৳500</button>
    <button onClick={() => setAmount(1000)}>৳1K</button>
    <button onClick={() => setAmount(total)} className="bg-success text-white">
      Exact
    </button>
  </div>

  {/* Change display */}
  {amount > total && (
    <div className="mt-4 p-4 bg-success-subtle rounded-lg">
      <div className="text-success-dark text-sm">Change</div>
      <div className="text-2xl font-bold text-success">
        ৳{(amount - total).toFixed(2)}
      </div>
    </div>
  )}

  <button className="w-full mt-6 py-4 bg-primary">
    Complete Sale (F12)
  </button>
</div>
```

### Keyboard Shortcuts
```tsx
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'F2') toggleScanner();
    if (e.key === 'F12') openPaymentModal();
    if (e.ctrlKey && e.key === 'k') focusSearch();
    if (e.key === 'Escape') clearCart();
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, []);
```

### Design Token Updates
```css
/* Increase touch targets for tablet */
.product-card {
  min-height: 180px; /* was implicit via content */
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}
.product-card:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-level-1);
}

/* Make prices glanceable */
.product-price {
  font-size: 20px; /* was 13px */
  font-weight: 700;
  color: var(--color-primary-default);
}

/* Cart item spacing */
.cart-item {
  min-height: 64px; /* easy tap targets */
}

/* Numpad buttons */
.numpad-key {
  min-height: 56px;
  font-size: 18px;
}
```

## Implementation Priority

1. **Phase 1: Search + Grid** (30 min)
   - Horizontal category pills
   - 4-column grid with bigger cards
   - Tap card = add to cart

2. **Phase 2: Cart Numpad** (45 min)
   - Fixed numpad in cart footer
   - Discount controls with numpad input
   - Keyboard shortcuts (F2, F12)

3. **Phase 3: Payment Modal** (30 min)
   - Single-screen layout
   - Inline numpad
   - Quick amount buttons

4. **Phase 4: Polish** (20 min)
   - Scanner auto-focus on mount
   - Recent items cache (localStorage)
   - Loading skeletons for product images

Total refactor: **~2 hours**. Want me to generate the full code?
