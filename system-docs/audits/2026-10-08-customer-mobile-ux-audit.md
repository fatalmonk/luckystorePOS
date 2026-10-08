# Customer mobile audit — 8 October 2026

Scope: the current working tree of `/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile`, using user-research, Impeccable native audit, iOS design, and Expo design-system guidance. This is a source-based audit and a proposed research plan, not completed participant research or a visual/device certification. No application files were changed by this audit.

## Verdict

The app needs work before customer release. The strongest problems concern truthful feedback, preserving shopping intent, and recoverable errors. Existing Expo navigation stacks, virtualized product lists, and checkout validation provide a useful foundation; replacing the framework or creating another theme would not address these problems.

Native conformance is incomplete in source: the floating navigation mixes tabs with a pushed Saved screen, uses emoji icons, and animates without a reduced-motion branch. Whether the overall interface looks or feels native remains unverified without device inspection.

**17 findings: 0 P0, 9 P1, 8 P2**, including three added after the supplied screenshot review. P1 means significant customer difficulty or a release-quality gap; P2 means a narrower issue or a risk needing device confirmation. Source-derived risks are explicitly marked below. No numeric design score is assigned because native appearance and interaction were not tested.

## Coverage and evidence limits

- Mechanically scanned 70 non-test TypeScript/TSX files, 12,024 lines, covering 22 screen files and seven shared component files. Counts include private placeholder code and are not a count of shipping routes.
- Inspected navigation, theme, primitives, cart/wishlist state, authentication, Home, Shop, Search, Category, Product, Cart, Checkout, Account, Settings, Orders, order details, account deletion, and Help at targeted source locations. Static policy copy was not independently verified against business operations.
- Existing dirty work in root/tab layouts, Home, Shop, navigation components, and tab-scroll state was included. Files changed independently during the audit: earlier compiler errors must not be mistaken for the final state.
- No simulator or device session, native screenshot comparison, VoiceOver/TalkBack traversal, keyboard test, large-text test, contrast rendering test, performance profile, release build, production API call, or real order submission was performed. Subsequently supplied localhost screenshots are reviewed in the addendum below.
- `xcrun simctl list devices booted` failed: `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`.
- Supported device sizes and minimum iOS deployment version are not documented in the app README or explicitly set in app.json. Portrait is configured; iPad support and behavior require separate confirmation. A portrait lock alone is not a defect.

## P1 findings

### F01 — Deletion reports a submission that never occurred

**Evidence:** [delete-screen.tsx:21](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/account/delete-screen.tsx:21), [success message:82](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/account/delete-screen.tsx:82).

Opening `mailto:` sets `requested=true`. The resulting screen says “Deletion Request Submitted” and “Your request has been recorded,” although opening a composer proves neither sending nor receipt. Cancelling the email can still leave this success state.

**Impact:** customers may believe a consequential request is underway when nobody received it. **Recommendation:** until an acknowledged request endpoint exists, describe only opening a draft and explain that the customer must send it. Confirm submission only from a real receipt. **Command:** `$impeccable clarify` / `$impeccable harden`.

### F02 — Cart and Saved items disappear after restart

**Evidence:** [CartProvider:51](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/state/cart-context.tsx:51), [WishlistProvider:22](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/state/wishlist-context.tsx:22).

Both collections live only in provider `useState`; neither provider persists or hydrates them.

**Impact:** customers lose a partly assembled grocery basket and repeat-purchase favorites after process termination. Tab changes alone do not necessarily lose them because providers live above tabs. **Recommendation:** persist and hydrate shopping state with explicit loading behavior, then revalidate price/stock before purchase; decide account-switch isolation deliberately. **Command:** `$impeccable harden`.

### F03 — Language Preference does not control app language

**Evidence:** [Settings:47](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/settings/settings-screen.tsx:47), [Checkout:121](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/checkout/checkout-screen.tsx:121), [delivery slot labels:363](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/checkout/checkout-screen.tsx:363).

Sixteen screen files declare independent `useState<Locale>('en')` values. Settings changes its own language only. Checkout defines translated slot labels but renders “Morning,” “Evening,” and their times directly in English; other direct English labels remain in translated flows.

**Impact:** Bengali shoppers must repeatedly switch language and encounter mixed-language purchasing controls. **Recommendation:** one persisted locale provider, localized navigation/accessibility labels, and translated state/error copy. Keep product names tied to the selected API locale. **Command:** `$impeccable harden` / `$impeccable clarify`.

### F04 — Notification preferences are nonfunctional controls

