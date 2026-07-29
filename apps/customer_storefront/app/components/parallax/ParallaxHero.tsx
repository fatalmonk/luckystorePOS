'use client';

import { JarallaxSection } from './JarallaxSection';

interface ParallaxHeroProps {
  imageUrl: string;
  children: React.ReactNode;
}

/**
 * Drop-in parallax wrapper for the homepage hero/campaign area.
 * Keeps content on a raised surface while the background image scrolls.
 */
export function ParallaxHero({ imageUrl, children }: ParallaxHeroProps) {
  return (
    <JarallaxSection
      imageUrl={imageUrl}
      speed={0.3}
      imgPosition="50% 60%"
      imgSize="cover"
      disableParallax={/android|iphone|ipad|ipod/i}
      className="rounded-[28px]"
    >
      <div className="relative z-10">{children}</div>
    </JarallaxSection>
  );
}
