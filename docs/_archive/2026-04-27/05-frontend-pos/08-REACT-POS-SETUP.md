# React POS - Setup Guide

## Quick Setup (15 minutes)

### Step 1: Create Project

```bash
# Create Vite project with React + TypeScript
npm create vite@latest lucky-pos -- --template react-ts

# Navigate to project
cd lucky-pos

# Install base dependencies
npm install
```

### Step 2: Install Required Packages

```bash
# Core dependencies
npm install @supabase/supabase-js axios localforage idb-keyval react-router-dom@6 clsx

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Dev tools (optional but recommended)
npm install -D eslint prettier eslint-config-prettier @types/node
```

### Step 3: Configure Tailwind

**File: `tailwind.config.cjs`**

```javascript
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: { extend: {} },
  plugins: []
};
```

**File: `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global styles */
body { 
  @apply bg-slate-50 text-slate-800; 
}

.btn { 
  @apply px-4 py-2 rounded-md font-semibold; 
}
```

### Step 4: Set Up Environment Variables

**Create `.env.local` in project root:**

```env
# Lucky Store Supabase Configuration
VITE_SUPABASE_URL=https://cckschiexzvysvdracvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3NjaGlleHp2eXN2ZHJhY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDA3NjMsImV4cCI6MjA3ODk3Njc2M30.1htIKuXVNs9mtRSktS2cBk2QvAriXpYgipIYuVuI3T8
VITE_CREATE_SALE_EDGE_URL=https://cckschiexzvysvdracvc.supabase.co/functions/v1/create-sale
VITE_IMPORT_INVENTORY_EDGE_URL=https://cckschiexzvysvdracvc.supabase.co/functions/v1/import-inventory
```

**⚠️ Important:** 
- The `.env.local` file is already created in the project root with your credentials
- This file is in `.gitignore` and will NOT be committed to git
- For service role key (Edge Functions), get it from: Supabase Dashboard → Settings → API → service_role key

### Step 5: Create Core Files

Follow the file-by-file guide in `09-REACT-POS-FILES.md`

### Step 6: Start Dev Server

```bash
npm run dev
```

Open http://localhost:5173

---

## Verification Checklist

### After Setup

- [ ] Project created successfully
- [ ] Dependencies installed
- [ ] Tailwind configured
- [ ] Environment variables set
- [ ] Dev server starts without errors
- [ ] Can navigate to `/` and `/items`

### After Core Files

- [ ] Supabase client connects
- [ ] POS page loads
- [ ] Items Admin page loads
- [ ] No console errors

---

## Common Setup Issues

### Issue: "Cannot find module"
**Solution:** Run `npm install` again

### Issue: Tailwind styles not applying
**Solution:** 
1. Check `tailwind.config.cjs` content paths
2. Verify `index.css` imports Tailwind
3. Restart dev server

### Issue: Environment variables not loading
**Solution:**
1. Ensure file is named `.env.local` (not `.env`)
2. Variables must start with `VITE_`
3. Restart dev server after changes

### Issue: Supabase connection fails
**Solution:**
1. Verify `.env.local` has correct values
2. Check Supabase project is active
3. Verify anon key is correct

---

## Next Steps

1. ✅ Complete setup
2. ✅ Create core files
3. ✅ Test basic functionality
4. ✅ Build POS page
5. ✅ Build Admin page
6. ✅ Deploy Edge Functions
7. ✅ Test end-to-end

---

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## Project Structure

```
lucky-pos/
├── src/
│   ├── lib/          # Utilities (supabase client)
│   ├── pages/        # Page components
│   ├── services/     # Business logic (sync)
│   ├── types.ts      # TypeScript types
│   ├── App.tsx       # Main app component
│   ├── main.tsx      # Entry point
│   └── index.css     # Global styles
├── .env.local        # Environment variables
├── package.json
├── tailwind.config.cjs
└── vite.config.ts
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGc...` |
| `VITE_CREATE_SALE_EDGE_URL` | Edge Function URL | `https://abc123.supabase.co/functions/v1/create-sale` |

---

## Supabase Setup Checklist

Before starting React app:

- [ ] Supabase project created
- [ ] SQL schema deployed
- [ ] Storage bucket `item-images` created
- [ ] Edge Function `create-sale` deployed
- [ ] Edge Function `import-inventory` deployed
- [ ] At least one store created
- [ ] Test data inserted (optional)

---

## Ready to Code!

Once setup is complete, proceed to:
1. `09-REACT-POS-FILES.md` - Create all files
2. `10-REACT-POS-IMPLEMENTATION.md` - Follow implementation phases
3. Test each component as you build

