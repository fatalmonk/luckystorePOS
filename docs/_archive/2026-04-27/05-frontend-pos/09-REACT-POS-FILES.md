# React POS - Complete File Structure

## All Files with Full Content

Copy-paste ready code for every file in the React POS application.

---

## Root Files

### `package.json`

```json
{
  "name": "lucky-pos",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "axios": "^1.6.0",
    "clsx": "^2.0.0",
    "idb-keyval": "^6.2.1",
    "localforage": "^1.10.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "postcss": "^8.4.31",
    "prettier": "^3.1.0",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
```

### `.env.local` (Create this file)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_CREATE_SALE_EDGE_URL=https://your-project.supabase.co/functions/v1/create-sale
```

### `.gitignore`

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment variables
.env.local
.env.production.local
```

---

## Source Files

### `src/main.tsx`

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global styles */
body { 
  @apply bg-slate-50 text-slate-800; 
}

.btn { 
  @apply px-4 py-2 rounded-md font-semibold transition-colors; 
}

.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
```

### `src/types.ts`

```typescript
export interface Item {
  id: string;
  sku?: string;
  barcode?: string;
  name: string;
  category_id?: string | null;
  cost?: number;
  price?: number;
  image_url?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillItem {
  id: string; // item id
  name: string;
  price: number;
  cost?: number;
  qty: number;
  barcode?: string;
}

export interface Sale {
  id: string;
  store_id: string;
  cashier_id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}
```

### `src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### `src/App.tsx`

```typescript
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import POS from "./pages/POS";
import ItemsAdmin from "./pages/ItemsAdmin";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Lucky POS</h1>
        <nav className="flex gap-2">
          <Link to="/" className="btn btn-primary">POS</Link>
          <Link to="/items" className="btn bg-gray-100 hover:bg-gray-200">
            Items
          </Link>
        </nav>
      </header>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/items" element={<ItemsAdmin />} />
        </Routes>
      </main>
    </div>
  );
}
```

---

## Page Components

### `src/pages/POS.tsx`

```typescript
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { BillItem } from "../types";

export default function POS() {
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [bill, setBill] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const createSaleUrl = import.meta.env.VITE_CREATE_SALE_EDGE_URL as string;

  useEffect(() => {
    barcodeRef.current?.focus();
    loadItems("");
  }, []);

  async function loadItems(q: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, price, cost, barcode")
        .ilike("name", `%${q}%`)
        .eq("active", true)
        .limit(30);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error loading items:", err);
    } finally {
      setLoading(false);
    }
  }

  function addItemToBill(item: any) {
    setBill((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      } else {
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price || 0,
            cost: item.cost || 0,
            qty: 1,
            barcode: item.barcode,
          },
        ];
      }
    });
    setBarcode("");
    barcodeRef.current?.focus();
  }

  async function handleBarcodeEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter" && barcode.trim()) {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, price, cost, barcode")
        .eq("barcode", barcode.trim())
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error:", error);
        return;
      }

      if (data) {
        addItemToBill(data);
      } else {
        alert("Item not found: " + barcode.trim());
        setBarcode("");
      }
    }
  }

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return;
    setBill((prev) => {
      const copy = [...prev];
      copy[idx].qty = qty;
      return copy;
    });
  }

  function removeLine(idx: number) {
    setBill((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = bill.reduce((s, it) => s + it.price * it.qty, 0);

  async function checkoutCash() {
    if (bill.length === 0) {
      alert("Empty bill");
      return;
    }

    const storeId = localStorage.getItem("store_id") || "";
    const cashierId = localStorage.getItem("cashier_id") || "";

    if (!storeId || !cashierId) {
      alert("Store or cashier not configured. Please set in localStorage.");
      return;
    }

    const payload = {
      store_id: storeId,
      cashier_id: cashierId,
      subtotal: subtotal,
      discount: 0,
      total: subtotal,
      payment_method: "cash",
      payment_meta: { tendered: subtotal },
      items: bill.map((it) => ({
        item_id: it.id,
        batch_id: null,
        price: it.price,
        cost: it.cost || 0,
        qty: it.qty,
      })),
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(createSaleUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        alert("Checkout error: " + (json?.error || JSON.stringify(json)));
        return;
      }

      alert("Sale created! Receipt: " + (json.receipt_number || "N/A"));
      setBill([]);
      barcodeRef.current?.focus();
    } catch (err) {
      console.error(err);
      alert("Network or server error");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-white p-4 rounded shadow">
        <div className="flex gap-3 mb-4">
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeEnter}
            className="border p-2 rounded flex-1"
            placeholder="Scan or type barcode and press Enter"
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={() => barcodeRef.current?.focus()}
          >
            Focus
          </button>
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadItems(e.target.value);
            }}
            placeholder="Search by name..."
            className="w-full border p-2 rounded"
          />
          {loading && <div className="mt-2 text-sm text-gray-500">Loading...</div>}
          <div className="grid grid-cols-4 gap-3 mt-3 max-h-96 overflow-y-auto">
            {items.map((it) => (
              <div
                key={it.id}
                className="p-2 border rounded hover:shadow cursor-pointer"
                onClick={() => addItemToBill(it)}
              >
                <div className="font-semibold text-sm">{it.name}</div>
                <div className="text-sm text-green-600">
                  ৳{(it.price || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-1 bg-white p-4 rounded shadow">
        <h2 className="font-bold text-lg mb-4">Bill</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Item</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {bill.map((it, idx) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={it.qty}
                      min={1}
                      className="w-16 p-1 border rounded"
                      onChange={(e) =>
                        updateQty(idx, parseInt(e.target.value || "1"))
                      }
                    />
                  </td>
                  <td className="p-2">৳{it.price.toFixed(2)}</td>
                  <td className="p-2">৳{(it.price * it.qty).toFixed(2)}</td>
                  <td className="p-2">
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeLine(idx)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-lg font-bold">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          <button
            className="btn btn-success w-full mt-3"
            onClick={checkoutCash}
          >
            Checkout (Cash)
          </button>
        </div>
      </div>
    </div>
  );
}
```

### `src/pages/ItemsAdmin.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Item } from "../types";

export default function ItemsAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({});

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, price, sku, barcode, image_url, cost")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error loading items:", err);
      alert("Error loading items");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!form.name) {
      alert("Name required");
      return;
    }

    try {
      if (form.id) {
        const { error } = await supabase
          .from("items")
          .update(form)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("items").insert(form);
        if (error) throw error;
      }
      setForm({});
      loadItems();
      alert("Saved successfully");
    } catch (err: any) {
      console.error("Error saving:", err);
      alert("Error saving: " + err.message);
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const path = `items/${crypto.randomUUID()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("item-images").getPublicUrl(path);
      setForm({ ...form, image_url: data.publicUrl });
      alert("Image uploaded successfully");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Upload error: " + err.message);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;

    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      loadItems();
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-bold text-xl mb-4">Items Management</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          {loading && <div className="mb-4">Loading...</div>}
          <div className="grid grid-cols-3 gap-2">
            {items.map((it) => (
              <div key={it.id} className="p-3 border rounded hover:shadow">
                {it.image_url && (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <div className="font-semibold">{it.name}</div>
                <div className="text-sm text-green-600">
                  ৳{(it.price || 0).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {it.sku || it.barcode || "No SKU"}
                </div>
                <div className="mt-2 flex gap-1">
                  <button
                    className="btn bg-gray-100 text-sm"
                    onClick={() => setForm(it)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn bg-red-100 text-red-700 text-sm"
                    onClick={() => deleteItem(it.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <h3 className="font-semibold mb-3">Create / Edit Item</h3>
          <div className="space-y-3">
            <input
              placeholder="Name *"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              placeholder="SKU"
              value={form.sku || ""}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              placeholder="Barcode"
              value={form.barcode || ""}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Cost"
              value={form.cost ?? ""}
              onChange={(e) =>
                setForm({ ...form, cost: parseFloat(e.target.value || "0") })
              }
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Price *"
              value={form.price ?? ""}
              onChange={(e) =>
                setForm({ ...form, price: parseFloat(e.target.value || "0") })
              }
              className="w-full p-2 border rounded"
            />
            <div>
              <label className="block text-sm mb-1">Image</label>
              <input type="file" onChange={uploadImage} className="w-full" />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded"
                />
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={save}>
                Save
              </button>
              <button
                className="btn bg-gray-100"
                onClick={() => setForm({})}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Service Files

### `src/services/sync.ts`

```typescript
// sync.ts - Offline queue skeleton
import localforage from "localforage";
import { supabase } from "../lib/supabase";

localforage.config({ name: "lucky-pos-queue" });

type Op = {
  id: string;
  type: "sale" | "item_upsert";
  payload: any;
  created_at: string;
};

export async function enqueueOp(op: Op) {
  const list = (await localforage.getItem<Op[]>("opqueue")) || [];
  list.push(op);
  await localforage.setItem("opqueue", list);
}

export async function flushQueue() {
  const list = (await localforage.getItem<Op[]>("opqueue")) || [];
  if (list.length === 0) return;

  const createSaleUrl = import.meta.env.VITE_CREATE_SALE_EDGE_URL as string;

  for (const op of list) {
    try {
      if (op.type === "sale") {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        const res = await fetch(createSaleUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(op.payload),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Request failed");
        }

        // Remove from queue on success
        const updatedList = list.filter((o) => o.id !== op.id);
        await localforage.setItem("opqueue", updatedList);
      } else if (op.type === "item_upsert") {
        await supabase.from("items").upsert(op.payload);
        const updatedList = list.filter((o) => o.id !== op.id);
        await localforage.setItem("opqueue", updatedList);
      }
    } catch (err) {
      console.error("Flush op failed", err);
      // Implement exponential backoff / stop on repeated failure
      break;
    }
  }
}

// Auto-flush when online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
}
```

---

## Configuration Files

### `tailwind.config.cjs`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### `tsconfig.json` (Auto-generated by Vite, verify it exists)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Next Steps

1. Copy all files to your project
2. Update `.env.local` with your Supabase credentials
3. Run `npm run dev`
4. Test POS and Admin pages
5. Deploy Edge Functions
6. Test end-to-end flow

---

## File Creation Order

1. Root config files (package.json, tailwind.config.cjs)
2. Environment (.env.local)
3. Core lib files (supabase.ts, types.ts)
4. App structure (main.tsx, App.tsx, index.css)
5. Pages (POS.tsx, ItemsAdmin.tsx)
6. Services (sync.ts)

---

**Status:** All files ready to copy-paste  
**Next:** Follow setup guide and create files in order

