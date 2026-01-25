import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import type { TipoDocumento } from '@/services/sharepointService';

interface TipoDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tipoDocumento: Omit<TipoDocumento, 'id'>) => void;
  tipoDocumento?: TipoDocumento;
}

export function TipoDocumentoModal({ open, onClose, onSave, tipoDocumento }: TipoDocumentoModalProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (tipoDocumento) {
      setNombre(tipoDocumento.nombre);
    } else {
      setNombre('');
    }
  }, [tipoDocumento, open]);

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
            {tipoDocumento ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Tipo de Documento *</Label>
            <Input
              id="nombre"
              placeholder="Nombre del tipo de documento"
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

