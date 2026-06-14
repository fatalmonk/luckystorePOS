1|# Plan: Server Component Boundary Refactor
2|
3|> **Scope:** Redraw `'use client'` boundaries in `apps/customer_storefront` to ship smaller JS bundles, fix broken server rendering, and comply with the Next.js E-Commerce Optimization skill.
4|>
5|> **This is not just optimization — it fixes the current fundamentally broken server rendering strategy.** The production HTML contains almost no meaningful content (only skeleton shells), navigation requires JS, and the 193 KB JS bundle is doing work that should be static HTML.
6|>
7|> **Out of scope:** Visual redesign, new features, backend schema changes. We fix boundaries, accessibility, and progressive enhancement only.
8|>
9|> **Live site constraints:** No behavior changes for JS-enabled users. Every phase preview-deployed and smoke-tested before merging to `main`.
10|>
11|> **Target files (all in `apps/customer_storefront/app/`):**
12|> - `layout.tsx`
13|> - `page.tsx`
14|> - `category/[slug]/page.tsx`
15|> - `category/CategoryContent.tsx`
16|> - `category/CategoryShell.tsx` (new)
17|> - `category/CategoryShellSkeleton.tsx` (new)
18|> - `components/Header.tsx`
19|> - `components/HeaderCartButton.tsx` (new)
20|> - `components/HeaderSearch.tsx` (new)
21|> - `components/BottomNav.tsx`
22|> - `components/BottomNavCartPill.tsx` (new)
23|> - `components/HeroBanner.tsx`
24|> - `components/PromoGrid.tsx`
25|> - `components/CategoryGrid.tsx`
26|> - `components/ProductCarousel.tsx`
27|> - `components/ProductSwimlane.tsx`
28|> - `components/ProductGrid.tsx`
29|> - `components/ProductCard.tsx`
30|> - `components/PriceDisplay.tsx` (new)
31|> - `components/SocialCarousel.tsx`
32|> - `components/CartProvider.tsx`
33|> - `components/ToastProvider.tsx` / `Toast.tsx`
34|> - `cart/page.tsx`
35|> - `product/[id]/page.tsx`
36|> - `hooks/useCart.ts`
37|> - `lib/products.ts`
38|> - `next.config.js`
39|
40|---
41|
42|## Why This Refactor
43|
44|The current storefront ships almost no meaningful HTML on first request. Verified in production source:
45|
46|- Hero banner renders as an empty skeleton div; text is injected client-side (Lighthouse reports 844ms render delay on hero text).
47|- Category pills are rendered as `<button>` elements that require JS to navigate.
48|- Search is an unwrapped `<input>` + `<button>` with no `<form>`; broken without JS.
49|- 193 KB of JS is downloaded before users see real content.
50|- 35 color-contrast failures, including pricing text that the skill literally specifies as `text-gray-400`.
51|
52|We will restore progressive enhancement: real content in initial HTML, real links for navigation, real forms for search, and small client islands only for cart interactivity.
53|
54|---
55|
56|## Verified Facts About the Current Codebase
57|
58|1. **Provider nesting is already in `layout.tsx`**, but in the wrong order:
59|   ```tsx
60|   // app/layout.tsx (current)
61|   <ToastProvider>
62|     <CartProvider>{children}</CartProvider>
63|   </ToastProvider>
64|   ```
65|   Must be flipped to `CartProvider > ToastProvider > children` because cart actions dispatch toasts.
66|2. **Cart hydration is safe.** `useCart.ts` initializes with empty state, guards `localStorage` with `typeof window`, and only exposes counts after `mounted`. No hydration mismatch.
67|3. **Category routing is `app/category/[slug]/page.tsx`**, not `app/category/page.tsx`. `CategoryContent.tsx` is the current client component.
68|4. **Product images are Supabase Storage.** `next.config.js` already has `*.supabase.co` and `**.supabase.co` in `images.remotePatterns`.
69|5. **Raw `<img>` tags exist** in `Header.tsx` and `product/[id]/page.tsx`.
70|6. **`fetchProducts` and `fetchCategories` are already async** and can be called server-side; they use a global Supabase proxy backed by public env vars.
71|7. **SocialCarousel (`From Our Community`) uses hardcoded static data** and `next/link`, but is still marked `'use client'` unnecessarily.
72|
73|---
74|
75|## Architecture Decisions
76|
77|1. **Provider nesting:** `CartProvider` outer, `ToastProvider` inner.
78|2. **Providers live once in `layout.tsx`.** Remove per-page wrappers from `cart/page.tsx`, `product/[id]/page.tsx`, and category page.
79|3. **Async Server Components + Suspense.** Pages fetch data server-side and provide skeleton fallbacks.
80|4. **Real HTML first, JS enhancement second.** Category pills become `<Link>` anchors. Search becomes a `<form action="/category" method="GET">`. Hero content renders in initial HTML.
81|5. **Layout chrome becomes Server Components** with tiny client islands for cart count, pathname, and search overlay only.
82|6. **Product cards stay client** because they contain add-to-cart, quantity, wishlist, and click handlers.
83|7. **No behavior changes for JS-enabled users.** All existing toasts, fly animations, and routing remain.
84|
85|---
86|
87|## Dependency Graph
88|
89|```
90|RootLayout (server)
91|  ├─ CartProvider (client)
92|  │   └─ ToastProvider (client)
93|  │       └─ page shells (server)
94|  │           ├─ Header (server)
95|  │           │   ├─ HeaderCartButton (client)
96|  │           │   └─ HeaderSearch (client, inside real <form>)
97|  │           ├─ BottomNav (server)
98|  │           │   └─ BottomNavCartPill (client)
99|  │           ├─ HomeShell / CategoryShell (server)
100|  │           │   ├─ HeroBanner (server) — renders text in initial HTML
101|  │           │   ├─ CategoryGrid (server) — pills use <Link>
102|  │           │   ├─ PromoGrid (server)
103|  │           │   ├─ SocialCarousel (server)
104|  │           │   ├─ ProductCarouselClient / ProductSwimlaneClient (client)
105|  │           │   │   └─ ProductCard (client)
106|  │           │   └─ FilterSidebar / SubCategoryPills (client)
107|```
108|
109|---
110|
111|## Deployment Strategy
112|
113|1. Branch: `feature/server-boundary-refactor`.
114|2. Each phase is a separate PR-sized commit.
115|3. After every phase, deploy a Vercel preview and run:
116|   - `npm run typecheck`
117|   - `npm run build`
118|   - Lighthouse (performance + accessibility)
119|   - No-JS smoke test (home, category, product, cart)
120|4. Merge to `main` only after 24h stable preview.
121|5. Rollback: revert the phase commit or redeploy previous Vercel production build.
122|
123|---
124|
125|## Phase 1: Foundation — Providers & Layout Chrome
126|
127|### Task 1.1: Fix provider nesting order and remove per-page wrappers
128|
129|**Description:**
130|Cart logic dispatches toast confirmations, so `CartProvider` must wrap `ToastProvider`. Remove all per-page provider wrappers so every page inherits providers from `layout.tsx`.
131|
132|**Acceptance criteria:**
133|- [x] `app/layout.tsx` nesting: `CartProvider > ToastProvider > children`.
134|- [x] `app/page.tsx` no longer renders `ToastProvider`/`CartProvider`.
135|- [x] `app/cart/page.tsx` no longer renders `ToastProvider`/`CartProvider`.
136|- [x] `app/product/[id]/page.tsx` no longer renders `ToastProvider`/`CartProvider`.
137|- [x] `app/category/CategoryContent.tsx` no longer wraps itself with providers.
138|
139|**Verification:**
140|- [ ] `npm run typecheck` passes.
141|- [ ] `npm run build` succeeds.
142|- [ ] Dev: add to cart from home, category, product, and cart pages — toast appears and cart badge updates.
143|
144|**Dependencies:** None  
145|**Scope:** Small  
146|**Files touched:**
147|- `app/layout.tsx`
148|- `app/page.tsx`
149|- `app/cart/page.tsx`
150|- `app/product/[id]/page.tsx`
151|- `app/category/CategoryContent.tsx`
152|
153|---
154|
155|### Task 1.2: Split `Header` into server shell + client islands with real form/search
156|
157|**Description:**
158|Keep static logo, brand name, and location markup server-rendered. Extract client islands for cart button and search. Most importantly, wrap search in a real `<form action="/category" method="GET">` so search works without JS; client JS adds autocomplete and mobile overlay only.
159|
160|**Acceptance criteria:**
161|- [x] `app/components/Header.tsx` removes `'use client'` and becomes a Server Component.
162|- [x] New `app/components/HeaderCartButton.tsx` (client) reads `totalItems`, handles cart click, and is at least 44×44px.
163|- [x] New `app/components/HeaderSearch.tsx` (client) renders `<form action="/category" method="GET">` with `<input name="q">`.
164|- [x] Client JS still handles Enter key, mobile overlay, and instant redirect; fallback form submission works with JS disabled.
165|- [x] Logo uses `next/image` with explicit `width`/`height`.
166|- [x] Cart bounce animation still works.
167|
168|**Verification:**
169|- [ ] `npm run typecheck` passes.
170|- [ ] Adding a product animates the cart badge.
171|- [ ] Search redirects to `/category?q=...` with JS enabled.
172|- [ ] Search redirects to `/category?q=...` with JS disabled (form submission).
173|
174|**Dependencies:** Task 1.1  
175|**Scope:** Medium  
176|**Files touched:**
177|- `app/components/Header.tsx`
178|- `app/components/HeaderCartButton.tsx` (new)
179|- `app/components/HeaderSearch.tsx` (new)
180|
181|---
182|
183|### Task 1.3: Split `BottomNav` into server shell + client islands
184|
185|**Description:**
186|Convert the main nav bar to a Server Component. Use `next/link` for all navigation items. Active state and the floating cart pill move to small client islands.
187|
188|**Acceptance criteria:**
189|- [x] `app/components/BottomNav.tsx` removes `'use client'`.
190|- [x] All nav items use `<Link href="/...">`.
191|- [x] New `app/components/ActiveLink.tsx` (client, optional) handles active-state styling with `usePathname`.
192|- [x] New `app/components/BottomNavCartPill.tsx` (client) reads `totalItems`/`total` and opens the cart sheet.
193|- [x] Tap targets are at least 44px tall.
194|- [x] Nav still hides on `/checkout` and `/order`.
195|
196|**Verification:**
197|- [ ] `npm run typecheck` passes.
198|- [ ] Bottom nav active state updates on navigation.
199|- [ ] Floating cart pill appears once an item is added.
200|- [ ] Bottom nav links work with JS disabled.
201|
202|**Dependencies:** Task 1.1  
203|**Scope:** Medium  
204|**Files touched:**
205|- `app/components/BottomNav.tsx`
206|- `app/components/ActiveLink.tsx` (new, optional)
207|- `app/components/BottomNavCartPill.tsx` (new)
208|
209|---
210|
211|## Phase 2: Home Page Server Shell
212|
213|### Task 2.1: Convert `app/page.tsx` to an async Server Component with Suspense
214|
215|**Description:**
216|Move data fetching for products and categories from `useEffect` to the server. Pass data into a server `HomeShell`. Wrap in `<Suspense>` with `HomeShellSkeleton`. Keep only the interactive carousel as a client island.
217|
218|**Acceptance criteria:**
219|- [x] `app/page.tsx` is an `async` function with no `'use client'`.
220|- [x] Fetches `fetchProducts()` and `fetchCategories()`.
221|- [x] Wraps content in `<Suspense fallback={<HomeShellSkeleton />}>`.
222|- [x] New `app/components/HomeShell.tsx` (server) receives `products` and `categories` and renders static sections.
223|- [x] New `app/components/HomeShellSkeleton.tsx` (server) matches layout shape.
224|- [x] New `app/components/HomeCarouselClient.tsx` (client) handles cart/toast/router interactions for "Popular Now".
225|
226|**Verification:**
227|- [ ] Home page renders real content in initial HTML (view source shows hero text, category pills, promo grid).
228|- [ ] `npm run build` succeeds and `page.tsx` is not a client chunk.
229|- [ ] Popular Now carousel still adds items to cart and navigates to product pages.
230|
231|**Dependencies:** Task 1.1, 1.2, 1.3  
232|**Scope:** Medium  
233|**Files touched:**
234|- `app/page.tsx`
235|- `app/components/HomeShell.tsx` (new)
236|- `app/components/HomeShellSkeleton.tsx` (new)
237|- `app/components/HomeCarouselClient.tsx` (new)
238|
239|---
240|
241|### Task 2.2: Convert `HeroBanner`, `PromoGrid`, `CategoryGrid`, and `SocialCarousel` to Server Components
242|
243|**Description:**
244|These are mostly static. Remove `'use client'`. `CategoryGrid` keeps only its "Departments" dropdown as a client island; all category and theme pills become `<Link>` anchors. `HeroBanner` must render actual text in the initial HTML — if content is dynamic, fetch it in `page.tsx` and pass as props; if static, hardcode it. `SocialCarousel` becomes server because it uses only static data and `next/link`.
245|
246|**Acceptance criteria:**
247|- [x] `HeroBanner.tsx` becomes a Server Component and renders its text in the initial HTML (verified via View Source).
248|- [x] `PromoGrid.tsx` becomes a Server Component (uses `<Link>`, no state).
249|- [x] `CategoryGrid.tsx` becomes a Server Component. All category/theme pills (except Departments dropdown trigger) use `<Link href="/category/...">` or `<Link href="/category?theme=...">`.
250|- [x] New `app/components/CategoryDropdown.tsx` (client) handles the Departments dropdown open/close state.
251|- [x] `SocialCarousel.tsx` removes `'use client'` and becomes a Server Component.
252|- [x] No visual or behavioral regression for JS-enabled users.
253|
254|**Verification:**
255|- [ ] `npm run typecheck` passes.
256|- [ ] View page source shows hero text, promo text, and `<a>` tags for category pills.
257|- [ ] Category pills navigate with JS disabled.
258|- [ ] Departments dropdown still works with JS enabled.
259|
260|**Dependencies:** Task 2.1  
261|**Scope:** Medium  
262|**Files touched:**
263|- `app/components/HeroBanner.tsx`
264|- `app/components/PromoGrid.tsx`
265|- `app/components/CategoryGrid.tsx`
266|- `app/components/CategoryDropdown.tsx` (new)
267|- `app/components/SocialCarousel.tsx`
268|
269|---
270|
271|## Phase 3: Category Page Server Shell
272|
273|### Task 3.1: Convert `category/[slug]/page.tsx` to an async Server Component with Suspense
274|
275|**Description:**
276|The current `[slug]/page.tsx` is already async but delegates to a client `CategoryContent`. Create a server `CategoryShell` that fetches categories and products server-side based on `params.slug`, and wraps content in `<Suspense>` with a matching skeleton.
277|
278|**Acceptance criteria:**
279|- [x] `app/category/[slug]/page.tsx` fetches initial categories and products server-side.
280|- [x] New `app/category/CategoryShell.tsx` (server) renders static sections and client islands.
281|- [x] New `app/category/CategoryShellSkeleton.tsx` (server) matches category page shape.
282|- [x] `app/category/CategoryContent.tsx` is deleted or reduced to a thin client filter/sort handler.
283|- [x] Static sections (HeroBanner, PromoGrid, SponsoredBanner, NativeAdBanner, CategoryFooter) render server-side.
284|
285|**Verification:**
286|- [x] Category page renders real content in initial HTML.
287|- [ ] Valid slugs like `/category/dairy`, `/category/produce`, and group slugs all work.
288|- [ ] `npm run build` succeeds.
289|
290|**Dependencies:** Task 1.1, 1.2, 1.3, 2.1  
291|**Scope:** Large  
292|**Files touched:**
293|- `app/category/[slug]/page.tsx`
294|- `app/category/CategoryShell.tsx` (new)
295|- `app/category/CategoryShellSkeleton.tsx` (new)
296|- `app/category/CategoryContent.tsx` (delete or refactor)
297|- `app/components/FilterSidebar.tsx`
298|- `app/components/SubCategoryPills.tsx`
299|
300|---
301|
302|### Task 3.2: Make `ProductSwimlane` a Server Component, add `ProductSwimlaneClient` island
303|
304|**Description:**
305|`ProductSwimlane` currently contains cart/router logic. Split it: `ProductSwimlane` becomes a Server Component that renders `ProductCard` children. `ProductSwimlaneClient` (client) supplies cart/toast/router callbacks. `ProductCard` remains client.
306|
307|**Acceptance criteria:**
308|- [ ] `app/components/ProductSwimlane.tsx` removes `'use client'` and becomes a Server Component.
309|- [ ] New `app/components/ProductSwimlaneClient.tsx` (client) supplies `onAdd`, `onUpdateQty`, and `onClick` callbacks to `ProductSwimlane`.
310|- [ ] `ProductCard` remains client.
311|
312|**Verification:**
313|- [ ] Product swimlanes on category page still add to cart.
314|- [ ] Group category pages still render sub-category swimlanes.
315|- [ ] View source shows swimlane titles and product names.
316|
317|**Dependencies:** Task 3.1  
318|**Scope:** Medium  
319|**Files touched:**
320|- `app/components/ProductSwimlane.tsx`
321|- `app/components/ProductSwimlaneClient.tsx` (new)
322|- `app/components/ProductCard.tsx`
323|
324|---
325|
326|## Phase 4: Cleanup & Shared Client Islands
327|
328|### Task 4.1: Consolidate duplicate cart/toast wrapper logic
329|
330|**Description:**
331|Search for any remaining per-page provider wrappers and duplicated `useRouter` + `useCartContext` + `useToast` patterns. Consolidate into a reusable `useCartActions` hook if it reduces duplication. Keep fly-animation state local to page islands because start coordinates are DOM-specific.
332|
333|**Acceptance criteria:**
334|- [x] No file except `layout.tsx` renders `CartProvider` or `ToastProvider`.
335|- [x] Optional `app/hooks/useCartActions.ts` supplies `onAdd`, `onUpdateQty`, `onClick` callbacks.
336|- [x] All existing behaviors preserved.
337|
338|**Verification:**
339|- [ ] `npm run typecheck` passes.
340|- [ ] Adding to cart from home carousel, category swimlane, and product page all work.
341|
342|**Dependencies:** Task 2.1, 2.2, 3.1, 3.2  
343|**Scope:** Medium  
344|**Files touched:**
345|- `app/components/HomeCarouselClient.tsx`
346|- `app/components/ProductSwimlaneClient.tsx`
347|- `app/hooks/useCartActions.ts` (new, optional)
348|
349|---
350|
351|### Task 4.2: Audit and remove unused `'use client'` directives
352|
353|**Description:**
354|Audit all `app/components/**/*.tsx`. Remove unnecessary `'use client'` directives. Document why each remaining client component is client.
355|
356|**Acceptance criteria:**
357|- [x] Every remaining `'use client'` file has a one-line comment explaining why it is client.
358|- [x] No component is client-side only because of a prop it no longer receives.
359|
360|**Verification:**
361|- [ ] `npm run typecheck` passes.
362|- [ ] `npm run build` succeeds.
363|- [ ] Build output shows `page.tsx` and `category/[slug]/page.tsx` as server chunks, not client.
364|- [ ] Compare `page-*.js` chunk size before/after; target meaningful reduction.
365|
366|**Dependencies:** All previous tasks  
367|**Scope:** Small  
368|**Files touched:**
369|- `app/components/**/*.tsx`
370|
371|---
372|
373|## Phase 5: Skill-Compliant Polish & Live-Site Fixes
374|
375|### Task 5.1: Enforce 44×44px touch targets
376|
377|**Description:**
378|Update Add / + / − buttons, search icon, nav links, cart page quantity buttons, and product page quantity buttons to at least 44×44px.
379|
380|**Acceptance criteria:**
381|- [x] Add button: `min-h-[44px] min-w-[44px]`.
382|- [x] Quantity − and + buttons: `min-h-[44px] min-w-[44px]`.
383|- [x] Header search button: `min-h-[44px] min-w-[44px]`.
384|- [x] Bottom nav links: at least 44px tall.
385|- [x] Cart page quantity buttons: at least 44×44px.
386|- [x] Product page quantity buttons: at least 44×44px.
387|
388|**Verification:**
389|- [ ] DevTools inspection shows 44×44 bounding boxes on all tap targets.
390|- [ ] No visual regression on mobile viewport.
391|
392|**Dependencies:** Task 1.2, 1.3  
393|**Scope:** Small  
394|**Files touched:**
395|- `app/components/ProductCard.tsx`
396|- `app/components/Header.tsx` / `HeaderSearch.tsx`
397|- `app/components/BottomNav.tsx`
398|- `app/cart/page.tsx`
399|- `app/product/[id]/page.tsx`
400|
401|---
402|
403|### Task 5.2: Create `<PriceDisplay />` and fix WCAG color contrast
404|
405|**Description:**
406|Extract inline price markup into a reusable component. Fix contrast failures. Do not use `text-gray-400` on white; use `text-gray-500` (3.9:1) at minimum, preferably `text-gray-600` (5.1:1). Fix badge and bottom-nav inactive colors to meet WCAG AA.
407|
408|**Acceptance criteria:**
409|- [x] New `app/components/PriceDisplay.tsx` exists.
410|- [ ] `ProductCard`, `product/[id]/page.tsx`, and cart page use `<PriceDisplay currentPrice={price} originalPrice={originalPrice} unit={unit} />`.
411|- [ ] Final price styled as `text-xl font-extrabold text-gray-900`.
412|- [ ] Old price styled as `text-sm line-through text-gray-500` or darker.
413|- [ ] Sale badge text meets 4.5:1 contrast (e.g., black text on `bg-red-500`, or darker red background).
414|- [ ] Bottom nav inactive label meets 4.5:1 contrast.
415|- [ ] Unit price text meets 4.5:1 contrast.
416|
417|**Verification:**
418|- [ ] Sale and non-sale cards look correct.
419|- [ ] `npm run typecheck` passes.
420|- [ ] Lighthouse accessibility contrast audit shows zero failures on storefront pages.
421|
422|**Dependencies:** None (can be done anytime)  
423|**Scope:** Small  
424|**Files touched:**
425|- `app/components/PriceDisplay.tsx` (new)
426|- `app/components/ProductCard.tsx`
427|- `app/product/[id]/page.tsx`
428|- `app/cart/page.tsx`
429|- `app/components/BottomNav.tsx`
430|
431|---
432|
433|### Task 5.3: Fix image optimization violations and priority logic
434|
435|**Description:**
436|Replace raw `<img>` in `Header.tsx` and `product/[id]/page.tsx` with `next/image`. Fix `priority` misuse: only the first above-the-fold product image may get `priority`; on the home page, the hero banner is the LCP, so product carousels/grids there get no `priority`. On category pages, the first product image may be `priority` if no hero banner is LCP.
437|
438|**Acceptance criteria:**
439|- [x] No raw `<img>` tags remain in `app/components/**/*.tsx`, `app/page.tsx`, `app/cart/page.tsx`, or `app/product/[id]/page.tsx`.
440|- [ ] Home page: `ProductCarousel` and `ProductGrid` do not use `priority`.
441|- [ ] Category page: first product image uses `priority={index === 0}` only on the first swimlane/grid above the fold.
442|- [x] Product detail page: main product image uses `priority`.
443|- [x] `next.config.js` remotePatterns are sufficient for production image domains.
444|
445|**Verification:**
446|- [ ] Logo, product grid images, product detail image, and related-products grid all load.
447|- [ ] Lighthouse LCP element is expected (hero text on home, first product image on category).
448|- [ ] LCP score does not regress.
449|
450|**Dependencies:** Task 1.2  
451|**Scope:** Small  
452|**Files touched:**
453|- `app/components/Header.tsx`
454|- `app/components/ProductGrid.tsx`
455|- `app/components/ProductCarousel.tsx`
456|- `app/product/[id]/page.tsx`
457|- `next.config.js`
458|
459|---
460|
461|### Task 5.4: Audit and remove unnecessary legacy JS polyfills
462|
463|**Description:**
464|Lighthouse treemap shows a chunk with polyfills for `Array.prototype.at`, `flat`, `flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimEnd`, `trimStart`. All are Baseline widely available. Find the source (Babel config, `next.config.js`, imported polyfill, or a dependency) and remove them.
465|
466|**Acceptance criteria:**
467|- [ ] Identify source of polyfills.
468|- [x] Remove or disable unnecessary polyfills.
469|- [ ] Target reduction of ~11.7 KB from bundle.
470|
471|**Verification:**
472|- [ ] `npm run build` succeeds.
473|- [ ] Build output shows the polyfill chunk removed or significantly smaller.
474|- [ ] Lighthouse treemap no longer shows those polyfills.
475|
476|**Dependencies:** None  
477|**Scope:** Small  
478|**Files touched:**
479|- `next.config.js`
480|- `package.json`
481|- Any Babel/transpiler config
482|
483|---
484|
485|## Checkpoints
486|
487|### Checkpoint A: After Phase 1
488|- [x] `layout.tsx` nesting is `CartProvider > ToastProvider > children`.
489|- [x] No per-page provider wrappers remain.
490|- [ ] `npm run typecheck` passes.
491|- [ ] `npm run build` succeeds.
492|- [ ] Cart, toast, search, and nav still work with JS enabled.
493|- [ ] Search form submission works with JS disabled.
494|- [ ] Bottom nav links work with JS disabled.
495|
496|### Checkpoint B: After Phase 2
497|- [x] Home page renders real content in initial HTML (hero text, category pills, promo grid, social carousel).
498|- [x] `<Suspense>` + skeleton prevents blank fetch screen while JS loads.
499|- [ ] Build output confirms `page.tsx` is not a client chunk.
500|- [ ] Compare `page-*.js` chunk size before/after; target reduction.
501|