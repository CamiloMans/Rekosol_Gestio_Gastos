import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import type { Categoria } from '@/services/sharepointService';

interface CategoriaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (categoria: Omit<Categoria, 'id'>) => void;
  categoria?: Categoria;
}

export function CategoriaModal({ open, onClose, onSave, categoria }: CategoriaModalProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre ? categoria.nombre.toUpperCase() : '');
    } else {
      setNombre('');
    }
  }, [categoria, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      nombre,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Categoría *</Label>
            <Input
              id="nombre"
              placeholder="Nombre de la categoría"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save size={18} />
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