**Evidence:** [Settings:49](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/settings/settings-screen.tsx:49), [notification switches:98](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/settings/settings-screen.tsx:98).

Both switches only update local React state. This screen has no persistence, permission flow, notification registration, or preference update operation.

**Impact:** users receive a false impression that order alerts or promotional consent have been configured. **Recommendation:** remove or clearly mark the controls unavailable until wired to actual preferences and permission status. Do not equate permission with marketing consent. **Command:** `$impeccable clarify` / `$impeccable harden`.

### F05 — Order-history errors masquerade as no orders

**Evidence:** [Orders request handling:59](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/orders/orders-screen.tsx:59), [initial request:83](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/orders/orders-screen.tsx:83), [empty state:169](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/orders/orders-screen.tsx:169).

Initial errors are swallowed; HTTP failure payloads have no displayed error branch. Refresh errors are also ignored. Once loading finishes with an empty array, the screen renders its shopping empty state.

**Impact:** a customer who has just ordered may think the order was lost. **Recommendation:** distinguish initial loading, verified empty, initial failure, and refresh failure. Preserve previous orders during a refresh failure; provide retry and session-expiry recovery. **Command:** `$impeccable harden`.

### F06 — Quantity controls are too small and lack item context

**Evidence:** [cart stepper controls:112](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/cart/cart-screen.tsx:112), [stepper dimensions:418](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/cart/cart-screen.tsx:418), [small Button size:47](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/ui/button.tsx:47).

Cart quantity buttons are 28×28 with no added hit region. Their accessibility labels repeat “Increase quantity” and “Decrease quantity” without the product name. The shared small Button has only a 36-point minimum height; whether every usage fails depends on actual content height.

**Impact:** accidental quantity changes and ambiguous repeated controls, especially for customers with motor or visual impairments. **Recommendation:** at least 44×44-point effective targets on iOS, adequate separation, product-specific labels, and exposed disabled state at stock limits. Validate 48dp Android targets separately. **Command:** `$impeccable adapt` / `$impeccable harden`.

### F07 — Guest tracking can race credential storage

**Evidence:** [checkout success:182](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/checkout/checkout-screen.tsx:182), [order detail credential lookup:123](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/order/order-detail-screen.tsx:123).

Checkout starts `saveGuestOrderToken(...).catch(() => {})`, then immediately replaces the route without awaiting the save or passing the token. Order details immediately reads stored credentials. **Source-derived race risk; not reproduced on a device.** A write failure is silently discarded after the basket is cleared.

**Impact:** a successful guest purchase can land on inaccessible order details or lose future tracking access. **Recommendation:** establish tracking access before navigation, retain a secure recoverable in-memory handoff when persistence fails, and show an honest confirmation/recovery state. Avoid putting credentials into shareable URLs. **Command:** `$impeccable harden`.

### F08 — Current lint gate remains red

**Evidence:** final scoped ESLint run: **17 errors, five warnings**. Errors include `react-hooks/refs` in AppDrawer, Home, and tab-scroll context; `react-hooks/set-state-in-effect` in Category, Search, and Shop; and `import/first` in Account.

**Impact:** the current working tree does not pass its configured quality gate. These diagnostics are not evidence that every reported animation or state update is broken at runtime. **Recommendation:** reconcile implementation with installed React/Expo compiler guidance and fix the gate without disabling rules simply to obtain green output. **Command:** `$impeccable harden` / `$impeccable optimize`.

## P2 findings

### F09 — Floating navigation has inconsistent destinations and incomplete inset ownership

**Evidence:** [Saved navigation:103](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/navigation/floating-glass-tab-bar.tsx:103), [absolute placement:143](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/navigation/floating-glass-tab-bar.tsx:143), [Cart padding:274](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/cart/cart-screen.tsx:274), [Account padding:338](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/account/account-screen.tsx:338).

Home/Shop/Cart/Account switch tabs, but Saved pushes a root-stack screen and lacks selected-tab state. The bar is absolute, 64 points tall, and inset from the bottom; Home and Shop reserve 110 bottom points while Cart and Account reserve 40. **Potential content overlap and large-text crowding need device confirmation.** Cart/Account also hide stack headers and do not explicitly apply top safe-area padding; automatic scroll insets may mitigate some cases.

**Impact:** Back and destination behavior vary within one apparent navigation bar; lower controls may be obscured. **Recommendation:** use consistent peer destinations, one shared bar-height/inset contract, and explicit safe-area ownership. Replace emoji navigation icons with platform symbols while preserving the store identity. **Command:** `$impeccable adapt`.

