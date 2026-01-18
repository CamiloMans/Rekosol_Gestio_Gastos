import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categorias, empresasData, Gasto } from '@/data/mockData';
import { Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GastoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (gasto: Omit<Gasto, 'id'>) => void;
  gasto?: Gasto;
}

const tiposDocumento = ['Factura', 'Orden de Compra', 'Boleta'] as const;

export function GastoModal({ open, onClose, onSave, gasto }: GastoModalProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<typeof tiposDocumento[number]>('Factura');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');

  useEffect(() => {
    if (gasto) {
      setFecha(gasto.fecha);
      setCategoria(gasto.categoria);
      setTipoDocumento(gasto.tipoDocumento);
      setNumeroDocumento(gasto.numeroDocumento);
      setEmpresaId(gasto.empresaId);
      setMonto(gasto.monto.toString());
      setDetalle(gasto.detalle || '');
    } else {
      setFecha(new Date().toISOString().split('T')[0]);
      setCategoria('');
      setTipoDocumento('Factura');
      setNumeroDocumento('');
      setEmpresaId('');
      setMonto('');
      setDetalle('');
    }
  }, [gasto, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fecha,
      categoria,
      tipoDocumento,
      numeroDocumento,
      empresaId,
      monto: parseInt(monto),
      detalle,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {gasto ? 'Editar Gasto' : 'Nuevo Gasto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select value={categoria} onValueChange={setCategoria} required>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <div className="flex gap-2">
              {tiposDocumento.map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  variant={tipoDocumento === tipo ? "default" : "outline"}
                  onClick={() => setTipoDocumento(tipo)}
                  className={cn(
                    "flex-1",
                    tipoDocumento === tipo && "bg-primary text-primary-foreground"
                  )}
                >
                  {tipo}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento">Número de Documento</Label>
              <Input
                id="numeroDocumento"
                placeholder="Ej: 001234"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa *</Label>
            <div className="flex gap-2">
              <Select value={empresaId} onValueChange={setEmpresaId} required>
                <SelectTrigger className="flex-1 bg-card">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {empresasData.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon">
                <Plus size={18} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto">Monto (CLP) *</Label>
            <Input
              id="monto"
              type="number"
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="detalle">Detalle</Label>
            <Textarea
              id="detalle"
              placeholder="Descripción adicional del gasto..."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
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
