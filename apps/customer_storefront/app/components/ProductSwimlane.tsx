import { ProductCard } from './ProductCard';
import type { Product } from '../lib/types';

interface ProductSwimlaneProps {
  title: string;
  products: Product[];
  cart: { id: string; qty: number }[];
  onAdd: (product: Product, buttonEl?: HTMLButtonElement | null) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClick: (id: string) => void;
  /** Optional subtitle or link */
  action?: { label: string; href: string };
}

export function ProductSwimlane({
  title,
  products,
  cart,
  onAdd,
  onUpdateQty,
  onClick,
  action,
}: ProductSwimlaneProps) {
  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  if (products.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-3 sm:px-4 lg:px-6">
        <h2 className="text-base sm:text-lg font-bold tracking-tight">{title}</h2>
        {action && (
          <a
            href={action.href}
            className="text-sm font-medium text-[#ffe302] hover:underline"
          >
            {action.label}
          </a>
        )}
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 px-3 sm:px-4 lg:px-6 scrollbar-hide scroll-edge-mask">
        {products.map((product, index) => {
          let addBtnRef: HTMLButtonElement | null = null;
          return (
            <div
              key={product.id}
              className="w-[160px] sm:w-[180px] lg:w-[200px] flex-shrink-0 snap-start"
            >
              <ProductCard
                id={product.id}
                emoji={product.emoji}
                name={product.name}
                price={product.price}
                originalPrice={product.originalPrice}
                badge={product.badge}
                unit={product.unit}
                stock={product.stock}
                category={product.category}
                image_url={product.image_url}
                qtyInCart={getQtyInCart(product.id)}
                priority={index === 0}
                onAdd={() => onAdd(product, addBtnRef)}
                onUpdateQty={(delta) => onUpdateQty(product.id, delta)}
                onClick={() => onClick(product.id)}
                onAddRef={(el) => { addBtnRef = el; }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