### F10 — Automatic appearance is configured without a dark theme

**Evidence:** [app.json:10](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/app.json:10), [theme.ts:1](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/theme.ts:1), [root theme:12](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/app/_layout.tsx:12).

Tokens are fixed light colors, the navigation theme always extends DefaultTheme, and StatusBar is always dark. There is no appearance-dependent palette. Expo's [color-theme documentation](https://docs.expo.dev/develop/user-interface/color-themes/) distinguishes following system appearance from adapting rendered content.

**Impact:** dark-mode customers still get a light interface, with possible mismatches between native chrome and custom content. No actual contrast failure was measured. **Recommendation:** extend the existing theme with semantic light/dark roles and matching navigation/status-bar appearance; verify both modes. **Command:** `$impeccable harden` / `$impeccable adapt`.

### F11 — Shared tokens exist but most screens bypass them

**Evidence:** [theme.ts](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/theme.ts), [ThemedText](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/ui/themed-text.tsx), [Search styles:504](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/search/search-screen.tsx:504).

ThemedText is used only by Button; screens recreate text styles, spacing, radii, and product cards. Raw font sizes alone do **not** disable React Native's default font scaling. Fixed-height navigation, two-column cards, and truncated labels create large-text risks that still need testing.

**Impact:** inconsistent hierarchy and expensive cross-screen accessibility fixes. **Recommendation:** keep `src/theme.ts` authoritative; adopt named typography and spacing incrementally. Extract a product-card primitive after comparing Shop, Search, and Category contracts. Do not introduce a parallel styling library. **Command:** `$impeccable extract` / `$impeccable typeset`.

### F12 — Custom navigation motion ignores reduced-motion preference

**Evidence:** [drawer animation:32](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/navigation/app-drawer.tsx:32), [tab bar motion:34](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/state/tab-bar-scroll-context.tsx:34).

The drawer slides with a spring and the tab bar translates by 120 points. No Reduce Motion branch was found in non-test app source. Closing the drawer returns null immediately, so the configured exit animation cannot remain visible.

**Impact:** unnecessary movement for sensitive users and abrupt dismissal. **Recommendation:** use the platform preference to offer immediate/crossfade transitions, keep navigation accessible while the bar is hidden, and mount exit content until dismissal completes. **Command:** `$impeccable animate`.

### F13 — Search stops at 60 results without a continuation path

**Evidence:** [Search request:144](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/search/search-screen.tsx:144), [Search list:480](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/search/search-screen.tsx:480).

Search requests a limit of 60, displays the API total, and has no load-more/onEndReached handling. Shop and Category already support pagination.

**Impact:** when a query matches more than 60 products, users cannot reach all advertised results. **Recommendation:** reuse the existing paginated-list approach, with explicit retry after a pagination failure. **Command:** `$impeccable harden`.

### F14 — Help actions silently fail

**Evidence:** [Help:53](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/screens/info/help-screen.tsx:53).

WhatsApp and phone links swallow openURL errors without feedback. **Impact:** a customer seeking help can tap and see no result. **Recommendation:** show a recoverable error and a selectable/copyable contact alternative when an external app cannot open. **Command:** `$impeccable harden` / `$impeccable clarify`.

## Design-system inventory

One system exists: plain React Native StyleSheet and `src/theme.ts`; no NativeWind/Tamagui/Restyle replacement is warranted. The denominator below is 11,965 non-test source lines outside theme.ts, including services/state. These are regex candidates, not individually adjudicated violations; computed literals and theme-equivalent values require review.

| Category | Candidates | Per 100 source lines | Interpretation |
|---|---:|---:|---|
| Hex colors outside theme | 91 | 0.8 | Drift; includes intentional constant colors |
| Literal fontSize | 382 | 3.2 | Systemic bypass of type ramp |
| Numeric spacing outside 0/4/8/16/24/32/48 | 407 | 3.4 | Systemic; 12 occurs 128 times, 10 occurs 77 times |
| Numeric radius | 163 | 1.4 | Drift; includes values already represented by tokens |
| Legacy shadow/elevation properties | 15 | 0.1 | Concentrated in two navigation files; theme also defines legacy shadows |

Button already provides variants, sizes, pressed feedback, disabled/loading state, accessible name/busy state, and last-merged overrides. Its small target and literal danger background need attention. ThemedText preserves TextProps and default scaling. Card uses shared tokens and last-merged overrides. Badge exposes variants but still defines literal colors and typography. Verify installed-platform compatibility before changing shadow APIs; shadow syntax alone does not prove jank or visual failure.

## Positive findings to retain

