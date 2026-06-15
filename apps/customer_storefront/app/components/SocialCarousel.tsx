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
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #fef3c7 100%)',
    productName: 'Organic Bananas',
    productPrice: 80,
    productEmoji: '🍌',
    productId: 'bananas-organic',
  },
  {
    id: '2',
    handle: 'chef_maria',
    emoji: '🍞',
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #ffedd5 100%)',
    productName: 'Artisan Bread',
    productPrice: 65,
    productEmoji: '🍞',
    productId: 'bread-artisan',
  },
  {
    id: '3',
    handle: 'healthy_rahul',
    emoji: '🥛',
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #dbeafe 100%)',
    productName: 'Greek Yogurt',
    productPrice: 120,
    productEmoji: '🥛',
    productId: 'yogurt-greek',
  },
  {
    id: '4',
    handle: 'snack_queen',
    emoji: '🥜',
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #f1f5f9 100%)',
    productName: 'Mixed Nuts',
    productPrice: 250,
    productEmoji: '🥜',
    productId: 'nuts-mixed',
  },
  {
    id: '5',
    handle: 'baker_bob',
    emoji: '🥐',
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #fee2e2 100%)',
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
            className="group relative h-80 w-48 flex-shrink-0 snap-start overflow-hidden rounded-[18px] cursor-pointer border border-[#e7e5e4] shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: creator.bgGradient }}
            />

            <div className="absolute inset-0 flex items-center justify-center opacity-10 text-8xl select-none pointer-events-none" aria-hidden="true">
              {creator.emoji}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 border border-[#e7e5e4] px-2.5 py-1 backdrop-blur-sm shadow-sm">
              <span className="text-xs" aria-hidden="true">{creator.emoji}</span>
              <span className="text-[10px] font-bold text-gray-800 truncate max-w-[100px]">@{creator.handle}</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5 rounded-[14px] bg-white p-2.5 shadow-[0_4px_12px_rgba(28,25,23,0.05)] border border-[#e7e5e4]/50 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
              <div className="h-10 w-10 rounded-[10px] bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0 border border-[#e7e5e4]/30" aria-hidden="true">
                {creator.productEmoji}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="line-clamp-1 text-xs font-semibold text-gray-900 truncate">{creator.productName}</span>
                <span className="text-sm font-bold text-warm-primary">{formatBdt(creator.productPrice)}</span>
              </div>
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
