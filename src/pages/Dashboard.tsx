import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { CategoryBadge } from '@/components/CategoryBadge';
import { GastoModal } from '@/components/GastoModal';
import { gastosData, empresasData, categorias, formatCurrency, Gasto } from '@/data/mockData';
import { Receipt, TrendingUp, Building2 } from 'lucide-react';

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [gastos, setGastos] = useState(gastosData);

  const totalMes = gastos.reduce((sum, g) => sum + g.monto, 0);
  const categoriasActivas = new Set(gastos.map(g => g.categoria)).size;
  const empresasConGastos = new Set(gastos.map(g => g.empresaId)).size;

  // Top categorías
  const categoriasTotals = categorias.map(cat => {
    const total = gastos.filter(g => g.categoria === cat.id).reduce((sum, g) => sum + g.monto, 0);
    return { ...cat, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);

  // Top empresas
  const empresasTotals = empresasData.map(emp => {
    const total = gastos.filter(g => g.empresaId === emp.id).reduce((sum, g) => sum + g.monto, 0);
    return { ...emp, total };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);

  const handleSaveGasto = (newGasto: Omit<Gasto, 'id'>) => {
    setGastos([{ ...newGasto, id: Date.now().toString() }, ...gastos]);
  };

  const mesActual = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <Layout onNewGasto={() => setModalOpen(true)}>
      <PageHeader 
        title="Dashboard" 
        subtitle={mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}
        action={{ label: 'Nuevo Gasto', onClick: () => setModalOpen(true) }}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Receipt className="w-6 h-6 text-primary" />}
          label="Total del Mes"
          value={formatCurrency(totalMes)}
          iconBgClass="bg-accent"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-category-sueldos" />}
          label="Categorías Activas"
          value={categoriasActivas}
          iconBgClass="bg-green-50"
        />
        <StatCard
          icon={<Building2 className="w-6 h-6 text-primary" />}
          label="Empresas con Gastos"
          value={empresasConGastos}
          iconBgClass="bg-accent"
        />
      </div>

      {/* Top Categories and Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categorías */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Top Categorías</h3>
          <div className="space-y-4">
            {categoriasTotals.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between">
                <CategoryBadge categoryId={cat.id} />
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(cat.total)}</p>
                  <p className="text-sm text-muted-foreground">
                    {((cat.total / totalMes) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Empresas */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Top Empresas</h3>
          <div className="space-y-4">
            {empresasTotals.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{emp.razonSocial}</p>
                  <p className="text-sm text-muted-foreground">{emp.rut}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(emp.total)}</p>
                  <p className="text-sm text-muted-foreground">
                    {((emp.total / totalMes) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveGasto}
      />
    </Layout>
  );
}
