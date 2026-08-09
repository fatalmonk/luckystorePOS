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
  removeWhiteBackground?: boolean;
}

function removeWhitePixels(image: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) return null;

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const isNearWhite = red > 238 && green > 238 && blue > 238 && max - min < 18;
    const isVeryLightNeutral = red > 224 && green > 224 && blue > 224 && max - min < 10;

    if (alpha > 0 && (isNearWhite || isVeryLightNeutral)) {
      const transparency = isNearWhite ? 0 : Math.max(0, 255 - (min - 224) * 8);
      data[index + 3] = transparency;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function BackgroundRemovedImage({
  src,
  alt,
  imageClassName,
  priority,
  onLoad,
  onError,
}: {
  src: string;
  alt: string;
  imageClassName: string;
  priority: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [processingFailed, setProcessingFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProcessedSrc(null);
    setProcessingFailed(false);

    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      try {
        const cleaned = removeWhitePixels(image);
        if (!cancelled && cleaned) {
          setProcessedSrc(cleaned);
        } else if (!cancelled) {
          setProcessingFailed(true);
        }
      } catch {
        if (!cancelled) setProcessingFailed(true);
      }
    };
    image.onerror = () => {
      if (!cancelled) setProcessingFailed(true);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!processedSrc && !processingFailed) return null;

  return (
    // Processed canvas output must render through a plain img data URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={processedSrc ?? src}
      data-original-src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${imageClassName}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={onLoad}
      onError={onError}
    />
  );
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
  removeWhiteBackground = false,
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
      {showImage && src && removeWhiteBackground ? (
        <BackgroundRemovedImage
          src={src}
          alt={alt}
          imageClassName={imageClassName}
          priority={priority}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(true);
            setImageError(true);
          }}
        />
      ) : showImage && src ? (
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