- Native stack routing for drill-down screens and four core shopping tabs.
- FlatList virtualization across catalog, search, cart, wishlist, and orders; bounded Home sections and expo-image usage. No measured performance claim is implied.
- Shop/Category pagination, AbortController use, and request-version guards for catalog changes.
- Guest checkout with input validation, pending-submit disabling, a stable per-screen idempotency key, and a price-change review path. These are client-side safeguards; this audit does not certify server financial controls.
- Product detail exposes adjustable quantity actions and stock limits to assistive technology.
- English/Bengali copy, several error announcements, and keyboard avoidance in authentication/checkout provide a base to improve.

## Verification record

| Check | Result |
|---|---|
| `rtk npm test` in customer_mobile | Pass: 23 tests, six suites; service schemas, input validation, and cart totals. No interaction/device coverage. |
| Initial `rtk npm run typecheck` | Exit 2: undefined `isAuthenticated`, missing bottom-tabs type module, and unsupported `StyleSheet.absoluteFillObject`. |
| Final `rtk npm run typecheck` | Pass after independent edits during audit. The auditor did not apply those fixes. |
| Initial `rtk npm run lint` | Exit 1: 18 errors, six warnings. |
| Final `npm exec -- eslint src --format json` via RTK/Python | Exit 1: 17 errors, five warnings; compact result captured after concurrent changes. |
| Direct local ESLint executable probe | Failed: `/bin/sh: node_modules/.bin/eslint: No such file or directory`; downstream parser: `json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`. Retried successfully through npm exec; lint itself remains failing. |
| Simulator availability | Failed with missing simctl diagnostic quoted above. |
| Git review | Existing tracked diff reviewed in compact form; untracked navigation/state inspected directly. Only this report was added by the auditor. |

## Research plan — proposed, not conducted

**Objective:** verify that shoppers can find the correct grocery item, understand quantity/price/delivery totals, complete a purchase, and recover tracking access without help. The observations above are implementation evidence; claims about shopper preferences or conversion rates remain hypotheses.

Recruit 5–8 current or prospective local grocery shoppers across Bengali-first and English-first users, new and repeat customers, and a range of phone sizes/digital confidence. Include customers who use large text or VoiceOver if feasible; do not treat one participant as representing all accessibility needs.

Run 30–45-minute moderated sessions using staging or a disposable dataset. Use fake customer details and simulated payment outcomes; no real money or production order is required. Plan recruitment/setup in week one and sessions/synthesis in week two.

1. Ask how they currently buy groceries and resolve unavailable items. Avoid leading questions about the app.
2. Ask them to find a specified product and compare pack size, price, and availability. Observe wrong-item selection and search recovery.
3. Add several items, correct a quantity, save one for later, restart the app, and recover the basket. Record lost work and expectations before revealing behavior.
4. Select Bengali in Settings, move through Product → Cart → Checkout, and explain delivery/payment details in their own words.
5. Complete a staged guest checkout; inject a price change and a request failure. Observe whether valid form data survives and whether the user knows when an order exists.
6. Locate an order, then inject an order-list failure. Observe whether the customer distinguishes unavailable history from no orders.
7. Ask for help and inspect account deletion without sending anything. Ask, “What do you believe happened?” after the email composer opens and is cancelled.

Record task success without assistance, critical errors, time to recovery, misinterpreted feedback, and optional post-task ease ratings. Use participant quotes only after collecting them with consent. Synthesize by journey stage and impact/effort; prioritize repeated observed failures without treating a small qualitative sample as statistical proof.

## Device verification matrix

Once Xcode/device execution is available, inspect in one batched pass: shortest supported iPhone and a larger iPhone; default and largest accessibility text; light/dark; Reduce Motion; checkout keyboard on the final field; VoiceOver traversal of cart and payment; slow/offline request states; process restart; guest tracking storage failure. Include iPad only if it ships. Recheck affected states once after fixes. Android requires its own target/Back/TalkBack pass.

## Recommended sequence

1. `$impeccable harden` and `$impeccable clarify`: F01–F05/F07/F08; restore truthful states, persistent intent, reliable tracking, and a passing lint gate.
2. `$impeccable adapt`: F06/F09/F10; shared target sizes, safe-area contracts, consistent navigation, and appearance support.
3. `$impeccable extract` / `$impeccable typeset`: F11; adopt the current theme and shared product cards incrementally.
4. `$impeccable animate` / `$impeccable harden`: F12–F14; motion preferences, full search access, and Help recovery.
5. `$impeccable polish`: final device pass after functional and accessibility issues are fixed.

