import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

type CategoriaFormData = {
  id: string;
  nombre: string;
};

interface CategoriaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (categoria: Omit<CategoriaFormData, 'id'>) => void | Promise<void>;
  categoria?: CategoriaFormData;
}

export function CategoriaModal({ open, onClose, onSave, categoria }: CategoriaModalProps) {
  const [nombre, setNombre] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre ? categoria.nombre.toUpperCase() : '');
    } else {
      setNombre('');
    }
  }, [categoria, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        nombre,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar categoria:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {categoria ? 'Editar Categoria' : 'Nueva Categoria'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Categoria *</Label>
            <Input
              id="nombre"
              placeholder="Nombre de la categoria"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
