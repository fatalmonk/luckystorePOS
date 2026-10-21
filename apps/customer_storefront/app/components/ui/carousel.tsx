'use client';

import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

type CarouselApi = UseEmblaCarouselType[1];
type CarouselOptions = Parameters<typeof useEmblaCarousel>[0];
type CarouselPlugins = Parameters<typeof useEmblaCarousel>[1];

interface CarouselContextValue {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi | undefined;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error('Carousel controls must be inside <Carousel>.');
  return context;
}

interface CarouselProps extends React.ComponentProps<'div'> {
  opts?: CarouselOptions;
  plugins?: CarouselPlugins;
  setApi?: (api: CarouselApi) => void;
}

function Carousel({ opts, plugins, setApi, className, children, ...props }: CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({ align: 'start', ...opts }, plugins);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const updateSelection = React.useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCanScrollPrev(carouselApi.canScrollPrev());
    setCanScrollNext(carouselApi.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  React.useEffect(() => {
    if (!api) return;
    updateSelection(api);
    api.on('select', updateSelection);
    api.on('reInit', updateSelection);
    return () => {
      api.off('select', updateSelection);
      api.off('reInit', updateSelection);
    };
  }, [api, updateSelection]);

  React.useEffect(() => {
    if (api && setApi) setApi(api);
  }, [api, setApi]);

  const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNext();
    }
  };

  return (
    <CarouselContext.Provider value={{ carouselRef, api, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}>
      <div
        {...props}
        className={['relative', className].filter(Boolean).join(' ')}
        onKeyDownCapture={onKeyDownCapture}
        role="region"
        aria-roledescription="carousel"
        tabIndex={0}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden touch-pan-y" data-slot="carousel-content">
      <div {...props} className={['-ml-3 flex', className].filter(Boolean).join(' ')} />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      role="group"
      aria-roledescription="slide"
      className={['min-w-0 shrink-0 grow-0 basis-full pl-3', className].filter(Boolean).join(' ')}
    />
  );
}

interface CarouselControlProps extends React.ComponentProps<'button'> {
  iconSize?: number;
}

function CarouselPrevious({ className, iconSize = 22, ...props }: CarouselControlProps) {
  const { scrollPrev, canScrollPrev } = useCarousel();
  return (
    <button
      {...props}
      type="button"
      aria-label={props['aria-label'] || 'Previous slide'}
      disabled={!canScrollPrev || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) scrollPrev();
      }}
      className={[
        'absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-warm-border bg-warm-bg/95 text-warm-fg shadow-warm-panel transition-opacity hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:pointer-events-none disabled:opacity-0',
        className,
      ].filter(Boolean).join(' ')}
    >
      <CaretLeft size={iconSize} aria-hidden="true" />
    </button>
  );
}

function CarouselNext({ className, iconSize = 22, ...props }: CarouselControlProps) {
  const { scrollNext, canScrollNext } = useCarousel();
  return (
    <button
      {...props}
      type="button"
      aria-label={props['aria-label'] || 'Next slide'}
      disabled={!canScrollNext || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) scrollNext();
      }}
      className={[
        'absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-warm-border bg-warm-bg/95 text-warm-fg shadow-warm-panel transition-opacity hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:pointer-events-none disabled:opacity-0',
        className,
      ].filter(Boolean).join(' ')}
    >
      <CaretRight size={iconSize} aria-hidden="true" />
    </button>
  );
}

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