Fixes may be requested individually or together. Repeat the audit after changes; the remaining device checks are required before claiming visual/interaction readiness.

Tooling note: the Impeccable launcher reported missing PRODUCT.md/DESIGN.md; existing implementation remained the audit authority. No context documents were created or repaired. It also reported: “A newer Impeccable (v4.5.0) is available. Update now? It runs `npx impeccable update`.” No update was performed.

## Screenshot addendum

The user supplied three localhost captures labelled iPhone 15 Pro. They establish rendered layout at the captured viewport, not execution on physical iPhone hardware or the iOS Simulator. Capture dates, commit identity, and screenshot order are unverified. The image with the top tab strip visibly differs from the floating-navigation image; treat them as separate captured states rather than simultaneous UI.

References: [Home with floating navigation](</Users/mac.alvi/Desktop/Projects/LuckyStore/lucky-store-brand-guidelines/social-media-post/gemini-reference-assets/localhost_8081_(iPhone 15 Pro) (1).png>), [open drawer](</Users/mac.alvi/Desktop/Projects/LuckyStore/lucky-store-brand-guidelines/social-media-post/gemini-reference-assets/localhost_8081_(iPhone 15 Pro) (2).png>), [Home with catalogue failure](</Users/mac.alvi/Desktop/Projects/LuckyStore/lucky-store-brand-guidelines/social-media-post/gemini-reference-assets/localhost_8081_(iPhone 15 Pro).png>).

### F15 [P1] — Menu badges invent unread activity

The Home and drawer captures display red “9+” badges on Menu/account imagery, including while the drawer invites the visitor to sign in. Current source confirms literal `9+` text in [floating-glass-tab-bar.tsx:140](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/navigation/floating-glass-tab-bar.tsx:140) and [app-drawer.tsx:109](/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/customer_mobile/src/components/navigation/app-drawer.tsx:109).

**Impact:** customers are directed toward an invented notification count and cannot resolve the implied pending activity. **Recommendation:** remove the badges until a real, actionable unread count exists; label genuine counts for assistive technology. **Command:** `$impeccable clarify` / `$impeccable harden`.

### F16 [P2] — Catalogue failure copy exposes implementation details

The failure capture says “We will not show placeholder stock as orderable” and displays “Failed to fetch.” This explains an internal safeguard instead of what the shopper can do. The visible Try again control is a positive recovery affordance. A screenshot does not establish the failure's cause, frequency, or whether the request still fails now.

**Impact:** technical wording adds uncertainty during an already interrupted shopping task. **Recommendation:** use plain feedback such as “We couldn't load products. Please try again,” keep technical diagnostics out of customer copy, and retain retry. Keep the existing rule against fabricated orderable stock. **Command:** `$impeccable clarify`.

### F17 [P2] — Promotional hierarchy delays product discovery

In the successful Home capture, the hero occupies roughly two-fifths of the visible image. Another category section repeats destinations already offered directly above it. Quick picks begins near the bottom, where the floating bar covers part of the visible product imagery.

**Impact:** returning grocery shoppers spend substantial screen space passing introductory content before comparing products. This is a design hypothesis about task efficiency, not measured conversion loss. **Recommendation:** test a shorter hero, retain a clear first-order action, prioritize useful products earlier, and decide whether both category presentations earn their space. Preserve the cream/green/yellow identity, logo, and supplied product imagery. **Command:** `$impeccable distill` / `$impeccable layout`.

### Additional visual evidence for existing findings

- **F09:** the floating bar visibly overlays product imagery. That confirms occlusion in this capture, but not that product actions or the last list item are unreachable. The failure capture's top tab strip overlaps a heading; reproduce that specific navigation variant before treating it as a current-code defect.
- **F09/F11:** emoji navigation icons, a visually dominant cart island, small navigation labels, and stacked rounded menu cards are visible. The native interaction and large-text consequences still require device checks; custom branding alone is not a defect.
- **F11:** the drawer visibly truncates “Tea & Cof…”, even at the captured text size. Permit a second line or use a compact, unambiguous localized label; do not shrink text to fit.
- **Positive:** the logo, cream background, deep green hero, and yellow action create a coherent identity. The primary hero action is clear, menu rows have readable titles, and the drawer exposes orders/help without deep navigation.

Prioritize the newly confirmed false badges alongside F01/F04's misleading feedback. Reproduce the header-overlap variant and inspect scrolling under the floating bar before changing navigation geometry. These screenshots do not resolve the outstanding keyboard, safe-area, VoiceOver, native dark-mode, or gesture checks.
