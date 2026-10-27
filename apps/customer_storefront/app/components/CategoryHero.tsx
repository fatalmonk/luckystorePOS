'use client';
/* eslint-disable @next/next/no-img-element -- Use the CDN's generated responsive srcset and AVIF sources. */

import React, { type ReactNode } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { Button } from './ui/Button';

export interface CategoryHeroProps {
  name: string;
  description?: string;
  imageUrl?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageSources?: { srcSet: string; type: string; media?: string }[];
  iconUrl?: string;
  icon?: ReactNode;
  productCount?: number;
  locale?: 'en' | 'bn';
  onBack?: () => void;
}

export function CategoryHero({
  name,
  description,
  imageUrl,
  imageSrcSet,
  imageSizes = '(max-width: 768px) 100vw, 1200px',
  imageSources = [],
  iconUrl,
  icon,
  productCount,
  locale = 'en',
  onBack,
}: CategoryHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-b-warm-card bg-warm-bg text-center text-warm-fg sm:rounded-b-warm-panel">
      <div className="relative h-40 overflow-hidden bg-warm-fg/10 sm:h-48 lg:h-56">
        {imageUrl ? (
          <picture>
            {imageSources.map((source) => (
              <source key={`${source.type}-${source.media ?? 'all'}`} {...source} />
            ))}
            <img
              src={imageUrl}
              srcSet={imageSrcSet}
              sizes={imageSizes}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-warm-accent/40 via-warm-bg to-warm-fg/10" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-warm-fg/55 via-warm-fg/10 to-warm-fg/5" aria-hidden="true" />
        {onBack && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onBack}
            aria-label="Go back"
            className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full"
          >
            <ArrowLeft data-icon="inline-start" weight="bold" size={18} aria-hidden="true" />
          </Button>
        )}
        <svg
          className="absolute -bottom-px left-0 h-12 w-full text-warm-bg sm:h-16"
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 58C270 125 455 150 720 150s450-25 720-92v102H0V58Z" fill="currentColor" />
        </svg>
      </div>

      <div className="relative px-4 pb-4 pt-4 sm:pb-5">
        <div className="absolute left-1/2 top-[-2.75rem] flex size-14 -translate-x-1/2 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-warm-bg bg-warm-accent text-warm-accent-text shadow-warm-md sm:top-[-3rem] sm:size-16">
          {iconUrl ? (
            <img src={iconUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          ) : icon ? (
            <span aria-hidden="true">{icon}</span>
          ) : (
            <span className="text-2xl" aria-hidden="true">🛍️</span>
          )}
        </div>
        <h1 className="mx-auto max-w-3xl text-xl font-black leading-tight tracking-tight text-warm-fg sm:text-2xl lg:text-3xl">
          {name}
        </h1>
        {description && (
          <p className="mx-auto mt-1 max-w-2xl text-sm leading-5 text-warm-muted sm:text-base sm:leading-6">
            {description}
          </p>
        )}
        {typeof productCount === 'number' && (
          <p className="mt-2 text-xs font-bold text-warm-muted sm:text-sm">
            {productCount.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US')} {locale === 'bn' ? 'টি পণ্য' : productCount === 1 ? 'product' : 'products'}
          </p>
        )}
      </div>
    </section>
  );
}
