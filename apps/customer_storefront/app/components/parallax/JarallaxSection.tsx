'use client';

/* jarallax requires a raw image element so it can manage the parallax layer. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from 'react';
import { jarallax } from 'jarallax';
import type { JarallaxOptions } from 'jarallax';

type DisableOption = boolean | RegExp | string | (() => boolean);

interface JarallaxSectionProps {
  children: React.ReactNode;
  imageUrl: string;
  className?: string;
  speed?: number;
  imgAlt?: string;
  imgPosition?: string;
  imgSize?: string;
  videoSrc?: string;
  videoStartTime?: number | string;
  videoEndTime?: number | string;
  videoVolume?: number | string;
  videoLoop?: boolean;
  videoPlayOnlyVisible?: boolean;
  videoLazyLoading?: boolean;
  disableParallax?: DisableOption;
  disableVideo?: DisableOption;
  threshold?: string;
  onInit?: (jarallaxInstance: unknown) => void;
  onDestroy?: () => void;
}

/**
 * Declarative wrapper around nk-o/jarallax.
 * Use for full-width parallax backgrounds or video sections.
 */
export function JarallaxSection({
  children,
  imageUrl,
  className = '',
  speed = 0.5,
  imgAlt = '',
  imgPosition = '50% 50%',
  imgSize = 'cover',
  videoSrc,
  videoStartTime,
  videoEndTime,
  videoVolume = 0,
  videoLoop = true,
  videoPlayOnlyVisible = true,
  videoLazyLoading = true,
  disableParallax,
  disableVideo,
  threshold = '0 0',
  onInit,
  onDestroy,
}: JarallaxSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options: JarallaxOptions = {
      speed,
      imgPosition,
      imgSize,
      imgSrc: imageUrl,
      threshold,
      videoSrc: videoSrc ?? undefined,
      videoStartTime,
      videoEndTime,
      videoVolume: videoVolume as number | string,
      videoLoop,
      videoPlayOnlyVisible,
      videoLazyLoading,
    };

    if (disableParallax !== undefined) {
      options.disableParallax = disableParallax;
    }
    if (disableVideo !== undefined) {
      options.disableVideo = disableVideo;
    }

    const instance = jarallax(container, options);
    onInit?.(instance);

    return () => {
      jarallax(container, 'destroy');
      onDestroy?.();
    };
  }, [
    imageUrl,
    speed,
    imgPosition,
    imgSize,
    videoSrc,
    videoStartTime,
    videoEndTime,
    videoVolume,
    videoLoop,
    videoPlayOnlyVisible,
    videoLazyLoading,
    disableParallax,
    disableVideo,
    threshold,
    onInit,
    onDestroy,
  ]);

  return (
    <div
      ref={containerRef}
      className={`jarallax relative overflow-hidden ${className}`}
      data-jarallax
      data-img={imageUrl}
      data-speed={speed}
      aria-hidden={false}
    >
      <img
        src={imageUrl}
        alt={imgAlt}
        className="jarallax-img absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
