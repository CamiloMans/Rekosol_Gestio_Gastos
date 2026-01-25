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

  // Detectar si el color es un código hexadecimal o una clase de Tailwind
  const isHexColor = category.color?.startsWith('#');
  const isRgbColor = category.color?.startsWith('rgb') || category.color?.startsWith('rgba');
  const isTailwindClass = category.color?.startsWith('bg-');
  
  // Si es un color hexadecimal o RGB, aplicarlo como estilo inline
  // Si es una clase de Tailwind (como bg-category-*), aplicarla como clase CSS
  // Las clases bg-category-* usan las variables CSS definidas en index.css
  const style = (isHexColor || isRgbColor) ? { backgroundColor: category.color } : undefined;
  const colorClass = (isHexColor || isRgbColor) ? undefined : category.color;

  return (
    <span 
      className={cn("category-badge", colorClass, className)}
      style={style}
    >
      {category.nombre}
    </span>
  );
}
