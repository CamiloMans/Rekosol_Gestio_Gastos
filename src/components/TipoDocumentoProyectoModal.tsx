import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';

type TipoDocumentoProyectoFormData = {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
};

interface TipoDocumentoProyectoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tipoDocumentoProyecto: Omit<TipoDocumentoProyectoFormData, 'id'>) => void | Promise<void>;
  tipoDocumentoProyecto?: TipoDocumentoProyectoFormData;
}

export function TipoDocumentoProyectoModal({
  open,
  onClose,
  onSave,
  tipoDocumentoProyecto,
}: TipoDocumentoProyectoModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tipoDocumentoProyecto) {
      setNombre(tipoDocumentoProyecto.nombre || '');
      setDescripcion(tipoDocumentoProyecto.descripcion || '');
      setActivo(Boolean(tipoDocumentoProyecto.activo));
    } else {
      setNombre('');
      setDescripcion('');
      setActivo(true);
    }
  }, [tipoDocumentoProyecto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        nombre: nombre.trim().toUpperCase(),
        descripcion: descripcion.trim() ? descripcion.trim().toUpperCase() : undefined,
        activo,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar documento de proyecto:', error);
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
            {tipoDocumentoProyecto ? 'Editar Documento de Proyecto' : 'Nuevo Documento de Proyecto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombreTipoDocumentoProyecto">Nombre *</Label>
            <Input
              id="nombreTipoDocumentoProyecto"
              placeholder="Ej: FACTURA / CONTRATO / ORDEN DE COMPRA"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcionTipoDocumentoProyecto">Descripcion</Label>
            <Textarea
              id="descripcionTipoDocumentoProyecto"
              placeholder="Descripcion opcional"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
              rows={3}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="activoTipoDocumentoProyecto">Activo</Label>
              <Switch
                id="activoTipoDocumentoProyecto"
                checked={activo}
                onCheckedChange={setActivo}
              />
            </div>
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
