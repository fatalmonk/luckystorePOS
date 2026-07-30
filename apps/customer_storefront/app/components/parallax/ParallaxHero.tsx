'use client';

import { JarallaxSection } from './JarallaxSection';

interface ParallaxHeroProps {
  imageUrl: string;
  children: React.ReactNode;
  className?: string;
  imgPosition?: string;
  speed?: number;
}

function shouldDisableParallax() {
  if (typeof window === 'undefined') return true;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Drop-in parallax wrapper for the homepage hero/campaign area.
 * Keeps content on a raised surface while the background image scrolls.
 */
export function ParallaxHero({
  imageUrl,
  children,
  className = '',
  imgPosition = '50% 60%',
  speed = 0.22,
}: ParallaxHeroProps) {
  return (
    <JarallaxSection
      imageUrl={imageUrl}
      speed={speed}
      imgPosition={imgPosition}
      imgSize="cover"
      disableParallax={shouldDisableParallax}
      className={`rounded-[28px] ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </JarallaxSection>
  );
}
