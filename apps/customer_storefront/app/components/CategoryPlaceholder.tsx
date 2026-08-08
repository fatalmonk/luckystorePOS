import type { Category } from '../lib/types';
import { CategoryIcon } from './icons/CategoryIcons';

export function CategoryPlaceholder({ category }: { category: Category }) {
  return <CategoryIcon category={category} size={48} className="text-warm-muted" />;
}
