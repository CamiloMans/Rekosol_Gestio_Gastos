import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { CategoryBadge } from '@/components/CategoryBadge';
import { gastosData, empresasData, categorias, monthlyData, formatCurrency } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

export default function Reportes() {
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('anual');
  const [year, setYear] = useState('2025');

  const totalAnual = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const promedioMensual = totalAnual / 12;
  const mesMayorGasto = monthlyData.reduce((max, m) => m.total > max.total ? m : max, monthlyData[0]);
  const mesMenorGasto = monthlyData.reduce((min, m) => m.total < min.total ? m : min, monthlyData[0]);

  // Categorías del año
  const categoriasTotals = categorias.map(cat => {
    const total = gastosData.filter(g => g.categoria === cat.id).reduce((sum, g) => sum + g.monto, 0);
    return { ...cat, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const totalCategorias = categoriasTotals.reduce((sum, c) => sum + c.total, 0);

  // Empresas del año
  const empresasTotals = empresasData.map(emp => {
    const total = gastosData.filter(g => g.empresaId === emp.id).reduce((sum, g) => sum + g.monto, 0);
    return { ...emp, total };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

  const totalEmpresas = empresasTotals.reduce((sum, e) => sum + e.total, 0);

  const categoryColors: Record<string, string> = {
    'sueldos': '#22c55e',
    'honorarios': '#f97316',
    'mantenimiento': '#ef4444',
    'gastos-generales': '#64748b',
    'materiales': '#3b82f6',
  };

  return (
    <Layout>
      <PageHeader title="Reportes" subtitle={`Resumen anual - ${year}`}>
        <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && setPeriodo(v as 'mensual' | 'anual')}>
          <ToggleGroupItem value="mensual" className="data-[state=on]:bg-muted">Mensual</ToggleGroupItem>
          <ToggleGroupItem value="anual" className="data-[state=on]:bg-muted">Anual</ToggleGroupItem>
        </ToggleGroup>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24 bg-card">
            <Calendar size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card">
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Total del Año */}
      <div className="bg-card rounded-xl p-8 mb-6 shadow-sm border border-border text-center animate-fade-in">
        <p className="text-muted-foreground mb-2">Total del Año</p>
        <p className="text-4xl font-bold text-foreground">{formatCurrency(totalAnual)}</p>
        <p className="text-muted-foreground mt-1">{year}</p>
      </div>

      {/* Evolución Mensual Chart */}
      <div className="bg-card rounded-xl p-6 mb-6 shadow-sm border border-border animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={20} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Evolución Mensual {year}</h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(213, 94%, 54%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(213, 94%, 54%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="mes" stroke="hsl(215, 16%, 47%)" />
              <YAxis 
                stroke="hsl(215, 16%, 47%)" 
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Total']}
                contentStyle={{ 
                  backgroundColor: 'hsl(0, 0%, 100%)', 
                  borderRadius: '8px',
                  border: '1px solid hsl(214, 32%, 91%)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(213, 94%, 54%)" 
                strokeWidth={2}
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-1">Promedio Mensual</p>
          <p className="text-xl font-bold">{formatCurrency(promedioMensual)}</p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-1">Mes Mayor Gasto</p>
          <p className="text-xl font-bold capitalize">{mesMayorGasto.mes}</p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-1">Mes Menor Gasto</p>
          <p className="text-xl font-bold capitalize">{mesMenorGasto.mes}</p>
        </div>
      </div>

      {/* Categories and Companies breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías del Año */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-muted-foreground">📊</span> Categorías del Año
          </h3>
          <div className="space-y-4">
            {categoriasTotals.map((cat) => {
              const percentage = (cat.total / totalCategorias) * 100;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CategoryBadge categoryId={cat.id} />
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(cat.total)}</p>
                      <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: categoryColors[cat.id] || '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empresas del Año */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-muted-foreground">📊</span> Empresas del Año
          </h3>
          <div className="space-y-4">
            {empresasTotals.map((emp, index) => {
              const percentage = (emp.total / totalEmpresas) * 100;
              const colors = ['#3b82f6', '#22c55e', '#06b6d4', '#8b5cf6', '#f97316', '#64748b'];
              return (
                <div key={emp.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.razonSocial}</p>
                      <p className="text-sm text-muted-foreground">{emp.rut}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(emp.total)}</p>
                      <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colors[index % colors.length]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
