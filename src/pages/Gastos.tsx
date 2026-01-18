import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { CategoryBadge } from '@/components/CategoryBadge';
import { GastoModal } from '@/components/GastoModal';
import { gastosData, empresasData, categorias, formatCurrency, formatDate, Gasto } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Filter, Pencil, Trash2 } from 'lucide-react';

export default function Gastos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [gastos, setGastos] = useState(gastosData);
  const [editingGasto, setEditingGasto] = useState<Gasto | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [filterTipoDoc, setFilterTipoDoc] = useState('all');

  const filteredGastos = gastos.filter(gasto => {
    const empresa = empresasData.find(e => e.id === gasto.empresaId);
    const matchesSearch = 
      empresa?.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gasto.numeroDocumento.includes(searchTerm) ||
      gasto.detalle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = filterCategoria === 'all' || gasto.categoria === filterCategoria;
    const matchesEmpresa = filterEmpresa === 'all' || gasto.empresaId === filterEmpresa;
    const matchesTipoDoc = filterTipoDoc === 'all' || gasto.tipoDocumento === filterTipoDoc;

    return matchesSearch && matchesCategoria && matchesEmpresa && matchesTipoDoc;
  });

  const handleSaveGasto = (newGasto: Omit<Gasto, 'id'>) => {
    if (editingGasto) {
      setGastos(gastos.map(g => g.id === editingGasto.id ? { ...newGasto, id: editingGasto.id } : g));
    } else {
      setGastos([{ ...newGasto, id: Date.now().toString() }, ...gastos]);
    }
    setEditingGasto(undefined);
  };

  const handleEdit = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setGastos(gastos.filter(g => g.id !== id));
  };

  return (
    <Layout onNewGasto={() => setModalOpen(true)}>
      <PageHeader 
        title="Gastos" 
        subtitle={`${filteredGastos.length} gastos encontrados`}
        action={{ label: 'Nuevo Gasto', onClick: () => setModalOpen(true) }}
      />

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 mb-6 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-muted-foreground" />
          <span className="font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar por empresa, detalle o número de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
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
              return (
                <TableRow key={gasto.id} className="animate-fade-in">
                  <TableCell>{formatDate(gasto.fecha)}</TableCell>
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
                    <div>
                      <p className="font-medium">{gasto.tipoDocumento}</p>
                      <p className="text-sm text-muted-foreground">#{gasto.numeroDocumento}</p>
                    </div>
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

      <GastoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGasto(undefined);
        }}
        onSave={handleSaveGasto}
        gasto={editingGasto}
      />
    </Layout>
  );
}
