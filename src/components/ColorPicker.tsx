import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

// Colores pasteles predefinidos
const PASTEL_COLORS = [
  { name: 'Rosa', value: '#FFB3BA', tailwind: 'bg-pink-200' },
  { name: 'Melocotón', value: '#FFDFBA', tailwind: 'bg-orange-200' },
  { name: 'Amarillo', value: '#FFFFBA', tailwind: 'bg-yellow-200' },
  { name: 'Verde Menta', value: '#BAFFC9', tailwind: 'bg-green-200' },
  { name: 'Azul Cielo', value: '#BAE1FF', tailwind: 'bg-blue-200' },
  { name: 'Lavanda', value: '#E0BAFF', tailwind: 'bg-purple-200' },
  { name: 'Coral', value: '#FFCCCB', tailwind: 'bg-red-200' },
  { name: 'Turquesa', value: '#B0E0E6', tailwind: 'bg-cyan-200' },
  { name: 'Melón', value: '#FFDAB9', tailwind: 'bg-orange-100' },
  { name: 'Lima', value: '#F0E68C', tailwind: 'bg-lime-200' },
  { name: 'Azul Claro', value: '#ADD8E6', tailwind: 'bg-sky-200' },
  { name: 'Violeta', value: '#DDA0DD', tailwind: 'bg-fuchsia-200' },
  { name: 'Salmón', value: '#FA8072', tailwind: 'bg-rose-300' },
  { name: 'Verde Agua', value: '#7FFFD4', tailwind: 'bg-emerald-200' },
  { name: 'Beige', value: '#F5F5DC', tailwind: 'bg-stone-200' },
  { name: 'Lavanda Claro', value: '#E6E6FA', tailwind: 'bg-violet-200' },
];

export function ColorPicker({ currentColor, onColorChange, disabled = false }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  // Detectar si el color actual es hexadecimal, RGB o clase de Tailwind
  const isHexColor = currentColor?.startsWith('#');
  const isRgbColor = currentColor?.startsWith('rgb') || currentColor?.startsWith('rgba');
  const isTailwindClass = currentColor?.startsWith('bg-');

  // Obtener el color de fondo para mostrar
  const getBackgroundColor = () => {
    if (isHexColor || isRgbColor) {
      return currentColor;
    }
    // Para clases de Tailwind, no podemos obtener el color directamente desde JS
    // Usaremos la clase CSS directamente en el botón
    return undefined;
  };

  // Obtener la clase CSS para el color actual
  const getColorClass = () => {
    if (isHexColor || isRgbColor) {
      return undefined;
    }
    // Si es una clase de Tailwind, usarla directamente
    return currentColor || 'bg-muted';
  };

  const handleColorSelect = (color: { value: string; tailwind: string }) => {
    // Guardar como clase de Tailwind para mantener consistencia
    onColorChange(color.tailwind);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-8 h-8 rounded-md border-2 border-border hover:border-primary transition-all cursor-pointer",
            getColorClass(),
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={getBackgroundColor() ? { backgroundColor: getBackgroundColor() } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen(true);
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium mb-2">Seleccionar color</p>
          <div className="grid grid-cols-4 gap-2">
            {PASTEL_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={cn(
                  "w-10 h-10 rounded-md border-2 transition-all hover:scale-110",
                  currentColor === color.tailwind ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color)}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

