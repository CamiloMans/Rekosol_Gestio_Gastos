import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmpresaModal } from '@/components/EmpresaModal';
import { ProyectoModal } from '@/components/ProyectoModal';
import { ColaboradorModal } from '@/components/ColaboradorModal';
import { CategoriaModal } from '@/components/CategoriaModal';
import { TipoDocumentoModal } from '@/components/TipoDocumentoModal';
import { empresasData as empresasDataMock, proyectosData, colaboradoresData, formatDateLong, Empresa, Proyecto, Colaborador } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Building2, FolderKanban, Users, Tag, FileText, Pencil, Trash2 } from 'lucide-react';
import { useEmpresas, useProyectos, useColaboradores, useCategorias, useTiposDocumento, useSharePointAuth } from '@/hooks/useSharePoint';
import { toast } from '@/hooks/use-toast';
import { categoriasService } from '@/services/sharepointService';
import type { Categoria, TipoDocumento } from '@/services/sharepointService';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ColorPicker } from '@/components/ColorPicker';

export default function Empresas() {
  const { isAuthenticated } = useSharePointAuth();
  const { empresas: empresasSharePoint, loading: loadingEmpresas, error: errorEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const { proyectos: proyectosSharePoint, loading: loadingProyectos, error: errorProyectos, createProyecto, deleteProyecto } = useProyectos();
  const { colaboradores: colaboradoresSharePoint, loading: loadingColaboradores, error: errorColaboradores, createColaborador, deleteColaborador } = useColaboradores();
  const { categorias: categoriasSharePoint, loading: loadingCategorias, error: errorCategorias, createCategoria, updateCategoria, deleteCategoria } = useCategorias();
  const { tiposDocumento: tiposDocumentoSharePoint, loading: loadingTiposDocumento, error: errorTiposDocumento, createTipoDocumento, updateTipoDocumento, deleteTipoDocumento } = useTiposDocumento();
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const empresas = isAuthenticated ? empresasSharePoint : empresasDataMock;
  const proyectos = isAuthenticated ? proyectosSharePoint : proyectosData;
  const colaboradores = isAuthenticated ? colaboradoresSharePoint : colaboradoresData;
  const categorias = isAuthenticated ? categoriasSharePoint : [];
  const tiposDocumento = isAuthenticated ? tiposDocumentoSharePoint : [];
  
  const [vista, setVista] = useState<'empresas' | 'proyectos' | 'colaboradores' | 'categorias' | 'tiposDocumento'>('empresas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | undefined>();
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | undefined>();
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | undefined>();
  const [editingCategoria, setEditingCategoria] = useState<Categoria | undefined>();
  const [editingTipoDocumento, setEditingTipoDocumento] = useState<TipoDocumento | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  // Mostrar errores
  useEffect(() => {
    if (errorEmpresas) {
      toast({
        title: "Error",
        description: errorEmpresas.message,
        variant: "destructive",
      });
    }
    if (errorProyectos) {
      toast({
        title: "Error",
        description: errorProyectos.message,
        variant: "destructive",
      });
    }
    if (errorColaboradores) {
      toast({
        title: "Error",
        description: errorColaboradores.message,
        variant: "destructive",
      });
    }
    if (errorCategorias) {
      toast({
        title: "Error",
        description: errorCategorias.message,
        variant: "destructive",
      });
    }
    if (errorTiposDocumento) {
      toast({
        title: "Error",
        description: errorTiposDocumento.message,
        variant: "destructive",
      });
    }
  }, [errorEmpresas, errorProyectos, errorColaboradores, errorCategorias, errorTiposDocumento]);

  const filteredEmpresas = empresas.filter(empresa => 
    empresa.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.rut.includes(searchTerm)
  );

  const filteredProyectos = proyectos.filter(proyecto =>
    proyecto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredColaboradores = colaboradores.filter(colaborador =>
    colaborador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colaborador.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colaborador.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar tipos de documento alfabéticamente, pero "Otro" o "Otros" siempre al final
  const tiposDocumentoOrdenados = useMemo(() => {
    return [...tiposDocumento].sort((a, b) => {
      const nombreA = a.nombre.toLowerCase();
      const nombreB = b.nombre.toLowerCase();
      
      // Si uno es "Otro" o "Otros", va al final
      const esOtroA = nombreA === 'otro' || nombreA === 'otros';
      const esOtroB = nombreB === 'otro' || nombreB === 'otros';
      
      if (esOtroA && !esOtroB) return 1; // A va después
      if (!esOtroA && esOtroB) return -1; // B va después
      if (esOtroA && esOtroB) return 0; // Ambos son "Otro", mantener orden
      
      // Ordenar alfabéticamente
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });
  }, [tiposDocumento]);
  
  const filteredTiposDocumento = tiposDocumentoOrdenados.filter(tipo =>
    tipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveEmpresa = async (newEmpresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    try {
      if (editingEmpresa) {
        if (isAuthenticated) {
          await updateEmpresa(editingEmpresa.id, newEmpresa);
          toast({
            title: "Empresa actualizada",
            description: "La empresa se ha actualizado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      } else {
        if (isAuthenticated) {
          await createEmpresa(newEmpresa);
          toast({
            title: "Empresa guardada",
            description: "La empresa se ha guardado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      }
      setEditingEmpresa(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar la empresa",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (vista === 'empresas') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar empresas",
          variant: "destructive",
        });
        return;
      }
      
      setConfirmTitle("Eliminar empresa");
      setConfirmDescription("¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.");
      setConfirmAction(async () => {
        try {
          await deleteEmpresa(id);
          toast({
            title: "Empresa eliminada",
            description: "La empresa se ha eliminado correctamente",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar la empresa",
            variant: "destructive",
          });
        }
      });
      setConfirmDialogOpen(true);
    } else if (vista === 'proyectos') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar proyectos",
          variant: "destructive",
        });
        return;
      }
      
      setConfirmTitle("Eliminar proyecto");
      setConfirmDescription("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.");
      setConfirmAction(async () => {
        try {
          await deleteProyecto(id);
          toast({
            title: "Proyecto eliminado",
            description: "El proyecto se ha eliminado correctamente",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar el proyecto",
            variant: "destructive",
          });
        }
      });
      setConfirmDialogOpen(true);
    } else if (vista === 'colaboradores') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar colaboradores",
          variant: "destructive",
        });
        return;
      }
      
      setConfirmTitle("Eliminar colaborador");
      setConfirmDescription("¿Estás seguro de que deseas eliminar este colaborador? Esta acción no se puede deshacer.");
      setConfirmAction(async () => {
        try {
          await deleteColaborador(id);
          toast({
            title: "Colaborador eliminado",
            description: "El colaborador se ha eliminado correctamente",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar el colaborador",
            variant: "destructive",
          });
        }
      });
      setConfirmDialogOpen(true);
    } else if (vista === 'categorias') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar categorías",
          variant: "destructive",
        });
        return;
      }
      
      setConfirmTitle("Eliminar categoría");
      setConfirmDescription("¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.");
      setConfirmAction(async () => {
        try {
          await deleteCategoria(id);
          toast({
            title: "Categoría eliminada",
            description: "La categoría se ha eliminado correctamente",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar la categoría",
            variant: "destructive",
          });
        }
      });
      setConfirmDialogOpen(true);
    } else if (vista === 'tiposDocumento') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar tipos de documento",
          variant: "destructive",
        });
        return;
      }
      
      setConfirmTitle("Eliminar tipo de documento");
      setConfirmDescription("¿Estás seguro de que deseas eliminar este tipo de documento? Esta acción no se puede deshacer.");
      setConfirmAction(async () => {
        try {
          await deleteTipoDocumento(id);
          toast({
            title: "Tipo de documento eliminado",
            description: "El tipo de documento se ha eliminado correctamente",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar el tipo de documento",
            variant: "destructive",
          });
        }
      });
      setConfirmDialogOpen(true);
    }
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await confirmAction();
      setConfirmAction(null);
    }
  };

  const handleSaveProyecto = async (newProyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated) {
        await createProyecto(newProyecto);
        toast({
          title: "Proyecto guardado",
          description: "El proyecto se ha guardado correctamente en SharePoint",
          variant: "success",
        });
      } else {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para guardar en SharePoint",
          variant: "destructive",
        });
      }
      setEditingProyecto(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el proyecto",
        variant: "destructive",
      });
    }
  };

  const handleEditProyecto = (proyecto: Proyecto) => {
    setEditingProyecto(proyecto);
    setModalOpen(true);
  };

  const handleSaveColaborador = async (newColaborador: Omit<Colaborador, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated) {
        await createColaborador(newColaborador);
        toast({
          title: "Colaborador guardado",
          description: "El colaborador se ha guardado correctamente en SharePoint",
        });
      } else {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para guardar en SharePoint",
          variant: "destructive",
        });
      }
      setEditingColaborador(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el colaborador",
        variant: "destructive",
      });
    }
  };

  const handleEditColaborador = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setModalOpen(true);
  };

  const handleSaveCategoria = async (newCategoria: Omit<Categoria, 'id'>) => {
    try {
      if (editingCategoria) {
        if (isAuthenticated) {
          await updateCategoria(editingCategoria.id, newCategoria);
          toast({
            title: "Categoría actualizada",
            description: "La categoría se ha actualizado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      } else {
        if (isAuthenticated) {
          await createCategoria(newCategoria);
          toast({
            title: "Categoría guardada",
            description: "La categoría se ha guardado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      }
      setEditingCategoria(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleEditCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setModalOpen(true);
  };

  const handleSaveTipoDocumento = async (newTipoDocumento: Omit<TipoDocumento, 'id'>) => {
    try {
      if (editingTipoDocumento) {
        if (isAuthenticated) {
          await updateTipoDocumento(editingTipoDocumento.id, newTipoDocumento);
          toast({
            title: "Tipo de documento actualizado",
            description: "El tipo de documento se ha actualizado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      } else {
        if (isAuthenticated) {
          await createTipoDocumento(newTipoDocumento);
          toast({
            title: "Tipo de documento guardado",
            description: "El tipo de documento se ha guardado correctamente en SharePoint",
            variant: "success",
          });
        } else {
          toast({
            title: "No autenticado",
            description: "Por favor, inicia sesión para guardar en SharePoint",
            variant: "destructive",
          });
        }
      }
      setEditingTipoDocumento(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el tipo de documento",
        variant: "destructive",
      });
    }
  };

  const handleEditTipoDocumento = (tipoDocumento: TipoDocumento) => {
    setEditingTipoDocumento(tipoDocumento);
    setModalOpen(true);
  };

  // Función para actualizar los colores de las categorías desde los datos locales
  const handleUpdateCategoriasColors = async () => {
    if (!isAuthenticated) {
      toast({
        title: "No autenticado",
        description: "Por favor, inicia sesión para actualizar los colores",
        variant: "destructive",
      });
      return;
    }

    setConfirmTitle("Actualizar colores de categorías");
    setConfirmDescription("¿Deseas actualizar los colores de todas las categorías con los colores predeterminados?");
    setConfirmAction(async () => {
      try {
        await categoriasService.updateCategoriasColors();
        toast({
          title: "Colores actualizados",
          description: "Los colores de las categorías se han actualizado correctamente en SharePoint",
          variant: "success",
        });
        // Recargar las categorías para ver los cambios
        window.location.reload();
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al actualizar los colores",
          variant: "destructive",
        });
      }
    });
    setConfirmDialogOpen(true);
  };

  return (
    <Layout onNewGasto={() => setModalOpen(true)}>
      <PageHeader 
        title={vista === 'empresas' ? 'Empresas' : vista === 'proyectos' ? 'Proyectos' : vista === 'colaboradores' ? 'Colaboradores' : vista === 'categorias' ? 'Categorías' : 'Tipos de Documento'} 
        subtitle={vista === 'empresas' ? `${empresas.length} empresas activas` : vista === 'proyectos' ? `${proyectos.length} proyectos activos` : vista === 'colaboradores' ? `${colaboradores.length} colaboradores activos` : vista === 'categorias' ? `${categorias.length} categorías activas` : `${tiposDocumento.length} tipos de documento activos`}
        action={{
          label: vista === 'empresas' ? 'Nueva Empresa' : vista === 'proyectos' ? 'Nuevo Proyecto' : vista === 'colaboradores' ? 'Nuevo Colaborador' : vista === 'categorias' ? 'Nueva Categoría' : 'Nuevo Tipo de Documento', 
          onClick: () => setModalOpen(true) 
        }}
      />

      {/* Toggle Empresas/Proyectos/Colaboradores/Categorías/Tipos de Documento */}
      <div className="bg-card rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-border">
        <ToggleGroup type="single" value={vista} onValueChange={(value) => value && setVista(value as 'empresas' | 'proyectos' | 'colaboradores' | 'categorias' | 'tiposDocumento')} className="flex-col sm:flex-row justify-start w-full sm:w-auto">
          <ToggleGroupItem value="empresas" aria-label="Ver empresas" className="w-full sm:w-auto">
            <Building2 size={16} className="sm:w-[18px] sm:h-[18px] mr-2" />
            <span className="text-sm sm:text-base">Empresas</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="proyectos" aria-label="Ver proyectos" className="w-full sm:w-auto">
            <FolderKanban size={16} className="sm:w-[18px] sm:h-[18px] mr-2" />
            <span className="text-sm sm:text-base">Proyectos</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="colaboradores" aria-label="Ver colaboradores" className="w-full sm:w-auto">
            <Users size={16} className="sm:w-[18px] sm:h-[18px] mr-2" />
            <span className="text-sm sm:text-base">Colaboradores</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="categorias" aria-label="Ver categorías" className="w-full sm:w-auto">
            <Tag size={16} className="sm:w-[18px] sm:h-[18px] mr-2" />
            <span className="text-sm sm:text-base">Categorías</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="tiposDocumento" aria-label="Ver tipos de documento" className="w-full sm:w-auto">
            <FileText size={16} className="sm:w-[18px] sm:h-[18px] mr-2" />
            <span className="text-sm sm:text-base">Documentos</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={vista === 'empresas' ? 'Buscar por razón social o RUT...' : vista === 'proyectos' ? 'Buscar por nombre del proyecto...' : vista === 'colaboradores' ? 'Buscar por nombre, email o cargo...' : vista === 'categorias' ? 'Buscar por nombre de categoría...' : 'Buscar por nombre de tipo de documento...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm sm:text-base">{vista === 'empresas' ? 'Empresas Activas' : vista === 'proyectos' ? 'Proyectos Activos' : vista === 'colaboradores' ? 'Colaboradores Activos' : vista === 'categorias' ? 'Categorías Activas' : 'Tipos de Documento Activos'}</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
          {vista === 'empresas' ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">EMPRESA</TableHead>
                  <TableHead className="font-semibold">RUT</TableHead>
                  <TableHead className="font-semibold">CREADA</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.map((empresa) => (
                  <TableRow key={empresa.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 size={18} className="text-muted-foreground" />
                        </div>
                        <span className="font-medium">{empresa.razonSocial}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{empresa.rut}</TableCell>
                    <TableCell>{formatDateLong(empresa.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(empresa.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : vista === 'proyectos' ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">PROYECTO</TableHead>
                  <TableHead className="font-semibold">CREADO</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProyectos.map((proyecto) => (
                  <TableRow key={proyecto.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <FolderKanban size={18} className="text-muted-foreground" />
                        </div>
                        <span className="font-medium">{proyecto.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateLong(proyecto.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProyecto(proyecto)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(proyecto.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : vista === 'colaboradores' ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">COLABORADOR</TableHead>
                  <TableHead className="font-semibold">EMAIL</TableHead>
                  <TableHead className="font-semibold">TELÉFONO</TableHead>
                  <TableHead className="font-semibold">CARGO</TableHead>
                  <TableHead className="font-semibold">CREADO</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => (
                  <TableRow key={colaborador.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Users size={18} className="text-muted-foreground" />
                        </div>
                        <span className="font-medium">{colaborador.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{colaborador.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{colaborador.telefono || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{colaborador.cargo || '-'}</TableCell>
                    <TableCell>{formatDateLong(colaborador.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditColaborador(colaborador)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(colaborador.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : vista === 'categorias' ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">CATEGORÍA</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.map((categoria) => (
                  <TableRow key={categoria.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ColorPicker
                          currentColor={categoria.color || 'bg-muted'}
                          onColorChange={async (newColor) => {
                            try {
                              await updateCategoria(categoria.id, {
                                nombre: categoria.nombre,
                                color: newColor,
                              });
                              toast({
                                title: "Color actualizado",
                                description: "El color de la categoría se ha actualizado correctamente",
                                variant: "success",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: error instanceof Error ? error.message : "Error al actualizar el color",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={!isAuthenticated}
                        />
                        <span className="font-medium">{categoria.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategoria(categoria)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(categoria.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : vista === 'tiposDocumento' ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">TIPO DE DOCUMENTO</TableHead>
                  <TableHead className="font-semibold text-center">TIENE IMPUESTOS</TableHead>
                  <TableHead className="font-semibold text-center">VALOR IMPUESTOS</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiposDocumento.length > 0 ? (
                  filteredTiposDocumento.map((tipo) => (
                    <TableRow key={tipo.id} className="animate-fade-in">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText size={18} className="text-muted-foreground" />
                          </div>
                          <span className="font-medium">{tipo.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {tipo.tieneImpuestos ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {tipo.tieneImpuestos && tipo.valorImpuestos !== undefined ? (
                          <span className="font-medium">
                            {(tipo.valorImpuestos * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTipoDocumento(tipo)}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo.id)}>
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      {loadingTiposDocumento ? 'Cargando tipos de documento...' : 'No hay tipos de documento disponibles'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          ) : null}
        </Table>
        </div>
      </div>

      {vista === 'empresas' ? (
        <EmpresaModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEmpresa(undefined);
          }}
          onSave={handleSaveEmpresa}
          empresa={editingEmpresa}
        />
      ) : vista === 'proyectos' ? (
        <ProyectoModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingProyecto(undefined);
          }}
          onSave={handleSaveProyecto}
          proyecto={editingProyecto}
        />
      ) : vista === 'colaboradores' ? (
        <ColaboradorModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingColaborador(undefined);
          }}
          onSave={handleSaveColaborador}
          colaborador={editingColaborador}
        />
      ) : vista === 'categorias' ? (
        <CategoriaModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategoria(undefined);
          }}
          onSave={handleSaveCategoria}
          categoria={editingCategoria}
        />
      ) : (
        <TipoDocumentoModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTipoDocumento(undefined);
          }}
          onSave={handleSaveTipoDocumento}
          tipoDocumento={editingTipoDocumento}
        />
      )}
      
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={confirmTitle}
        description={confirmDescription}
        onConfirm={handleConfirm}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </Layout>
  );
}
