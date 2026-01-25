import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categorias as categoriasMock, empresasData as empresasDataMock, proyectosData, Gasto, Proyecto, Empresa } from '@/data/mockData';
import { Save, Plus, Paperclip } from 'lucide-react';
import { ProyectoModal } from './ProyectoModal';
import { EmpresaModal } from './EmpresaModal';
import { useProyectos, useEmpresas, useCategorias, useTiposDocumento, useSharePointAuth } from '@/hooks/useSharePoint';

interface GastoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (gasto: Omit<Gasto, 'id'>) => void;
  gasto?: Gasto;
}

const tiposDocumentoMock = ['Factura', 'Orden de Compra', 'Boleta', 'Sin Documento', 'Otros'] as const;

export function GastoModal({ open, onClose, onSave, gasto }: GastoModalProps) {
  const { isAuthenticated } = useSharePointAuth();
  const { proyectos: proyectosSharePoint, createProyecto: createProyectoSharePoint } = useProyectos();
  const { empresas: empresasSharePoint, createEmpresa: createEmpresaSharePoint } = useEmpresas();
  const { categorias: categoriasSharePoint } = useCategorias();
  const { tiposDocumento: tiposDocumentoSharePoint } = useTiposDocumento();
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const proyectos = isAuthenticated ? (proyectosSharePoint || []) : proyectosData;
  const empresas = isAuthenticated ? (empresasSharePoint || []) : empresasDataMock;
  
  // Mapear categorías de SharePoint al formato esperado (id, nombre, color)
  // Asegurar que los IDs sean strings para el componente Select
  // Usar useMemo para evitar recrear el array en cada render
  const categorias = useMemo(() => {
    if (isAuthenticated && categoriasSharePoint.length > 0) {
      return categoriasSharePoint.map(cat => ({
        id: String(cat.id), // Convertir a string para el Select
        nombre: cat.nombre,
        color: cat.color || `bg-category-${cat.id}`,
      }));
    }
    return categoriasMock;
  }, [isAuthenticated, categoriasSharePoint]);
  
  // Usar tipos de documento de SharePoint si está autenticado, sino usar datos mock
  // IMPORTANTE: Necesitamos los IDs para guardar en el campo lookup
  const tiposDocumento = useMemo(() => {
    if (isAuthenticated && tiposDocumentoSharePoint.length > 0) {
      return tiposDocumentoSharePoint.map(tipo => ({
        id: String(tipo.id), // Convertir a string para el Select
        nombre: tipo.nombre,
      }));
    }
    // Para datos mock, crear objetos con id y nombre
    return tiposDocumentoMock.map((nombre, index) => ({
      id: String(index + 1), // IDs temporales para mock
      nombre: nombre,
    }));
  }, [isAuthenticated, tiposDocumentoSharePoint]);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<string>(''); // Guardar el ID del tipo de documento
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [comentarioTipoDocumento, setComentarioTipoDocumento] = useState('');
  const [proyectoModalOpen, setProyectoModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  useEffect(() => {
    if (gasto) {
      setFecha(gasto.fecha);
      // La categoría viene como ID desde SharePoint (campo lookup)
      // Buscar la categoría por ID y asegurar que sea string
      // Usar categorias del scope actual (no en dependencias para evitar loop)
      const categoriaEncontrada = categorias.find(cat => String(cat.id) === String(gasto.categoria));
      setCategoria(categoriaEncontrada ? String(categoriaEncontrada.id) : String(gasto.categoria || ''));
      // tipoDocumento viene como ID desde SharePoint (campo lookup)
      setTipoDocumento(String(gasto.tipoDocumento || ''));
      setNumeroDocumento(gasto.numeroDocumento);
      setEmpresaId(gasto.empresaId);
      setProyectoId(gasto.proyectoId || '');
      setMonto(gasto.monto.toString());
      setDetalle(gasto.detalle || '');
      setComentarioTipoDocumento(gasto.comentarioTipoDocumento || '');
    } else {
      setFecha(new Date().toISOString().split('T')[0]);
      setCategoria('');
            setTipoDocumento(''); // Resetear a vacío, se seleccionará desde el dropdown
      setNumeroDocumento('');
      setEmpresaId('');
      setProyectoId('');
      setMonto('');
      setDetalle('');
      setComentarioTipoDocumento('');
      setArchivosAdjuntos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gasto, open]); // categorias está en useMemo, no necesita estar en dependencias

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para campos lookup en SharePoint, necesitamos guardar el ID, no el nombre
    // tipoDocumento ahora es el ID del tipo de documento
    const tipoDocumentoSeleccionado = tiposDocumento.find(t => t.id === tipoDocumento);
    const esOtros = tipoDocumentoSeleccionado?.nombre === 'Otros' || tipoDocumentoSeleccionado?.nombre === 'Otro';
    
    // Preparar archivos adjuntos: incluir el File object para poder subirlo a SharePoint
    const archivosFormateados = archivosAdjuntos.map(archivo => ({
      nombre: archivo.name,
      url: URL.createObjectURL(archivo),
      tipo: archivo.type || 'application/octet-stream',
      file: archivo, // Incluir el File object para subirlo a SharePoint
    }));
    
    console.log("💾 Guardando gasto con tipo de documento ID:", tipoDocumento, "tipo:", typeof tipoDocumento);
    onSave({
      fecha,
      categoria: categoria, // Guardar el ID para campos lookup
      tipoDocumento: tipoDocumento, // Guardar el ID del tipo de documento
      numeroDocumento,
      empresaId,
      proyectoId: proyectoId || undefined,
      monto: parseInt(monto),
      detalle,
      comentarioTipoDocumento: esOtros && comentarioTipoDocumento ? comentarioTipoDocumento : undefined,
      archivosAdjuntos: archivosFormateados.length > 0 ? archivosFormateados : undefined,
    });
    onClose();
  };

  const handleSaveProyecto = async (nuevoProyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated && createProyectoSharePoint) {
        // Guardar en SharePoint
        const proyectoCreado = await createProyectoSharePoint(nuevoProyecto);
        setProyectoId(proyectoCreado.id);
      } else {
        // Fallback a datos locales
        const proyectoCreado: Proyecto = {
          ...nuevoProyecto,
          id: Date.now().toString(),
          createdAt: new Date().toISOString().split('T')[0],
        };
        setProyectoId(proyectoCreado.id);
      }
      setProyectoModalOpen(false);
    } catch (error) {
      console.error("Error al guardar proyecto:", error);
      // En caso de error, usar fallback local
    const proyectoCreado: Proyecto = {
      ...nuevoProyecto,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProyectoId(proyectoCreado.id);
    setProyectoModalOpen(false);
    }
  };

  const handleSaveEmpresa = async (nuevaEmpresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated && createEmpresaSharePoint) {
        // Guardar en SharePoint
        const empresaCreada = await createEmpresaSharePoint(nuevaEmpresa);
        setEmpresaId(empresaCreada.id);
      } else {
        // Fallback a datos locales
        const empresaCreada: Empresa = {
          ...nuevaEmpresa,
          id: Date.now().toString(),
          createdAt: new Date().toISOString().split('T')[0],
        };
        setEmpresaId(empresaCreada.id);
      }
      setEmpresaModalOpen(false);
    } catch (error) {
      console.error("Error al guardar empresa:", error);
      // En caso de error, usar fallback local
    const empresaCreada: Empresa = {
      ...nuevaEmpresa,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEmpresaId(empresaCreada.id);
    setEmpresaModalOpen(false);
    }
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
              <Select value={String(proyectoId || '')} onValueChange={(value) => setProyectoId(value)}>
                <SelectTrigger className="flex-1 bg-card">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {proyectos.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={String(proyecto.id)}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Select value={String(categoria)} onValueChange={(value) => setCategoria(value)} required>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {categorias.length > 0 ? (
                    categorias.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No hay categorías disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <Select 
              value={tipoDocumento} 
              onValueChange={(value) => setTipoDocumento(value)} 
              required
            >
              <SelectTrigger className="bg-card" id="tipoDocumento">
                <SelectValue placeholder="Seleccionar tipo de documento" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {tiposDocumento.length > 0 ? (
                  tiposDocumento.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No hay tipos de documento disponibles
                  </SelectItem>
                )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Select value={String(empresaId || '')} onValueChange={(value) => setEmpresaId(value)} required>
                <SelectTrigger className="flex-1 bg-card">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
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
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setArchivosAdjuntos([...archivosAdjuntos, ...files]);
                  // Resetear el input para permitir seleccionar el mismo archivo nuevamente
                  e.target.value = '';
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
