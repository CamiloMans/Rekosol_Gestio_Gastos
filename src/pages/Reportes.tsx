import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCurrency, type Gasto } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Receipt, DollarSign, FolderKanban } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { postgresApi, type ConfiguracionResponse } from '@/services/postgresApi';

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function getGastoAmount(gasto: Gasto) {
  return gasto.montoTotal ?? gasto.monto ?? 0;
}

function getSafeDate(dateValue: string) {
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function Reportes() {
  const [configData, setConfigData] = useState<ConfiguracionResponse | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('anual');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState('all');
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [configuracion, gastosResponse] = await Promise.all([
        postgresApi.getConfiguracion(),
        postgresApi.getGastos(),
      ]);

      setConfigData(configuracion);
      setGastos(gastosResponse);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar reportes';
      setError(message);
      setConfigData(null);
      setGastos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: 'Error de conexion',
      description: error,
      variant: 'destructive',
    });
  }, [error]);

  const categorias = useMemo(() => configData?.categorias || [], [configData]);
  const empresas = useMemo(() => configData?.empresas || [], [configData]);
  const proyectos = useMemo(
    () => [...(configData?.proyectos || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [configData],
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    gastos.forEach((gasto) => {
      const fecha = getSafeDate(gasto.fecha);
      if (fecha) {
        years.add(String(fecha.getFullYear()));
      }
    });

    if (years.size === 0) {
      years.add(new Date().getFullYear().toString());
    }

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [gastos]);

  useEffect(() => {
    if (!availableYears.includes(year)) {
      setYear(availableYears[0]);
    }
  }, [availableYears, year]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((gasto) => {
      const fecha = getSafeDate(gasto.fecha);
      if (!fecha) return false;

      const matchesYear = String(fecha.getFullYear()) === year;
      const matchesMonth = periodo === 'anual' || mes === 'all'
        ? true
        : String(fecha.getMonth() + 1).padStart(2, '0') === mes;
      const matchesProject = proyectoFiltro === 'all'
        ? true
        : String(gasto.proyectoId || '') === String(proyectoFiltro);

      return matchesYear && matchesMonth && matchesProject;
    });
  }, [gastos, mes, periodo, proyectoFiltro, year]);

  const monthlyData = useMemo(() => {
    const monthlyTotals = Object.fromEntries(MONTH_LABELS.map((label) => [label, 0]));

    gastos
      .filter((gasto) => {
        const fecha = getSafeDate(gasto.fecha);
        if (!fecha) return false;
        if (String(fecha.getFullYear()) !== year) return false;
        if (proyectoFiltro !== 'all' && String(gasto.proyectoId || '') !== String(proyectoFiltro)) return false;
        return true;
      })
      .forEach((gasto) => {
        const fecha = getSafeDate(gasto.fecha);
        if (!fecha) return;
        monthlyTotals[MONTH_LABELS[fecha.getMonth()]] += getGastoAmount(gasto);
      });

    return MONTH_LABELS.map((label) => ({ mes: label, total: monthlyTotals[label] || 0 }));
  }, [gastos, proyectoFiltro, year]);

  const totalDisplay = useMemo(
    () => gastosFiltrados.reduce((sum, gasto) => sum + getGastoAmount(gasto), 0),
    [gastosFiltrados],
  );
  const totalAnual = useMemo(
    () => monthlyData.reduce((sum, month) => sum + month.total, 0),
    [monthlyData],
  );
  const mesesConGastos = useMemo(() => monthlyData.filter((month) => month.total > 0), [monthlyData]);
  const promedioMensual = mesesConGastos.length > 0 ? totalAnual / mesesConGastos.length : 0;
  const mesMayorGasto = useMemo(
    () => monthlyData.reduce((max, current) => (current.total > max.total ? current : max), monthlyData[0] || { mes: 'ene', total: 0 }),
    [monthlyData],
  );
  const mesMenorGasto = useMemo(() => {
    const nonZeroMonths = monthlyData.filter((month) => month.total > 0);
    if (nonZeroMonths.length === 0) return { mes: 'ene', total: 0 };
    return nonZeroMonths.reduce((min, current) => (current.total < min.total ? current : min), nonZeroMonths[0]);
  }, [monthlyData]);

  const categoriasTotals = useMemo(() => {
    return categorias
      .map((categoria) => ({
        ...categoria,
        total: gastosFiltrados
          .filter((gasto) => String(gasto.categoria) === String(categoria.id))
          .reduce((sum, gasto) => sum + getGastoAmount(gasto), 0),
      }))
      .filter((categoria) => categoria.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categorias, gastosFiltrados]);

  const empresasTotals = useMemo(() => {
    return empresas
      .map((empresa) => ({
        ...empresa,
        total: gastosFiltrados
          .filter((gasto) => String(gasto.empresaId) === String(empresa.id))
          .reduce((sum, gasto) => sum + getGastoAmount(gasto), 0),
      }))
      .filter((empresa) => empresa.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [empresas, gastosFiltrados]);

  const totalCategorias = categoriasTotals.reduce((sum, categoria) => sum + categoria.total, 0);
  const totalEmpresas = empresasTotals.reduce((sum, empresa) => sum + empresa.total, 0);

  return (
    <Layout>
      <PageHeader
        title="Reportes"
        subtitle={loading ? 'Cargando datos desde PostgreSQL...' : `Resumen ${periodo} ${year}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ToggleGroup
            type="single"
            value={periodo}
            onValueChange={(value) => {
              if (!value) return;
              setPeriodo(value as 'mensual' | 'anual');
              if (value === 'anual') setMes('all');
            }}
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="mensual" className="flex-1 data-[state=on]:bg-muted sm:flex-none">Mensual</ToggleGroupItem>
            <ToggleGroupItem value="anual" className="flex-1 data-[state=on]:bg-muted sm:flex-none">Anual</ToggleGroupItem>
          </ToggleGroup>

          {periodo === 'mensual' && (
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-full bg-card sm:w-40">
                <Calendar size={16} className="mr-2" />
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todos los meses</SelectItem>
                {MONTH_LABELS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1).padStart(2, '0')}>
                    {label.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full bg-card sm:w-32">
              <Calendar size={16} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {availableYears.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
            <SelectTrigger className="w-full bg-card sm:w-48">
              <FolderKanban size={16} className="mr-2" />
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {proyectos.map((proyecto) => (
                <SelectItem key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Receipt className="h-6 w-6 text-primary" />} label={periodo === 'anual' ? 'Total Anual' : 'Total del Periodo'} value={formatCurrency(totalDisplay)} iconBgClass="bg-accent" />
        <StatCard icon={<DollarSign className="h-6 w-6 text-primary" />} label="Promedio Mensual" value={formatCurrency(promedioMensual)} iconBgClass="bg-accent" />
        <StatCard icon={<TrendingUp className="h-6 w-6 text-emerald-700" />} label="Mes Mayor Gasto" value={(mesMayorGasto.mes || 'ene').toUpperCase()} iconBgClass="bg-emerald-100" />
        <StatCard icon={<TrendingDown className="h-6 w-6 text-red-700" />} label="Mes Menor Gasto" value={(mesMenorGasto.mes || 'ene').toUpperCase()} iconBgClass="bg-red-100" />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Evolucion Mensual {year}</h3>
        </div>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(213, 94%, 54%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(213, 94%, 54%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="mes" stroke="hsl(215, 16%, 47%)" />
              <YAxis stroke="hsl(215, 16%, 47%)" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} />
              <Area type="monotone" dataKey="total" stroke="hsl(213, 94%, 54%)" strokeWidth={2} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">Categorias</h3>
          {categoriasTotals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay gastos para las categorias del periodo seleccionado.</p>
          ) : (
            <div className="space-y-4">
              {categoriasTotals.map((categoria) => {
                const percentage = totalCategorias > 0 ? (categoria.total / totalCategorias) * 100 : 0;
                return (
                  <div key={categoria.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <CategoryBadge categoryId={categoria.id} categories={categorias} />
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(categoria.total)}</p>
                        <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">Empresas</h3>
          {empresasTotals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay gastos para las empresas del periodo seleccionado.</p>
          ) : (
            <div className="space-y-4">
              {empresasTotals.map((empresa) => {
                const percentage = totalEmpresas > 0 ? (empresa.total / totalEmpresas) * 100 : 0;
                return (
                  <div key={empresa.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{empresa.razonSocial}</p>
                        <p className="text-sm text-muted-foreground">{empresa.rut || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(empresa.total)}</p>
                        <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
