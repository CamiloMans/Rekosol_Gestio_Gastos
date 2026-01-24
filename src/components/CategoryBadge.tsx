import { categorias as categoriasMock } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useCategorias, useSharePointAuth } from '@/hooks/useSharePoint';

interface CategoryBadgeProps {
  categoryId: string;
  className?: string;
}

export function CategoryBadge({ categoryId, className }: CategoryBadgeProps) {
  const { isAuthenticated } = useSharePointAuth();
  const { categorias: categoriasSharePoint } = useCategorias();
  
  // Usar categorías de SharePoint si está autenticado, sino usar datos mock
  const categorias = isAuthenticated && categoriasSharePoint.length > 0
    ? categoriasSharePoint.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        color: cat.color || `bg-category-${cat.id}`,
      }))
    : categoriasMock;
  
  const category = categorias.find(c => c.id === categoryId);
  
  if (!category) return null;

  return (
    <span className={cn("category-badge", category.color, className)}>
      {category.nombre}
    </span>
  );
}
