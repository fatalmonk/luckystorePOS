# React POS - Complete Execution Plan

## Overview
Step-by-step plan to build the React + Vite + TypeScript + Tailwind POS application with Supabase integration.

---

## Phase 0: Prerequisites & Setup (Day 1)

### 0.1 Verify Prerequisites
**Priority: CRITICAL**

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Supabase project created
- [ ] Supabase SQL schema deployed

**Deliverable:** All prerequisites verified

### 0.2 Create Project Structure
**Priority: CRITICAL**

```bash
# Create Vite project
npm create vite@latest lucky-pos -- --template react-ts
cd lucky-pos

# Install dependencies
npm install
npm install @supabase/supabase-js axios localforage idb-keyval react-router-dom@6 clsx

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install dev tools (optional but recommended)
npm install -D eslint prettier eslint-config-prettier @types/node
```

**Deliverable:** Project scaffolded with dependencies

### 0.3 Configure Environment
**Priority: CRITICAL**

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CREATE_SALE_EDGE_URL=https://your-project.supabase.co/functions/v1/create-sale
```

**Deliverable:** Environment variables configured

---

## Phase 1: Core Setup (Day 1)

### 1.1 Configure Tailwind
**Priority: HIGH**

- [ ] Update `tailwind.config.cjs` (provided)
- [ ] Update `src/index.css` (provided)
- [ ] Verify Tailwind working

**Deliverable:** Tailwind CSS configured

### 1.2 Set Up Supabase Client
**Priority: CRITICAL**

- [ ] Create `src/lib/supabase.ts`
- [ ] Test connection to Supabase
- [ ] Verify environment variables loaded

**Deliverable:** Supabase client working

### 1.3 Set Up Routing
**Priority: HIGH**

- [ ] Create `src/App.tsx` with routes
- [ ] Create `src/main.tsx` with router
- [ ] Test navigation between pages

**Deliverable:** Routing working

---

## Phase 2: Type Definitions (Day 1)

### 2.1 Create TypeScript Types
**Priority: HIGH**

- [ ] Create `src/types.ts`
- [ ] Define `Item` interface
- [ ] Define `BillItem` interface
- [ ] Define other types as needed

**Deliverable:** Type definitions complete

---

## Phase 3: POS Page (Day 2)

### 3.1 Create POS Component Structure
**Priority: CRITICAL**

- [ ] Create `src/pages/POS.tsx`
- [ ] Set up state management
- [ ] Create layout (3-column grid)
- [ ] Add barcode input field

**Deliverable:** POS page structure

### 3.2 Implement Barcode Scanning
**Priority: CRITICAL**

- [ ] Auto-focus barcode input
- [ ] Handle Enter key press
- [ ] Search items by barcode
- [ ] Add item to bill on match

**Deliverable:** Barcode scanning working

### 3.3 Implement Item Search
**Priority: HIGH**

- [ ] Add search input
- [ ] Debounce search queries
- [ ] Display search results grid
- [ ] Add item to bill on click

**Deliverable:** Item search working

### 3.4 Implement Bill Management
**Priority: CRITICAL**

- [ ] Display bill items table
- [ ] Edit quantities
- [ ] Remove items
- [ ] Calculate totals

**Deliverable:** Bill management working

### 3.5 Implement Checkout
**Priority: CRITICAL**

- [ ] Create checkout function
- [ ] Call Edge Function API
- [ ] Handle success/error
- [ ] Clear bill on success
- [ ] Show receipt (basic)

**Deliverable:** Checkout flow working

---

## Phase 4: Admin Items Page (Day 2-3)

### 4.1 Create Items Admin Component
**Priority: HIGH**

- [ ] Create `src/pages/ItemsAdmin.tsx`
- [ ] Set up layout (list + form)
- [ ] Load items from Supabase
- [ ] Display items grid

**Deliverable:** Items list displaying

### 4.2 Implement CRUD Operations
**Priority: HIGH**

- [ ] Create new item
- [ ] Edit existing item
- [ ] Update item in Supabase
- [ ] Delete item (optional)

**Deliverable:** CRUD operations working

### 4.3 Implement Image Upload
**Priority: MEDIUM**

- [ ] Add file input
- [ ] Upload to Supabase Storage
- [ ] Get public URL
- [ ] Update item with image URL
- [ ] Display images in list

**Deliverable:** Image upload working

---

## Phase 5: Offline Sync (Day 3-4)

### 5.1 Set Up IndexedDB Queue
**Priority: HIGH**

- [ ] Create `src/services/sync.ts`
- [ ] Configure localforage
- [ ] Implement `enqueueOp` function
- [ ] Implement queue storage

**Deliverable:** Queue system ready

### 5.2 Implement Sync Worker
**Priority: HIGH**

- [ ] Create `flushQueue` function
- [ ] Process queue items
- [ ] Handle retries
- [ ] Remove successful ops
- [ ] Handle errors

**Deliverable:** Sync worker working

### 5.3 Integrate with POS
**Priority: HIGH**

- [ ] Queue sales when offline
- [ ] Show offline indicator
- [ ] Auto-sync when online
- [ ] Handle sync conflicts

**Deliverable:** Offline support working

---

## Phase 6: Authentication (Day 4)

### 6.1 Set Up Auth Flow
**Priority: HIGH**

- [ ] Create login page
- [ ] Implement Supabase Auth
- [ ] Store session
- [ ] Protect routes

**Deliverable:** Authentication working

### 6.2 Store Configuration
**Priority: HIGH**

- [ ] Store `store_id` in localStorage
- [ ] Store `cashier_id` in localStorage
- [ ] Load on app start
- [ ] Update POS to use stored IDs

**Deliverable:** Store/cashier config working

---

## Phase 7: Edge Functions Integration (Day 4-5)

### 7.1 Create Process Sale Function
**Priority: CRITICAL**

- [ ] Create `supabase/functions/create-sale/index.ts`
- [ ] Implement sale creation
- [ ] Generate receipt number
- [ ] Update stock levels
- [ ] Log stock movements
- [ ] Deploy function

**Deliverable:** Process sale function deployed

### 7.2 Test Edge Function
**Priority: HIGH**

- [ ] Test from POS page
- [ ] Verify sale created
- [ ] Verify stock updated
- [ ] Verify receipt number generated

**Deliverable:** Edge function tested

---

## Phase 8: Realtime Sync (Day 5)

### 8.1 Set Up Realtime Subscriptions
**Priority: MEDIUM**

- [ ] Subscribe to `stock_levels` changes
- [ ] Subscribe to `sales` changes
- [ ] Update UI on changes
- [ ] Handle connection/disconnection

**Deliverable:** Realtime updates working

### 8.2 Multi-Counter Sync
**Priority: MEDIUM**

- [ ] Test multiple browser tabs
- [ ] Verify stock updates propagate
- [ ] Verify sales appear on all counters

**Deliverable:** Multi-counter sync working

---

## Phase 9: Polish & UX (Day 5-6)

### 9.1 Keyboard Shortcuts
**Priority: MEDIUM**

- [ ] F1 - New sale
- [ ] F2 - Hold bill
- [ ] F3 - Focus barcode
- [ ] Enter - Add item
- [ ] Esc - Cancel

**Deliverable:** Keyboard shortcuts working

### 9.2 Receipt Printing
**Priority: MEDIUM**

- [ ] Create receipt component
- [ ] Format receipt data
- [ ] Print functionality
- [ ] WebUSB integration (optional)

**Deliverable:** Receipt printing working

### 9.3 Error Handling
**Priority: HIGH**

- [ ] Handle network errors
- [ ] Handle API errors
- [ ] Show user-friendly messages
- [ ] Log errors for debugging

**Deliverable:** Error handling complete

---

## Phase 10: Testing & Deployment (Day 6-7)

### 10.1 Unit Tests
**Priority: MEDIUM**

- [ ] Test utility functions
- [ ] Test calculations
- [ ] Test data transformations

**Deliverable:** Unit tests written

### 10.2 Integration Tests
**Priority: HIGH**

- [ ] Test POS flow end-to-end
- [ ] Test checkout process
- [ ] Test offline sync
- [ ] Test admin operations

**Deliverable:** Integration tests passing

### 10.3 Build & Deploy
**Priority: CRITICAL**

- [ ] Build production bundle
- [ ] Test production build
- [ ] Deploy to Vercel/Netlify
- [ ] Configure environment variables
- [ ] Test deployed app

**Deliverable:** App deployed and working

---

## Quick Start Checklist

### Today (Day 1)
- [ ] Run project setup commands
- [ ] Configure Tailwind
- [ ] Set up Supabase client
- [ ] Create basic routing
- [ ] Test connection to Supabase

### Tomorrow (Day 2)
- [ ] Build POS page
- [ ] Implement barcode scanning
- [ ] Implement checkout
- [ ] Test POS flow

### Day 3
- [ ] Build Admin page
- [ ] Implement CRUD
- [ ] Implement image upload
- [ ] Test admin operations

### Day 4
- [ ] Implement offline sync
- [ ] Add authentication
- [ ] Deploy Edge Functions
- [ ] Test end-to-end

### Day 5-7
- [ ] Add realtime sync
- [ ] Polish UX
- [ ] Add keyboard shortcuts
- [ ] Test and deploy

---

## File Structure

```
lucky-pos/
├── src/
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── POS.tsx
│   │   └── ItemsAdmin.tsx
│   ├── services/
│   │   └── sync.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.local
├── package.json
├── tailwind.config.cjs
└── vite.config.ts
```

---

## Success Criteria

### MVP Complete When:
- [ ] POS page loads items
- [ ] Barcode scanning works
- [ ] Can add items to bill
- [ ] Can checkout and create sale
- [ ] Admin can create/edit items
- [ ] Images can be uploaded
- [ ] Offline queue works
- [ ] App deployed and accessible

---

## Next Steps After MVP

1. **Authentication Flow**
   - Cashier login
   - Role-based access
   - Session management

2. **Realtime Updates**
   - Stock changes
   - Multi-counter sync
   - Live updates

3. **Receipt Printing**
   - WebUSB integration
   - Print agent setup
   - Receipt templates

4. **Reports**
   - Daily sales report
   - Stock reports
   - Analytics dashboard

5. **Advanced Features**
   - Hold/resume bills
   - Returns/refunds
   - Discounts
   - Multiple payment methods

---

## Troubleshooting

### Common Issues

**Issue:** Supabase connection fails
- Check `.env.local` file exists
- Verify environment variables correct
- Check Supabase project status

**Issue:** Tailwind not working
- Verify `tailwind.config.cjs` content paths
- Check `index.css` imports Tailwind
- Restart dev server

**Issue:** Build fails
- Check TypeScript errors
- Verify all imports correct
- Check node_modules installed

---

## Resources

- **Vite Docs:** https://vitejs.dev
- **React Docs:** https://react.dev
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind Docs:** https://tailwindcss.com/docs

---

**Status:** Ready to start  
**Estimated Time:** 5-7 days for MVP  
**Next Action:** Run Phase 0 setup commands

