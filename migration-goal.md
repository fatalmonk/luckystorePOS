# Customer storefront → Expo migration goal

Goal: migrate `apps/customer_storefront` from web to a native Expo app by following the `expo-web-to-native` skill, one screen per iteration, until done.

Each iteration, FIRST re-read `/Users/mac.alvi/.agents/skills/expo-web-to-native/SKILL.md` and its directly referenced `native-patterns.md`, `false-friends.md`, and `verify-on-device.md`, then:

1. Open `migration-progress.md` and take the top unchecked item under **nativize-now**. If none are left unresolved (every nativize-now item is done or blocked), stop and summarize what shipped and what is blocked and why.
2. Redesign that screen natively per the skill's step 4. Reach for `@expo/ui` first where it is suitable, then Expo Router native navigation; use React Native primitives for custom layouts and virtualized product feeds. Never use a whole-screen WebView port.
3. Verify per `verify-on-device.md`: compare the deployed web original with the native screen on iOS and Android for content and behavior parity. Fix code-caused differences in the same iteration. If an external dependency prevents verification, mark the item blocked with the exact unlock condition.
4. Check off only that item and append `<screen> — done` or `<screen> — blocked: <reason> — needs <unlock>` to its Evidence line. Never revisit a resolved blocked item.

Rules: one screen per pass; keep the app build green after every pass; use `@expo/ui` before React Native primitives where it fits; never touch **nativize-later** items. Preserve the existing Next.js storefront/backend, admin app, and Flutter operations app. Do not submit production orders or change production data while verifying.

Base API URL for native (no relative paths): `https://www.luckystore1947.com`.
