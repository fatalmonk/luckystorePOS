'use client';

import Image from 'next/image';
import Link from 'next/link';

interface SocialCreator {
  id: string;
  handle: string;
  avatar: string;
  bgImage: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productId: string;
}

const defaultCreators: SocialCreator[] = [
  {
    id: '1',
    handle: 'foodie_alex',
    avatar: '/avatars/alex.jpg',
    bgImage: '/social/1.jpg',
    productName: 'Organic Bananas',
    productPrice: 80,
    productImage: '/products/bananas.jpg',
    productId: 'bananas-organic',
  },
  {
    id: '2',
    handle: 'chef_maria',
    avatar: '/avatars/maria.jpg',
    bgImage: '/social/2.jpg',
    productName: 'Artisan Bread',
    productPrice: 65,
    productImage: '/products/bread.jpg',
    productId: 'bread-artisan',
  },
  {
    id: '3',
    handle: 'healthy_rahul',
    avatar: '/avatars/rahul.jpg',
    bgImage: '/social/3.jpg',
    productName: 'Greek Yogurt',
    productPrice: 120,
    productImage: '/products/yogurt.jpg',
    productId: 'yogurt-greek',
  },
  {
    id: '4',
    handle: 'snack_queen',
    avatar: '/avatars/snack.jpg',
    bgImage: '/social/4.jpg',
    productName: 'Mixed Nuts',
    productPrice: 250,
    productImage: '/products/nuts.jpg',
    productId: 'nuts-mixed',
  },
  {
    id: '5',
    handle: 'baker_bob',
    avatar: '/avatars/bob.jpg',
    bgImage: '/social/5.jpg',
    productName: 'Croissants',
    productPrice: 180,
    productImage: '/products/croissants.jpg',
    productId: 'croissants',
  },
];

interface SocialCarouselProps {
  title?: string;
  creators?: SocialCreator[];
}

export function SocialCarousel({ title = 'From Our Community', creators = defaultCreators }: SocialCarouselProps) {
  return (
    <section className="mb-8 px-4 sm:px-6 lg:px-8 xl:px-10" aria-label="Social commerce">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-edge-mask">
        {creators.map((creator) => (
          <Link
            key={creator.id}
            href={`/product/${creator.productId}`}
            className="group relative h-80 w-48 flex-shrink-0 snap-start overflow-hidden rounded-[18px] bg-gray-200 cursor-pointer"
          >
            {/* Background image */}
            <Image
              src={creator.bgImage}
              alt={creator.handle}
              fill
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 200px, 192px"
              loading="lazy"
              decoding="async"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Creator info */}
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              <Image
                src={creator.avatar}
                alt={creator.handle}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-white/50 object-cover"
              />
              <span className="text-xs font-medium text-white truncate max-w-[120px]">@{creator.handle}</span>
            </div>

            {/* Floating product card */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-[14px] bg-white p-2.5 shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
              <Image
                src={creator.productImage}
                alt={creator.productName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-[10px] bg-gray-100 object-cover flex-shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-gray-900 truncate">
                  {creator.productName}
                </span>
                <span className="text-base font-bold text-green-700">
                  ৳{creator.productPrice}
                </span>
              </div>
              <span className="text-xl text-gray-300 group-hover:text-[#FFF34D] transition-colors">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Skeleton for SocialCarousel
export function SocialCarouselSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="mb-8 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="h-5 bg-gray-200 rounded animate-pulse w-48 mb-4" />
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-edge-mask">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-80 w-48 flex-shrink-0 snap-start rounded-[18px] bg-gray-200 animate-pulse" />
        ))}
      </div>
    </section>
  );
}