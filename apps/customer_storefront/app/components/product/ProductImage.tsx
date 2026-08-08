'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { CategoryIcon, resolveCategoryIcon } from '../icons/CategoryIcons';

interface ProductImageFallbackProps {
  alt: string;
  category?: string | null;
  iconSize?: number;
  className?: string;
}

export function ProductImageFallback({
  alt,
  category,
  iconSize = 42,
  className = '',
}: ProductImageFallbackProps) {
  const categoryName = category?.trim() || '';
  const { isKnown } = resolveCategoryIcon(categoryName);

  return (
    <div
      role="img"
      aria-label={`${alt} image unavailable`}
      data-testid="product-image-fallback"
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-image-well px-3 text-warm-muted ${className}`}
    >
      <span
        className="flex items-center justify-center rounded-warm-lg border border-warm-image-well-border bg-warm-surface/70 p-3"
        aria-hidden="true"
      >
        <CategoryIcon category={categoryName} size={iconSize} />
      </span>
      {!isKnown && (
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-warm-dim">
          Lucky Store
        </span>
      )}
    </div>
  );
}

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string | null;
  sizes: string;
  priority?: boolean;
  imageClassName?: string;
  fallbackClassName?: string;
  iconSize?: number;
  showLoadingState?: boolean;
}

export function ProductImage({
  src,
  alt,
  category,
  sizes,
  priority = false,
  imageClassName = 'object-contain',
  fallbackClassName,
  iconSize,
  showLoadingState = false,
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const showImage = Boolean(src) && !imageError;

  return (
    <>
      {showLoadingState && src && !imageLoaded && !imageError && (
        <div
          data-testid="product-image-loading"
          className="absolute inset-3 animate-pulse rounded-warm-md bg-warm-border/50"
          aria-hidden="true"
        />
      )}
      {showImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={imageClassName}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(true);
            setImageError(true);
          }}
        />
      ) : (
        <ProductImageFallback
          alt={alt}
          category={category}
          iconSize={iconSize}
          className={fallbackClassName}
        />
      )}
    </>
  );
}
