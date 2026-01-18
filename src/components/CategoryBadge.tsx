import { categorias } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  categoryId: string;
  className?: string;
}

export function CategoryBadge({ categoryId, className }: CategoryBadgeProps) {
  const category = categorias.find(c => c.id === categoryId);
  
  if (!category) return null;

  return (
    <span className={cn("category-badge", category.color, className)}>
      {category.nombre}
    </span>
  );
}
