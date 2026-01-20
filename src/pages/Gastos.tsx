import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { CategoryBadge } from '@/components/CategoryBadge';
import { GastoModal } from '@/components/GastoModal';
import { gastosData, empresasData as empresasDataMock, categorias, colaboradoresData, formatCurrency, formatDate, Gasto } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Filter, Pencil, Trash2, FileText, Paperclip } from 'lucide-react';
import { DocumentoViewer } from '@/components/DocumentoViewer';
import { useGastos, useEmpresas, useSharePointAuth } from '@/hooks/useSharePoint';
import { toast } from '@/hooks/use-toast';

export default function Gastos() {
  const { isAuthenticated } = useSharePointAuth();
  const { gastos: gastosSharePoint, loading: loadingGastos, error: errorGastos, createGasto, updateGasto, deleteGasto } = useGastos();
  const { empresas: empresasSharePoint, loading: loadingEmpresas } = useEmpresas();
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const gastos = isAuthenticated ? gastosSharePoint : gastosData;
  const empresasData = isAuthenticated ? empresasSharePoint : empresasDataMock;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [filterTipoDoc, setFilterTipoDoc] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [documentoViewerOpen, setDocumentoViewerOpen] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<{ nombre: string; url: string; tipo: string } | undefined>();

  // Mostrar errores
  useEffect(() => {
    if (errorGastos) {
      toast({
        title: "Error",
        description: errorGastos.message,
        variant: "destructive",
      });
    }
  }, [errorGastos]);

  const filteredGastos = gastos.filter(gasto => {
    const empresa = empresasData.find(e => e.id === gasto.empresaId);
    const matchesSearch = 
      empresa?.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gasto.numeroDocumento.includes(searchTerm) ||
      gasto.detalle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = filterCategoria === 'all' || gasto.categoria === filterCategoria;
    const matchesEmpresa = filterEmpresa === 'all' || gasto.empresaId === filterEmpresa;
    const matchesTipoDoc = filterTipoDoc === 'all' || gasto.tipoDocumento === filterTipoDoc;
    
    // Filtrar por mes
    let matchesMes = true;
    if (filterMes !== 'all') {
      const fechaGasto = new Date(gasto.fecha);
      const mesGasto = `${fechaGasto.getFullYear()}-${String(fechaGasto.getMonth() + 1).padStart(2, '0')}`;
      matchesMes = mesGasto === filterMes;
    }

    return matchesSearch && matchesCategoria && matchesEmpresa && matchesTipoDoc && matchesMes;
  });

  // Obtener meses únicos de los gastos para el filtro
  const mesesDisponibles = useMemo(() => {
    const mesesSet = new Set<string>();
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesLabel = fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      mesesSet.add(`${mesKey}|${mesLabel}`);
    });
    return Array.from(mesesSet)
      .map(m => {
        const [key, label] = m.split('|');
        return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
      })
      .sort((a, b) => b.key.localeCompare(a.key)); // Ordenar de más reciente a más antiguo
  }, [gastos]);

  const handleSaveGasto = async (newGasto: Omit<Gasto, 'id'>) => {
    try {
      if (editingGasto) {
        if (isAuthenticated) {
          await updateGasto(editingGasto.id, newGasto);
        } else {
          // Fallback a datos mock si no está autenticado
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      } else {
        if (isAuthenticated) {
          await createGasto(newGasto);
          toast({
            title: "Gasto guardado",
            description: "El gasto se ha guardado correctamente en SharePoint",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      }
      setEditingGasto(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el gasto",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAuthenticated) {
      toast({
        title: "No autenticado",
        description: "Por favor, inicia sesión para eliminar gastos",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
      try {
        await deleteGasto(id);
        toast({
          title: "Gasto eliminado",
          description: "El gasto se ha eliminado correctamente",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al eliminar el gasto",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Layout onNewGasto={() => setModalOpen(true)}>
      <PageHeader 
        title="Gastos" 
        subtitle={
          loadingGastos 
            ? "Cargando gastos..." 
            : `${filteredGastos.length} gastos encontrados${isAuthenticated ? ' (SharePoint)' : ' (Datos locales)'}`
        }
        action={{ label: 'Nuevo Gasto', onClick: () => setModalOpen(true) }}
      />

      {/* Filters */}
      <div className="bg-card rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Buscar gasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className={`flex items-center gap-2 px-3 py-2 h-10 rounded-md transition-colors whitespace-nowrap ${
              filtrosAbiertos 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            <Filter size={16} className={filtrosAbiertos ? 'text-primary-foreground' : 'text-muted-foreground'} />
            <span className={`font-medium text-sm ${filtrosAbiertos ? 'text-primary-foreground' : 'text-foreground'}`}>Filtros</span>
          </button>
        </div>
        {filtrosAbiertos && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 animate-fade-in">
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Todas las empresas" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todas las empresas</SelectItem>
              {empresasData.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.razonSocial}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipoDoc} onValueChange={setFilterTipoDoc}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="Factura">Factura</SelectItem>
              <SelectItem value="Boleta">Boleta</SelectItem>
              <SelectItem value="Orden de Compra">Orden de Compra</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterMes} onValueChange={setFilterMes}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Todos los meses" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todos los meses</SelectItem>
              {mesesDisponibles.map((mes) => (
                <SelectItem key={mes.key} value={mes.key}>{mes.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">FECHA</TableHead>
              <TableHead className="font-semibold">EMPRESA</TableHead>
              <TableHead className="font-semibold">CATEGORÍA</TableHead>
              <TableHead className="font-semibold">DOCUMENTO</TableHead>
              <TableHead className="font-semibold text-right">MONTO</TableHead>
              <TableHead className="font-semibold text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGastos.map((gasto) => {
              const empresa = empresasData.find(e => e.id === gasto.empresaId);
              const colaborador = gasto.colaboradorId ? colaboradoresData.find(c => c.id === gasto.colaboradorId) : null;
              return (
                <TableRow key={gasto.id} className="animate-fade-in">
                  <TableCell>
                    <div>
                      {colaborador && (
                        <p className="font-medium text-sm mb-1">{colaborador.nombre}</p>
                      )}
                      <p className="text-muted-foreground">{formatDate(gasto.fecha)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{empresa?.razonSocial}</p>
                      <p className="text-sm text-muted-foreground">{empresa?.rut}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge categoryId={gasto.categoria} />
                  </TableCell>
                  <TableCell>
                    {gasto.archivosAdjuntos && gasto.archivosAdjuntos.length > 0 ? (
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{gasto.tipoDocumento}</p>
                        <p className="text-xs text-muted-foreground">#{gasto.numeroDocumento}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gasto.archivosAdjuntos.map((archivo, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setDocumentoSeleccionado(archivo);
                                setDocumentoViewerOpen(true);
                              }}
                            >
                              <Paperclip size={12} />
                              <span className="truncate max-w-[100px]">{archivo.nombre}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{gasto.tipoDocumento}</p>
                        <p className="text-sm text-muted-foreground">#{gasto.numeroDocumento}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <FileText size={12} />
                          Sin adjuntos
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(gasto.monto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(gasto)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(gasto.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      <GastoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGasto(undefined);
        }}
        onSave={handleSaveGasto}
        gasto={editingGasto}
      />

      <DocumentoViewer
        open={documentoViewerOpen}
        onClose={() => {
          setDocumentoViewerOpen(false);
          setDocumentoSeleccionado(undefined);
        }}
        archivo={documentoSeleccionado}
      />
    </Layout>
  );
}
