import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmpresaModal } from '@/components/EmpresaModal';
import { ProyectoModal } from '@/components/ProyectoModal';
import { ColaboradorModal } from '@/components/ColaboradorModal';
import { empresasData as empresasDataMock, proyectosData, colaboradoresData, formatDateLong, Empresa, Proyecto, Colaborador } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Building2, FolderKanban, Users, Pencil, Trash2 } from 'lucide-react';
import { useEmpresas, useProyectos, useColaboradores, useSharePointAuth } from '@/hooks/useSharePoint';
import { toast } from '@/hooks/use-toast';

export default function Empresas() {
  const { isAuthenticated } = useSharePointAuth();
  const { empresas: empresasSharePoint, loading: loadingEmpresas, error: errorEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const { proyectos: proyectosSharePoint, loading: loadingProyectos, error: errorProyectos, createProyecto, deleteProyecto } = useProyectos();
  const { colaboradores: colaboradoresSharePoint, loading: loadingColaboradores, error: errorColaboradores, createColaborador, deleteColaborador } = useColaboradores();
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const empresas = isAuthenticated ? empresasSharePoint : empresasDataMock;
  const proyectos = isAuthenticated ? proyectosSharePoint : proyectosData;
  const colaboradores = isAuthenticated ? colaboradoresSharePoint : colaboradoresData;
  
  const [vista, setVista] = useState<'empresas' | 'proyectos' | 'colaboradores'>('empresas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | undefined>();
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | undefined>();
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [errorEmpresas, errorProyectos, errorColaboradores]);

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

  const handleSaveEmpresa = async (newEmpresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    try {
      if (editingEmpresa) {
        if (isAuthenticated) {
          await updateEmpresa(editingEmpresa.id, newEmpresa);
          toast({
            title: "Empresa actualizada",
            description: "La empresa se ha actualizado correctamente en SharePoint",
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

  const handleDelete = async (id: string) => {
    if (vista === 'empresas') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar empresas",
          variant: "destructive",
        });
        return;
      }
      
      if (confirm("¿Estás seguro de que deseas eliminar esta empresa?")) {
        try {
          await deleteEmpresa(id);
          toast({
            title: "Empresa eliminada",
            description: "La empresa se ha eliminado correctamente",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar la empresa",
            variant: "destructive",
          });
        }
      }
    } else if (vista === 'proyectos') {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar proyectos",
          variant: "destructive",
        });
        return;
      }
      
      if (confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        try {
          await deleteProyecto(id);
          toast({
            title: "Proyecto eliminado",
            description: "El proyecto se ha eliminado correctamente",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar el proyecto",
            variant: "destructive",
          });
        }
      }
    } else {
      if (!isAuthenticated) {
        toast({
          title: "No autenticado",
          description: "Por favor, inicia sesión para eliminar colaboradores",
          variant: "destructive",
        });
        return;
      }
      
      if (confirm("¿Estás seguro de que deseas eliminar este colaborador?")) {
        try {
          await deleteColaborador(id);
          toast({
            title: "Colaborador eliminado",
            description: "El colaborador se ha eliminado correctamente",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Error al eliminar el colaborador",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleSaveProyecto = async (newProyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated) {
        await createProyecto(newProyecto);
        toast({
          title: "Proyecto guardado",
          description: "El proyecto se ha guardado correctamente en SharePoint",
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

  return (
    <Layout onNewGasto={() => setModalOpen(true)}>
      <PageHeader 
        title={vista === 'empresas' ? 'Empresas' : vista === 'proyectos' ? 'Proyectos' : 'Colaboradores'} 
        subtitle={vista === 'empresas' ? `${empresas.length} empresas activas` : vista === 'proyectos' ? `${proyectos.length} proyectos activos` : `${colaboradores.length} colaboradores activos`}
        action={{ 
          label: vista === 'empresas' ? 'Nueva Empresa' : vista === 'proyectos' ? 'Nuevo Proyecto' : 'Nuevo Colaborador', 
          onClick: () => setModalOpen(true) 
        }}
      />

      {/* Toggle Empresas/Proyectos/Colaboradores */}
      <div className="bg-card rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-border">
        <ToggleGroup type="single" value={vista} onValueChange={(value) => value && setVista(value as 'empresas' | 'proyectos' | 'colaboradores')} className="flex-col sm:flex-row justify-start w-full sm:w-auto">
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
        </ToggleGroup>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={vista === 'empresas' ? 'Buscar por razón social o RUT...' : vista === 'proyectos' ? 'Buscar por nombre del proyecto...' : 'Buscar por nombre, email o cargo...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm sm:text-base">{vista === 'empresas' ? 'Empresas Activas' : vista === 'proyectos' ? 'Proyectos Activos' : 'Colaboradores Activos'}</h3>
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
          ) : (
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
          )}
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
      ) : (
        <ColaboradorModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingColaborador(undefined);
          }}
          onSave={handleSaveColaborador}
          colaborador={editingColaborador}
        />
      )}
    </Layout>
  );
}
