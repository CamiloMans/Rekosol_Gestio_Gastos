import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Colaborador } from '@/data/mockData';
import { Save } from 'lucide-react';

interface ColaboradorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (colaborador: Omit<Colaborador, 'id' | 'createdAt'>) => void | Promise<void>;
  colaborador?: Colaborador;
}

export function ColaboradorModal({ open, onClose, onSave, colaborador }: ColaboradorModalProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (colaborador) {
      setNombre(colaborador.nombre);
      setEmail(colaborador.email || '');
      setTelefono(colaborador.telefono || '');
      setCargo(colaborador.cargo || '');
    } else {
      setNombre('');
      setEmail('');
      setTelefono('');
      setCargo('');
    }
  }, [colaborador, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        nombre: nombre.trim().toUpperCase(),
        email: email || undefined,
        telefono: telefono || undefined,
        cargo: cargo || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar colaborador:', error);
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
            {colaborador ? 'Editar Colaborador' : 'Nuevo Colaborador'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="+56912345678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Select value={cargo || undefined} onValueChange={setCargo}>
              <SelectTrigger className="bg-card" id="cargo">
                <SelectValue placeholder="Seleccionar cargo" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="Operador">Operador</SelectItem>
                <SelectItem value="Contador">Contador</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
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
