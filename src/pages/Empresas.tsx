import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmpresaModal } from '@/components/EmpresaModal';
import { ProyectoModal } from '@/components/ProyectoModal';
import { ColaboradorModal } from '@/components/ColaboradorModal';
import { empresasData, proyectosData, colaboradoresData, formatDateLong, Empresa, Proyecto, Colaborador } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Building2, FolderKanban, Users, Pencil, Trash2 } from 'lucide-react';

export default function Empresas() {
  const [vista, setVista] = useState<'empresas' | 'proyectos' | 'colaboradores'>('empresas');
  const [modalOpen, setModalOpen] = useState(false);
  const [empresas, setEmpresas] = useState(empresasData);
  const [proyectos, setProyectos] = useState(proyectosData);
  const [colaboradores, setColaboradores] = useState(colaboradoresData);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | undefined>();
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | undefined>();
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleSaveEmpresa = (newEmpresa: Omit<Empresa, 'id' | 'createdAt'>) => {
    if (editingEmpresa) {
      setEmpresas(empresas.map(e => 
        e.id === editingEmpresa.id 
          ? { ...newEmpresa, id: editingEmpresa.id, createdAt: editingEmpresa.createdAt } 
          : e
      ));
    } else {
      setEmpresas([
        { 
          ...newEmpresa, 
          id: Date.now().toString(), 
          createdAt: new Date().toISOString().split('T')[0] 
        }, 
        ...empresas
      ]);
    }
    setEditingEmpresa(undefined);
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (vista === 'empresas') {
      setEmpresas(empresas.filter(e => e.id !== id));
    } else if (vista === 'proyectos') {
      setProyectos(proyectos.filter(p => p.id !== id));
    } else {
      setColaboradores(colaboradores.filter(c => c.id !== id));
    }
  };

  const handleSaveProyecto = (newProyecto: Omit<Proyecto, 'id' | 'createdAt'>) => {
    if (editingProyecto) {
      setProyectos(proyectos.map(p => 
        p.id === editingProyecto.id 
          ? { ...newProyecto, id: editingProyecto.id, createdAt: editingProyecto.createdAt } 
          : p
      ));
    } else {
      setProyectos([
        { 
          ...newProyecto, 
          id: Date.now().toString(), 
          createdAt: new Date().toISOString().split('T')[0] 
        }, 
        ...proyectos
      ]);
    }
    setEditingProyecto(undefined);
  };

  const handleEditProyecto = (proyecto: Proyecto) => {
    setEditingProyecto(proyecto);
    setModalOpen(true);
  };

  const handleSaveColaborador = (newColaborador: Omit<Colaborador, 'id' | 'createdAt'>) => {
    if (editingColaborador) {
      setColaboradores(colaboradores.map(c => 
        c.id === editingColaborador.id 
          ? { ...newColaborador, id: editingColaborador.id, createdAt: editingColaborador.createdAt } 
          : c
      ));
    } else {
      setColaboradores([
        { 
          ...newColaborador, 
          id: Date.now().toString(), 
          createdAt: new Date().toISOString().split('T')[0] 
        }, 
        ...colaboradores
      ]);
    }
    setEditingColaborador(undefined);
  };

  const handleEditColaborador = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setModalOpen(true);
  };

  return (
    <Layout>
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
