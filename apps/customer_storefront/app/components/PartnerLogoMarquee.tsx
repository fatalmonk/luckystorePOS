'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface StoreBrand {
  name: string;
  category: string;
  searchQuery: string;
  imageSrc: string;
}

const storeAssociatedBrands: StoreBrand[] = [
  {
    name: 'Unilever',
    category: 'Personal Care & Hygiene',
    searchQuery: 'unilever',
    imageSrc: '/images/brands/unilever.webp',
  },
  {
    name: 'Nestlé',
    category: 'Nutrition & Beverages',
    searchQuery: 'nestle',
    imageSrc: '/images/brands/nestle.webp',
  },
  {
    name: 'PRAN',
    category: 'Foods & Drinks',
    searchQuery: 'pran',
    imageSrc: '/images/brands/pran.webp',
  },
  {
    name: 'ACI',
    category: 'Pure Foods & Consumer',
    searchQuery: 'aci',
    imageSrc: '/images/brands/aci.webp',
  },
  {
    name: 'MGI',
    category: 'Meghna Group of Industries',
    searchQuery: 'fresh',
    imageSrc: '/images/brands/mgi.webp',
  },
  {
    name: 'Fresh',
    category: 'Essential Staples',
    searchQuery: 'fresh',
    imageSrc: '/images/brands/fresh.webp',
  },
  {
    name: 'Radhuni',
    category: 'Spices & Culinary',
    searchQuery: 'radhuni',
    imageSrc: '/images/brands/radhuni.webp',
  },
  {
    name: 'Square',
    category: 'Consumer Goods & Toiletries',
    searchQuery: 'square',
    imageSrc: '/images/brands/square.webp',
  },
  {
    name: 'Teer',
    category: 'Edible Oil & Staples',
    searchQuery: 'teer',
    imageSrc: '/images/brands/teer.webp',
  },
  {
    name: 'Aarong Dairy',
    category: 'Milk & Dairy Goods',
    searchQuery: 'aarong',
    imageSrc: '/images/brands/aarong_dairy.webp',
  },
  {
    name: 'Bashundhara',
    category: 'Paper & Household',
    searchQuery: 'bashundhara',
    imageSrc: '/images/brands/bashundhara.webp',
  },
  {
    name: 'Pushti',
    category: 'Consumer Foods & Staples',
    searchQuery: 'pushti',
    imageSrc: '/images/brands/pushti.webp',
  },
  {
    name: 'Igloo',
    category: 'Ice Cream & Frozen Treats',
    searchQuery: 'igloo',
    imageSrc: '/images/brands/igloo.webp',
  },
  {
    name: 'Savoy',
    category: 'Ice Cream & Desserts',
    searchQuery: 'savoy',
    imageSrc: '/images/brands/savoy.webp',
  },
  {
    name: 'Polar',
    category: 'Ice Cream & Frozen Delights',
    searchQuery: 'polar',
    imageSrc: '/images/brands/polar.webp',
  },
  {
    name: 'Cadbury',
    category: 'Chocolates & Confectionery',
    searchQuery: 'cadbury',
    imageSrc: '/images/brands/cadbury.webp',
  },
  {
    name: 'Mojo',
    category: 'Cold Beverages',
    searchQuery: 'mojo',
    imageSrc: '/images/brands/mojo.webp',
  },
  {
    name: 'Coca-Cola',
    category: 'Beverages & Soft Drinks',
    searchQuery: 'coca',
    imageSrc: '/images/brands/cocacola.webp',
  },
  {
    name: 'Ispahani',
    category: 'Premium Tea & Beverages',
    searchQuery: 'ispahani',
    imageSrc: '/images/brands/ispahani.webp',
  },
  {
    name: 'Taaza',
    category: 'Tea & Refreshing Beverages',
    searchQuery: 'taaza',
    imageSrc: '/images/brands/taaza.webp',
  },
  {
    name: 'New Zealand Dairy',
    category: 'Milk & Dairy Products',
    searchQuery: 'dairy',
    imageSrc: '/images/brands/newzealand_dairy.webp',
  },
  {
    name: 'MARKS',
    category: 'Full Cream Milk Powder',
    searchQuery: 'marks',
    imageSrc: '/images/brands/marks.webp',
  },
];

export function PartnerLogoMarquee() {
  return (
    <section
      aria-label="Official brands at Lucky Store"
      className="my-8 w-full overflow-hidden border-y border-warm-border/30 bg-warm-surface/20 py-8 sm:my-14 sm:py-12"
    >
      <div className="relative w-full overflow-hidden">
        {/* Soft edge fade overlays */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--color-surface,#fff)] to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--color-surface,#fff)] to-transparent sm:w-32" />

        <div className="partner-marquee-track flex items-center gap-12 sm:gap-16 lg:gap-24">
          {/* Primary interactive track */}
          {storeAssociatedBrands.map((brand, index) => (
            <Link
              key={`primary-${brand.name}-${index}`}
              href={`/category?search=${brand.searchQuery}`}
              className="flex h-16 w-40 shrink-0 items-center justify-center transition-all duration-300 hover:scale-110 sm:h-20 sm:w-52 lg:h-24 lg:w-60"
              title={`Shop ${brand.name} — ${brand.category}`}
            >
              <div className="relative flex h-full w-full items-center justify-center p-2">
                <Image
                  src={brand.imageSrc}
                  alt={brand.name}
                  width={240}
                  height={90}
                  className="max-h-full max-w-full object-contain transition-all duration-300 drop-shadow-sm dark:brightness-110"
                />
              </div>
            </Link>
          ))}

          {/* Duplicated visual loop track (aria-hidden and non-focusable for screen readers & keyboard) */}
          <div className="flex items-center gap-12 sm:gap-16 lg:gap-24" aria-hidden="true">
            {storeAssociatedBrands.map((brand, index) => (
              <Link
                key={`duplicate-${brand.name}-${index}`}
                href={`/category?search=${brand.searchQuery}`}
                tabIndex={-1}
                aria-hidden="true"
                className="flex h-16 w-40 shrink-0 items-center justify-center transition-all duration-300 hover:scale-110 sm:h-20 sm:w-52 lg:h-24 lg:w-60"
                title={`Shop ${brand.name} — ${brand.category}`}
              >
                <div className="relative flex h-full w-full items-center justify-center p-2">
                  <Image
                    src={brand.imageSrc}
                    alt=""
                    width={240}
                    height={90}
                    className="max-h-full max-w-full object-contain transition-all duration-300 drop-shadow-sm dark:brightness-110"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
