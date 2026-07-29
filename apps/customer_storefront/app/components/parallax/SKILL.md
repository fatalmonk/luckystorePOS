# Jarallax parallax skill

Installs and wires up `jarallax` as a reusable client component in the Next.js customer storefront.

## Files

- `app/components/parallax/JarallaxSection.tsx` — low-level `jarallax` wrapper.
- `app/components/parallax/ParallaxHero.tsx` — homepage hero convenience wrapper.

## Usage

```tsx
import { JarallaxSection } from './components/parallax/JarallaxSection';

<JarallaxSection
  imageUrl="/banners/promo_welcome_v2_1200.avif"
  speed={0.3}
  imgPosition="50% 60%"
  imgSize="cover"
  className="rounded-[28px]"
>
  <div>Your content here</div>
</JarallaxSection>
```

Or use the hero shortcut:

```tsx
import { ParallaxHero } from './components/parallax/ParallaxHero';

<ParallaxHero imageUrl="/banners/promo_welcome_v2_1200.avif">
  <CampaignGrid />
</ParallaxHero>
```

## Notes

- Component has `'use client'` because jarallax reads the DOM.
- `disableParallax` is set to mobile user agents by default in `ParallaxHero` to avoid performance issues on low-power devices.
- Supports image backgrounds and video backgrounds via `videoSrc`.

## Verification

```bash
cd apps/customer_storefront
npx tsc --noEmit
npm run build
```
