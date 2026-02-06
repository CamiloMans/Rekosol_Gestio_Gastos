import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Proyecto } from '@/data/mockData';
import { Save } from 'lucide-react';

interface ProyectoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (proyecto: Omit<Proyecto, 'id' | 'createdAt'>) => void;
  proyecto?: Proyecto;
}

export function ProyectoModal({ open, onClose, onSave, proyecto }: ProyectoModalProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (proyecto) {
      setNombre(proyecto.nombre);
    } else {
      setNombre('');
    }
  }, [proyecto, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nombre });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Proyecto *</Label>
            <Input
              id="nombre"
              placeholder="Nombre del proyecto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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













