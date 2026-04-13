import { categorias as categoriasMock } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  categoryId: string;
  className?: string;
  categories?: Array<{ id: string | number; nombre: string; color?: string }>;
}

export function CategoryBadge({ categoryId, className, categories: categoriesOverride }: CategoryBadgeProps) {
  const categorias = categoriesOverride ?? categoriasMock;
  const category = categorias.find((item) => String(item.id) === String(categoryId));

  if (!category) {
    return null;
  }

  const isHexColor = category.color?.startsWith('#');
  const isRgbColor = category.color?.startsWith('rgb') || category.color?.startsWith('rgba');
  const style = isHexColor || isRgbColor ? { backgroundColor: category.color } : undefined;
  const colorClass = isHexColor || isRgbColor ? undefined : category.color;

  return (
    <span className={cn('category-badge', colorClass, className)} style={style}>
      {category.nombre}
    </span>
  );
}
