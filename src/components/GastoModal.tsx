import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { categorias as categoriasMock, empresasData as empresasDataMock, proyectosData, Gasto, Proyecto, Empresa } from '@/data/mockData';
import { Save, Plus, Paperclip, Search } from 'lucide-react';
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
  
  // Estados
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
  const [filtroCategoriaEmpresa, setFiltroCategoriaEmpresa] = useState<'Empresa' | 'Persona Natural' | 'all'>('all');
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('');
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const proyectos = isAuthenticated ? (proyectosSharePoint || []) : proyectosData;
  const todasLasEmpresas = isAuthenticated ? (empresasSharePoint || []) : empresasDataMock;
  
  // Filtrar empresas según la categoría seleccionada y la búsqueda
  const empresas = useMemo(() => {
    let empresasFiltradas = todasLasEmpresas;
    
    // Filtrar por categoría
    if (filtroCategoriaEmpresa !== 'all') {
      empresasFiltradas = empresasFiltradas.filter(emp => emp.categoria === filtroCategoriaEmpresa);
    }
    
    // Filtrar por búsqueda
    if (busquedaEmpresa.trim() !== '') {
      const busquedaLower = busquedaEmpresa.toLowerCase().trim();
      empresasFiltradas = empresasFiltradas.filter(emp => 
        emp.razonSocial.toLowerCase().includes(busquedaLower) ||
        emp.rut.toLowerCase().includes(busquedaLower)
      );
    }
    
    return empresasFiltradas;
  }, [todasLasEmpresas, filtroCategoriaEmpresa, busquedaEmpresa]);
  
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
      setFiltroCategoriaEmpresa('all');
      setBusquedaEmpresa('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gasto, open]); // categorias está en useMemo, no necesita estar en dependencias
  
  // Auto-seleccionar "Persona Natural" cuando se selecciona la categoría "Honorarios"
  useEffect(() => {
    if (categoria) {
      const categoriaSeleccionada = categorias.find(cat => String(cat.id) === String(categoria));
      if (categoriaSeleccionada && categoriaSeleccionada.nombre === 'Honorarios') {
        setFiltroCategoriaEmpresa('Persona Natural');
      }
    }
  }, [categoria, categorias]);
  
  // Resetear el filtro y la empresa seleccionada cuando cambia el filtro
  useEffect(() => {
    if (filtroCategoriaEmpresa !== 'all' && empresaId) {
      const empresaSeleccionada = todasLasEmpresas.find(e => e.id === empresaId);
      if (empresaSeleccionada && empresaSeleccionada.categoria !== filtroCategoriaEmpresa) {
        setEmpresaId('');
      }
    }
  }, [filtroCategoriaEmpresa, todasLasEmpresas, empresaId]);

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
            <div className="space-y-2 min-w-0">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full h-10 min-w-0"
                style={{ 
                  WebkitAppearance: 'none', 
                  appearance: 'none',
                  minWidth: 0,
                  maxWidth: '100%'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select value={String(categoria)} onValueChange={(value) => setCategoria(value)} required>
                <SelectTrigger className="bg-card w-full h-10">
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
              value={tipoDocumento || undefined} 
              onValueChange={(value) => setTipoDocumento(value)} 
              required
            >
              <SelectTrigger className="bg-card" id="tipoDocumento">
                <SelectValue placeholder="Seleccionar documento" />
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
            {(() => {
              const tipoSeleccionado = tiposDocumento.find(t => t.id === tipoDocumento);
              const esOtros = tipoSeleccionado?.nombre === 'Otros' || tipoSeleccionado?.nombre === 'Otro';
              return esOtros && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="comentarioTipoDocumento">Especificar tipo de documento *</Label>
                  <Input
                    id="comentarioTipoDocumento"
                    placeholder="Ej: NOTA DE CRÉDITO, RECIBO, ETC."
                    value={comentarioTipoDocumento}
                    onChange={(e) => setComentarioTipoDocumento(e.target.value.toUpperCase())}
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              );
            })()}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="empresa">Empresa *</Label>
              <ToggleGroup 
                type="single" 
                value={filtroCategoriaEmpresa} 
                onValueChange={(value) => {
                  if (value) {
                    setFiltroCategoriaEmpresa(value as 'Empresa' | 'Persona Natural' | 'all');
                  } else {
                    setFiltroCategoriaEmpresa('all');
                  }
                }}
                className="h-8"
              >
                <ToggleGroupItem value="all" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-muted">
                  Todas
                </ToggleGroupItem>
                <ToggleGroupItem value="Empresa" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-muted">
                  Empresa
                </ToggleGroupItem>
                <ToggleGroupItem value="Persona Natural" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-muted">
                  Persona Natural
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex gap-2">
              <Select value={String(empresaId || '')} onValueChange={(value) => setEmpresaId(value)} required>
                <SelectTrigger className="flex-1 bg-card">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent className="bg-card p-0">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Buscar empresa..."
                      value={busquedaEmpresa}
                      onChange={(e) => {
                        e.stopPropagation();
                        setBusquedaEmpresa(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {empresas.length > 0 ? (
                      empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={String(empresa.id)}>
                          {empresa.razonSocial}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        {busquedaEmpresa.trim() !== '' 
                          ? 'No se encontraron empresas con ese criterio'
                          : 'No hay empresas disponibles para esta categoría'}
                      </div>
                    )}
                  </div>
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
              placeholder="DESCRIPCIÓN ADICIONAL DEL GASTO..."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value.toUpperCase())}
              rows={3}
              style={{ textTransform: 'uppercase' }}
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
