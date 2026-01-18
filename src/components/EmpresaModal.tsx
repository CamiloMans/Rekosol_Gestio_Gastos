import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Empresa } from '@/data/mockData';
import { Save } from 'lucide-react';

interface EmpresaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (empresa: Omit<Empresa, 'id' | 'createdAt'>) => void;
  empresa?: Empresa;
}

export function EmpresaModal({ open, onClose, onSave, empresa }: EmpresaModalProps) {
  const [razonSocial, setRazonSocial] = useState('');
  const [rut, setRut] = useState('');

  useEffect(() => {
    if (empresa) {
      setRazonSocial(empresa.razonSocial);
      setRut(empresa.rut);
    } else {
      setRazonSocial('');
      setRut('');
    }
  }, [empresa, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ razonSocial, rut });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {empresa ? 'Editar Empresa' : 'Nueva Empresa'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="razonSocial">Razón Social *</Label>
            <Input
              id="razonSocial"
              placeholder="Nombre de la empresa"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Formato: 12.345.678-9</p>
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
