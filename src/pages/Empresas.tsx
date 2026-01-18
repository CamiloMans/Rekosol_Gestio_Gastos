import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmpresaModal } from '@/components/EmpresaModal';
import { empresasData, formatDateLong, Empresa } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Building2, Pencil, Trash2 } from 'lucide-react';

export default function Empresas() {
  const [modalOpen, setModalOpen] = useState(false);
  const [empresas, setEmpresas] = useState(empresasData);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmpresas = empresas.filter(empresa => 
    empresa.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.rut.includes(searchTerm)
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
    setEmpresas(empresas.filter(e => e.id !== id));
  };

  return (
    <Layout>
      <PageHeader 
        title="Empresas" 
        subtitle={`${empresas.length} empresas activas`}
        action={{ label: 'Nueva Empresa', onClick: () => setModalOpen(true) }}
      />

      {/* Search */}
      <div className="bg-card rounded-xl p-4 mb-6 shadow-sm border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar por razón social o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Empresas Activas</h3>
        </div>
        <Table>
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
        </Table>
      </div>

      <EmpresaModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEmpresa(undefined);
        }}
        onSave={handleSaveEmpresa}
        empresa={editingEmpresa}
      />
    </Layout>
  );
}
