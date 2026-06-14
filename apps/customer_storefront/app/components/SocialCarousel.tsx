import Link from 'next/link';
import { formatBdt } from '../lib/formatPrice';

interface SocialCreator {
  id: string;
  handle: string;
  emoji: string;
  bgGradient: string;
  productName: string;
  productPrice: number;
  productEmoji: string;
  productId: string;
}

const defaultCreators: SocialCreator[] = [
  {
    id: '1',
    handle: 'foodie_alex',
    emoji: '🍌',
    bgGradient: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)',
    productName: 'Organic Bananas',
    productPrice: 80,
    productEmoji: '🍌',
    productId: 'bananas-organic',
  },
  {
    id: '2',
    handle: 'chef_maria',
    emoji: '🍞',
    bgGradient: 'linear-gradient(135deg, #fed7aa 0%, #ea580c 100%)',
    productName: 'Artisan Bread',
    productPrice: 65,
    productEmoji: '🍞',
    productId: 'bread-artisan',
  },
  {
    id: '3',
    handle: 'healthy_rahul',
    emoji: '🥛',
    bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #3b82f6 100%)',
    productName: 'Greek Yogurt',
    productPrice: 120,
    productEmoji: '🥛',
    productId: 'yogurt-greek',
  },
  {
    id: '4',
    handle: 'snack_queen',
    emoji: '🥜',
    bgGradient: 'linear-gradient(135deg, #d9f99d 0%, #65a30d 100%)',
    productName: 'Mixed Nuts',
    productPrice: 250,
    productEmoji: '🥜',
    productId: 'nuts-mixed',
  },
  {
    id: '5',
    handle: 'baker_bob',
    emoji: '🥐',
    bgGradient: 'linear-gradient(135deg, #fecaca 0%, #dc2626 100%)',
    productName: 'Croissants',
    productPrice: 180,
    productEmoji: '🥐',
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
            className="group relative h-80 w-48 flex-shrink-0 snap-start overflow-hidden rounded-[18px] cursor-pointer"
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: creator.bgGradient }}
            />

            <div className="absolute inset-0 flex items-center justify-center opacity-20 text-8xl select-none pointer-events-none" aria-hidden="true">
              {creator.emoji}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              <span aria-hidden="true">{creator.emoji}</span>
              <span className="text-xs font-medium text-white truncate max-w-[120px]">@{creator.handle}</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-[14px] bg-white p-2.5 shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
              <div className="h-10 w-10 rounded-[10px] bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
                {creator.productEmoji}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-gray-900 truncate">{creator.productName}</span>
                <span className="text-base font-bold text-green-700">{formatBdt(creator.productPrice)}</span>
              </div>
              <span className="text-xl text-gray-300 group-hover:text-[#FFF34D] transition-colors" aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

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
