'use client';

import * as React from 'react';
import type { ProductGalleryImage } from '../../lib/products/productEnrichmentTypes';
import type { CarouselApi } from '../ui/carousel';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { ProductImage } from './ProductImage';

export type { ProductGalleryImage } from '../../lib/products/productEnrichmentTypes';

interface ProductImageGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
  category: string;
  sizes: string;
}

export function ProductImageGallery({ images, productName, category, sizes }: ProductImageGalleryProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on('select', updateCurrent);
    return () => {
      api.off('select', updateCurrent);
    };
  }, [api]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-warm-sheet border border-warm-image-well-border bg-warm-image-well">
        <ProductImage
          alt={productName}
          category={category}
          sizes={sizes}
          imageClassName="w-full h-full object-contain p-6 sm:p-8 lg:p-10"
          iconSize={64}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Carousel
        setApi={setApi}
        opts={{ containScroll: 'trimSnaps', loop: false }}
        aria-label={`${productName} product images`}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={`${image.url}-${index}`}>
              <div className="relative aspect-square overflow-hidden rounded-warm-sheet border border-warm-image-well-border bg-warm-image-well">
                <ProductImage
                  src={image.url}
                  alt={image.alt || `${productName}, image ${index + 1}`}
                  category={category}
                  sizes={sizes}
                  imageClassName="h-full w-full object-contain p-6 sm:p-8 lg:p-10"
                  priority={index === 0}
                  iconSize={64}
                />
                {image.badge && (
                  <span className="absolute bottom-4 right-4 rounded-full border border-warm-border bg-warm-bg px-4 py-2 text-sm font-bold text-warm-fg shadow-warm-panel">
                    {image.badge}
                  </span>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious aria-label="Previous product image" />
            <CarouselNext aria-label="Next product image" />
          </>
        )}
      </Carousel>

      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="group" aria-label="Choose product image">
          {images.map((image, index) => (
            <button
              key={`${image.url}-indicator`}
              type="button"
              aria-label={`Show image ${index + 1} of ${images.length}: ${image.alt}`}
              aria-current={current === index ? 'true' : undefined}
              onClick={() => api?.scrollTo(index)}
              className={[
                'h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent',
                current === index ? 'w-6 bg-warm-accent' : 'w-2.5 bg-warm-border hover:bg-warm-muted',
              ].join(' ')}
            />
          ))}
          <span className="sr-only" aria-live="polite">Image {current + 1} of {images.length}</span>
        </div>
      )}
    </div>
  );
}
