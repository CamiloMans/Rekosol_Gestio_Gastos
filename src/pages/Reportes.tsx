import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { CategoryBadge } from '@/components/CategoryBadge';
import { gastosData, empresasData as empresasDataMock, proyectosData, categorias as categoriasMock, formatCurrency } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Receipt, DollarSign, FolderKanban } from 'lucide-react';
import { useGastos, useCategorias, useEmpresas, useProyectos, useSharePointAuth } from '@/hooks/useSharePoint';

export default function Reportes() {
  const { isAuthenticated } = useSharePointAuth();
  const { gastos: gastosSharePoint } = useGastos();
  const { categorias: categoriasSharePoint } = useCategorias();
  const { empresas: empresasSharePoint } = useEmpresas();
  const { proyectos: proyectosSharePoint } = useProyectos();
  
  // Usar datos de SharePoint si está autenticado, sino usar datos mock
  const gastos = isAuthenticated ? gastosSharePoint : gastosData;
  const empresas = isAuthenticated ? empresasSharePoint : empresasDataMock;
  const proyectos = isAuthenticated ? proyectosSharePoint : proyectosData;
  const categorias = isAuthenticated && categoriasSharePoint.length > 0 
    ? categoriasSharePoint.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        color: cat.color || `bg-category-${cat.id}`,
      }))
    : categoriasMock;

  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('anual');
  // Detectar el año automáticamente desde los gastos disponibles
  const availableYear = useMemo(() => {
    if (gastos.length > 0) {
      const years = gastos.map(g => {
        try {
          return new Date(g.fecha).getFullYear().toString();
        } catch {
          return null;
        }
      }).filter((y): y is string => y !== null);
      if (years.length > 0) {
        // Obtener el año más reciente
        return years.sort((a, b) => parseInt(b) - parseInt(a))[0];
      }
    }
    return new Date().getFullYear().toString();
  }, [gastos]);
  
  const [year, setYear] = useState(availableYear);
  const [mes, setMes] = useState('all');
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('all');
  
  // Actualizar el año cuando cambien los gastos disponibles
  useEffect(() => {
    if (availableYear && availableYear !== year) {
      setYear(availableYear);
    }
  }, [availableYear]);

  // Filtrar gastos según periodo, mes y proyecto seleccionado
  const gastosFiltrados = useMemo(() => {
    let gastosFiltradosPorFecha = periodo === 'anual'
      ? gastos.filter(g => {
          const fechaGasto = new Date(g.fecha);
          return fechaGasto.getFullYear().toString() === year;
        })
      : mes !== 'all'
      ? gastos.filter(g => {
          const fechaGasto = new Date(g.fecha);
          const añoGasto = fechaGasto.getFullYear().toString();
          const mesGasto = String(fechaGasto.getMonth() + 1).padStart(2, '0');
          return añoGasto === year && mesGasto === mes;
        })
      : gastos.filter(g => {
          const fechaGasto = new Date(g.fecha);
          return fechaGasto.getFullYear().toString() === year;
        });
    
    // Filtrar por proyecto si está seleccionado
    if (proyectoFiltro !== 'all') {
      gastosFiltradosPorFecha = gastosFiltradosPorFecha.filter(g => 
        String(g.proyectoId || '') === String(proyectoFiltro)
      );
    }
    
    return gastosFiltradosPorFecha;
  }, [gastos, periodo, year, mes, proyectoFiltro]);

  // Calcular datos mensuales basados en los gastos reales del año seleccionado y proyecto
  const monthlyDataCalculated = useMemo(() => {
    // Usar los gastos filtrados (ya incluyen filtro de proyecto)
    const gastosAnuales = gastosFiltrados.filter(g => {
      const fechaGasto = new Date(g.fecha);
      return fechaGasto.getFullYear().toString() === year;
    });

    // Agrupar por mes
    const mesesMap: Record<string, number> = {};
    const mesesAbrev = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    gastosAnuales.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const mesIndex = fecha.getMonth();
      const mesAbrev = mesesAbrev[mesIndex];
      
      if (!mesesMap[mesAbrev]) {
        mesesMap[mesAbrev] = 0;
      }
      mesesMap[mesAbrev] += gasto.monto;
    });

    // Crear array con todos los meses, incluso si no tienen gastos
    return mesesAbrev.map(mesAbrev => ({
      mes: mesAbrev,
      total: mesesMap[mesAbrev] || 0,
    }));
  }, [gastosFiltrados, year]);

  // Calcular total anual basado en los gastos reales
  const totalAnual = useMemo(() => {
    return monthlyDataCalculated.reduce((sum, m) => sum + m.total, 0);
  }, [monthlyDataCalculated]);
  
  // Calcular total según periodo y mes seleccionado
  const totalDisplay = periodo === 'anual' 
    ? totalAnual
    : gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
  
  // Calcular promedio mensual basado en los meses que tienen gastos
  const mesesConGastos = monthlyDataCalculated.filter(m => m.total > 0);
  const promedioMensual = mesesConGastos.length > 0 
    ? totalAnual / mesesConGastos.length 
    : 0;
  
  // Encontrar mes mayor y menor gasto
  const mesMayorGasto = useMemo(() => {
    if (monthlyDataCalculated.length === 0) return { mes: 'ene', total: 0 };
    return monthlyDataCalculated.reduce((max, m) => m.total > max.total ? m : max, monthlyDataCalculated[0]);
  }, [monthlyDataCalculated]);

  const mesMenorGasto = useMemo(() => {
    if (monthlyDataCalculated.length === 0) return { mes: 'ene', total: 0 };
    const mesesConGastos = monthlyDataCalculated.filter(m => m.total > 0);
    if (mesesConGastos.length === 0) return { mes: 'ene', total: 0 };
    return mesesConGastos.reduce((min, m) => m.total < min.total ? m : min, mesesConGastos[0]);
  }, [monthlyDataCalculated]);
  
  // Mapeo de meses abreviados a nombres completos
  const mesesNombres: Record<string, string> = {
    'ene': 'Ene',
    'feb': 'Feb',
    'mar': 'Mar',
    'abr': 'Abr',
    'may': 'May',
    'jun': 'Jun',
    'jul': 'Jul',
    'ago': 'Ago',
    'sep': 'Sep',
    'oct': 'Oct',
    'nov': 'Nov',
    'dic': 'Dic'
  };

  // Categorías del periodo
  const categoriasTotals = useMemo(() => {
    if (!gastosFiltrados || gastosFiltrados.length === 0) {
      console.log('📊 No hay gastos filtrados para categorías');
      return [];
    }
    
    console.log('📊 Calculando categorías. Gastos filtrados:', gastosFiltrados.length);
    console.log('📊 Categorías disponibles:', categorias.map(c => ({ id: c.id, nombre: c.nombre })));
    console.log('📊 Primeros gastos (muestra):', gastosFiltrados.slice(0, 3).map(g => ({ 
      id: g.id, 
      categoria: g.categoria, 
      empresaId: g.empresaId,
      monto: g.monto 
    })));
    
    const result = categorias.map(cat => {
      // Comparar como strings para asegurar coincidencia
      const gastosDeCategoria = gastosFiltrados.filter(g => String(g.categoria) === String(cat.id));
      const total = gastosDeCategoria.reduce((sum, g) => sum + g.monto, 0);
      
      if (gastosDeCategoria.length > 0) {
        console.log(`📊 Categoría "${cat.nombre}" (ID: ${cat.id}): ${gastosDeCategoria.length} gastos, Total: ${total}`);
      }
      
      return { ...cat, total };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    
    console.log('📊 Categorías con totales:', result.length);
    return result;
  }, [categorias, gastosFiltrados]);

  const totalCategorias = categoriasTotals.reduce((sum, c) => sum + c.total, 0);

  // Empresas del periodo
  const empresasTotals = useMemo(() => {
    if (!gastosFiltrados || gastosFiltrados.length === 0) {
      console.log('🏢 No hay gastos filtrados para empresas');
      return [];
    }
    
    console.log('🏢 Calculando empresas. Gastos filtrados:', gastosFiltrados.length);
    console.log('🏢 Empresas disponibles:', empresas.map(e => ({ id: e.id, razonSocial: e.razonSocial })));
    
    const result = empresas.map(emp => {
      // Comparar como strings para asegurar coincidencia
      const gastosDeEmpresa = gastosFiltrados.filter(g => String(g.empresaId) === String(emp.id));
      const total = gastosDeEmpresa.reduce((sum, g) => sum + g.monto, 0);
      
      if (gastosDeEmpresa.length > 0) {
        console.log(`🏢 Empresa "${emp.razonSocial}" (ID: ${emp.id}): ${gastosDeEmpresa.length} gastos, Total: ${total}`);
      }
      
      return { ...emp, total };
    }).filter(e => e.total > 0).sort((a, b) => b.total - a.total);
    
    console.log('🏢 Empresas con totales:', result.length);
    return result;
  }, [empresas, gastosFiltrados]);

  const totalEmpresas = empresasTotals.reduce((sum, e) => sum + e.total, 0);

  // Obtener todos los años únicos de los gastos para el selector
  // Incluir siempre 2025 y 2026, además de cualquier otro año que tenga gastos
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    
    // Agregar siempre 2025 y 2026
    years.add('2025');
    years.add('2026');
    
    // Agregar años de los gastos disponibles
    gastos.forEach(g => {
      try {
        const year = new Date(g.fecha).getFullYear().toString();
        years.add(year);
      } catch {
        // Ignorar fechas inválidas
      }
    });
    
    // Ordenar de mayor a menor
    const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    return sortedYears;
  }, [gastos]);

  // Función para oscurecer un color (reducir luminosidad en HSL)
  const darkenColor = (color: string, darkenAmount: number = 0.3): string => {
    // Si es un color hexadecimal
    if (color.startsWith('#')) {
      // Convertir hex a RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Convertir RGB a HSL
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
          case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
          case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
        }
      }
      
      // Reducir luminosidad (de ~80% a ~50-55%)
      l = Math.max(0.45, Math.min(0.6, l - darkenAmount));
      
      // Convertir HSL a RGB
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - c / 2;
      
      let rNew = 0, gNew = 0, bNew = 0;
      if (h < 1/6) { rNew = c; gNew = x; bNew = 0; }
      else if (h < 2/6) { rNew = x; gNew = c; bNew = 0; }
      else if (h < 3/6) { rNew = 0; gNew = c; bNew = x; }
      else if (h < 4/6) { rNew = 0; gNew = x; bNew = c; }
      else if (h < 5/6) { rNew = x; gNew = 0; bNew = c; }
      else { rNew = c; gNew = 0; bNew = x; }
      
      rNew = Math.round((rNew + m) * 255);
      gNew = Math.round((gNew + m) * 255);
      bNew = Math.round((bNew + m) * 255);
      
      return `rgb(${rNew}, ${gNew}, ${bNew})`;
    }
    
    // Si es HSL, reducir la luminosidad
    if (color.startsWith('hsl')) {
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (match) {
        const h = parseInt(match[1]);
        const s = parseInt(match[2]);
        let l = parseInt(match[3]);
        // Reducir luminosidad de 80% a ~50-55%
        l = Math.max(45, Math.min(60, l - (l * darkenAmount)));
        return `hsl(${h}, ${s}%, ${l}%)`;
      }
    }
    
    // Si es RGB, convertir a HSL y oscurecer
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]) / 255;
        const g = parseInt(match[2]) / 255;
        const b = parseInt(match[3]) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        l = Math.max(0.45, Math.min(0.6, l - darkenAmount));
        s = Math.max(0, Math.min(1, s));
        
        return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      }
    }
    
    return color;
  };

  // Mapeo de IDs de categorías a colores oscuros para las barras de progreso
  const categoryColors: Record<string, string> = useMemo(() => {
    const colors: Record<string, string> = {};
    categorias.forEach(cat => {
      let baseColor = '';
      
      // Si la categoría tiene un color guardado (hex), usarlo
      if (cat.color?.startsWith('#')) {
        baseColor = cat.color;
      } else if (cat.color?.startsWith('rgb') || cat.color?.startsWith('hsl')) {
        baseColor = cat.color;
      } else {
        // Si tiene una clase Tailwind, mapear a color
        const tailwindToColor: Record<string, string> = {
          'bg-pink-200': '#FFB3BA',
          'bg-orange-200': '#FFDFBA',
          'bg-yellow-200': '#FFFFBA',
          'bg-green-200': '#BAFFC9',
          'bg-blue-200': '#BAE1FF',
          'bg-purple-200': '#E0BAFF',
          'bg-red-200': '#FFCCCB',
          'bg-cyan-200': '#B0E0E6',
          'bg-orange-100': '#FFDAB9',
          'bg-lime-200': '#F0E68C',
          'bg-sky-200': '#ADD8E6',
          'bg-fuchsia-200': '#DDA0DD',
          'bg-rose-300': '#FA8072',
          'bg-emerald-200': '#7FFFD4',
          'bg-stone-200': '#F5F5DC',
          'bg-violet-200': '#E6E6FA',
        };
        
        const categoryId = cat.color?.replace('bg-category-', '') || cat.id;
        const categoryColorMap: Record<string, string> = {
          'gastos-generales': 'hsl(210, 80%, 80%)',
          'sueldos': 'hsl(150, 70%, 80%)',
          'honorarios': 'hsl(30, 90%, 75%)',
          'mantenimiento': 'hsl(350, 75%, 80%)',
          'materiales': 'hsl(260, 75%, 80%)',
        };
        
        baseColor = tailwindToColor[cat.color || ''] || categoryColorMap[categoryId] || 'hsl(213, 94%, 54%)';
      }
      
      // Oscurecer el color para las barras de progreso
      colors[cat.id] = darkenColor(baseColor, 0.2);
    });
    return colors;
  }, [categorias]);

  return (
    <Layout>
      <PageHeader title="Reportes" subtitle={periodo === 'anual' ? `Resumen anual - ${year}` : `Resumen mensual - ${mes !== 'all' ? mes : year}`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <ToggleGroup type="single" value={periodo} onValueChange={(v) => {
            if (v) {
              setPeriodo(v as 'mensual' | 'anual');
              if (v === 'anual') setMes('all');
            }
          }} className="w-full sm:w-auto">
            <ToggleGroupItem value="mensual" className="data-[state=on]:bg-muted flex-1 sm:flex-none">Mensual</ToggleGroupItem>
            <ToggleGroupItem value="anual" className="data-[state=on]:bg-muted flex-1 sm:flex-none">Anual</ToggleGroupItem>
          </ToggleGroup>
          {periodo === 'mensual' && (
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-full sm:w-40 bg-card">
                <Calendar size={16} className="mr-2" />
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todos los meses</SelectItem>
                <SelectItem value="01">Enero</SelectItem>
                <SelectItem value="02">Febrero</SelectItem>
                <SelectItem value="03">Marzo</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Mayo</SelectItem>
                <SelectItem value="06">Junio</SelectItem>
                <SelectItem value="07">Julio</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full sm:w-32 bg-card">
              <Calendar size={16} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <FolderKanban size={16} className="mr-2" />
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {proyectos.map((proyecto) => (
                <SelectItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          icon={<Receipt className="w-6 h-6 text-primary" />}
          label={periodo === 'anual' ? 'Total Anual' : 'Total del Mes'}
          value={formatCurrency(totalDisplay)}
          iconBgClass="bg-accent"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6 text-primary" />}
          label="Promedio Mensual"
          value={formatCurrency(promedioMensual)}
          iconBgClass="bg-accent"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-emerald-700" />}
          label="Mes Mayor Gasto"
          value={mesesNombres[mesMayorGasto.mes] || mesMayorGasto.mes}
          iconBgClass="bg-emerald-100"
        />
        <StatCard
          icon={<TrendingDown className="w-6 h-6 text-red-700" />}
          label="Mes Menor Gasto"
          value={mesesNombres[mesMenorGasto.mes] || mesMenorGasto.mes}
          iconBgClass="bg-red-100"
        />
      </div>

      {/* Evolución Mensual Chart */}
      <div className="bg-card rounded-xl p-4 sm:p-6 mb-6 shadow-sm border border-border animate-fade-in">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <TrendingUp size={20} className="text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-semibold">Evolución Mensual {year}</h3>
        </div>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyDataCalculated}>
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

      {/* Categories and Companies breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Categorías del Año */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-muted-foreground">📊</span> Categorías del Año
          </h3>
          {categoriasTotals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No hay gastos en categorías para el período seleccionado.</p>
              <p className="text-xs mt-2">Verifica que los gastos tengan categorías asignadas y que coincidan con el año seleccionado.</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Empresas del Año */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border border-border animate-fade-in">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-muted-foreground">🏢</span> Empresas del Año
          </h3>
          {empresasTotals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No hay gastos en empresas para el período seleccionado.</p>
              <p className="text-xs mt-2">Verifica que los gastos tengan empresas asignadas y que coincidan con el año seleccionado.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {empresasTotals.map((emp) => {
                const percentage = (emp.total / totalEmpresas) * 100;
                return (
                  <div key={emp.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm sm:text-base">{emp.razonSocial}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono">{emp.rut}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm sm:text-base">{formatCurrency(emp.total)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500 bg-primary"
                        style={{ 
                          width: `${percentage}%`
                        }}
                      />
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
