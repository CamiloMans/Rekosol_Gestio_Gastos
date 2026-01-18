import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categorias, empresasData, proyectosData, Gasto, Proyecto, Empresa } from '@/data/mockData';
import { Save, Plus, Paperclip } from 'lucide-react';
import { ProyectoModal } from './ProyectoModal';
import { EmpresaModal } from './EmpresaModal';

interface GastoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (gasto: Omit<Gasto, 'id'>) => void;
  gasto?: Gasto;
}

const tiposDocumento = ['Factura', 'Orden de Compra', 'Boleta', 'Sin Documento', 'Otros'] as const;

export function GastoModal({ open, onClose, onSave, gasto }: GastoModalProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<typeof tiposDocumento[number]>('Factura');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [comentarioTipoDocumento, setComentarioTipoDocumento] = useState('');
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosData);
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasData);
  const [proyectoModalOpen, setProyectoModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  useEffect(() => {
    if (gasto) {
      setFecha(gasto.fecha);
      setCategoria(gasto.categoria);
      setTipoDocumento(gasto.tipoDocumento);
      setNumeroDocumento(gasto.numeroDocumento);
      setEmpresaId(gasto.empresaId);
      setProyectoId(gasto.proyectoId || '');
      setMonto(gasto.monto.toString());
      setDetalle(gasto.detalle || '');
      setComentarioTipoDocumento(gasto.comentarioTipoDocumento || '');
    } else {
      setFecha(new Date().toISOString().split('T')[0]);
      setCategoria('');
      setTipoDocumento('Factura');
      setNumeroDocumento('');
      setEmpresaId('');
      setProyectoId('');
      setMonto('');
      setDetalle('');
      setComentarioTipoDocumento('');
      setArchivosAdjuntos([]);
    }
  }, [gasto, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertir archivos nuevos a objetos con URL
    const archivosFormateados = archivosAdjuntos.map(archivo => ({
      nombre: archivo.name,
      url: URL.createObjectURL(archivo),
      tipo: archivo.type || 'application/octet-stream',
    }));
    
    onSave({
      fecha,
      categoria,
      tipoDocumento,
      numeroDocumento,
      empresaId,
      proyectoId: proyectoId || undefined,
      monto: parseInt(monto),
      detalle,
      comentarioTipoDocumento: tipoDocumento === 'Otros' && comentarioTipoDocumento ? comentarioTipoDocumento : undefined,
      archivosAdjuntos: archivosFormateados.length > 0 ? archivosFormateados : undefined,
    });
    onClose();
  };

  const handleSaveProyecto = (nuevoProyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    const proyectoCreado: Proyecto = {
      ...nuevoProyecto,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProyectos([...proyectos, proyectoCreado]);
    setProyectoId(proyectoCreado.id);
    setProyectoModalOpen(false);
  };

  const handleSaveEmpresa = (nuevaEmpresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    const empresaCreada: Empresa = {
      ...nuevaEmpresa,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEmpresas([...empresas, empresaCreada]);
    setEmpresaId(empresaCreada.id);
    setEmpresaModalOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {gasto ? 'Editar Gasto' : 'Nuevo Gasto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="proyecto">Proyecto</Label>
            <div className="flex gap-2">
              <Select value={proyectoId} onValueChange={setProyectoId}>
                <SelectTrigger className="flex-1 bg-card">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {proyectos.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setProyectoModalOpen(true)}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>

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
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <Select 
              value={tipoDocumento} 
              onValueChange={(value) => setTipoDocumento(value as typeof tiposDocumento[number])} 
              required
            >
              <SelectTrigger className="bg-card" id="tipoDocumento">
                <SelectValue placeholder="Seleccionar tipo de documento" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {tiposDocumento.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tipoDocumento === 'Otros' && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="comentarioTipoDocumento">Comentario *</Label>
                <Input
                  id="comentarioTipoDocumento"
                  placeholder="Especifica el tipo de documento..."
                  value={comentarioTipoDocumento}
                  onChange={(e) => setComentarioTipoDocumento(e.target.value)}
                  required
                />
              </div>
            )}
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
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setEmpresaModalOpen(true)}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto">Monto (CLP) *</Label>
            <div className="flex gap-2">
              <Input
                id="monto"
                type="number"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="flex-1"
              />
              <input
                type="file"
                id="archivosAdjuntos"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setArchivosAdjuntos([...archivosAdjuntos, ...files]);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('archivosAdjuntos')?.click()}
                title="Adjuntar documentos"
              >
                <Paperclip size={18} />
              </Button>
            </div>
            {archivosAdjuntos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {archivosAdjuntos.map((archivo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm"
                  >
                    <span className="truncate max-w-[200px]">{archivo.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => {
                        const nuevosArchivos = archivosAdjuntos.filter((_, i) => i !== index);
                        setArchivosAdjuntos(nuevosArchivos);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
      
      <ProyectoModal
        open={proyectoModalOpen}
        onClose={() => setProyectoModalOpen(false)}
        onSave={handleSaveProyecto}
      />
      
      <EmpresaModal
        open={empresaModalOpen}
        onClose={() => setEmpresaModalOpen(false)}
        onSave={handleSaveEmpresa}
      />
    </>
  );
}
