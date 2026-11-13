'use client';

import * as React from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { toBengaliNumerals, type Locale } from '../../lib/i18n/config';
import { getDictionary } from '../../lib/i18n/dictionaries';
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
  locale?: Locale;
}

export function ProductImageGallery({ images, productName, category, sizes, locale = 'en' }: ProductImageGalleryProps) {
  const autoplay = React.useMemo(() => Autoplay({ delay: 2000, stopOnInteraction: true }), []);
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const copy = getDictionary(locale).productGallery;
  const number = (value: number) => locale === 'bn' ? toBengaliNumerals(value) : String(value);
  const imageAlt = (image: ProductGalleryImage, index: number) => image.alt || copy.fallbackAlt
    .replace('{name}', productName)
    .replace('{current}', number(index + 1));

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
      <div className="relative aspect-square overflow-hidden rounded-warm-gallery border border-warm-image-well-border bg-white">
        <ProductImage
          alt={productName}
          category={category}
          sizes={sizes}
          locale={locale}
          imageClassName="w-full h-full object-contain p-2 sm:p-3"
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
        plugins={images.length > 1 ? [autoplay] : []}
        aria-label={copy.label.replace('{name}', productName).trim()}
        aria-roledescription={copy.carouselRole}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={`${image.url}-${index}`} aria-roledescription={copy.slideRole}>
              <div className="relative aspect-square overflow-hidden rounded-warm-gallery border border-warm-image-well-border bg-white">
                <ProductImage
                  src={image.url}
                  alt={imageAlt(image, index)}
                  category={category}
                  sizes={sizes}
                  locale={locale}
                  imageClassName="h-full w-full object-contain p-2 sm:p-3"
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
            <CarouselPrevious aria-label={copy.previous} />
            <CarouselNext aria-label={copy.next} />
          </>
        )}
      </Carousel>

      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="group" aria-label={copy.choose}>
          {images.map((image, index) => (
            <button
              key={`${image.url}-indicator`}
              type="button"
              aria-label={copy.showImage
                .replace('{current}', number(index + 1))
                .replace('{total}', number(images.length))
                .replace('{alt}', imageAlt(image, index))}
              aria-current={current === index ? 'true' : undefined}
              onClick={() => api?.scrollTo(index)}
              className={[
                'h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent',
                current === index ? 'w-6 bg-warm-accent' : 'w-2.5 bg-warm-border hover:bg-warm-muted',
              ].join(' ')}
            />
          ))}
          <span className="sr-only" aria-live="polite">
            {copy.imageCount.replace('{current}', number(current + 1)).replace('{total}', number(images.length))}
          </span>
        </div>
      )}
    </div>
  );
}
