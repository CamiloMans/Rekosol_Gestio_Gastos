export interface Empresa {
  id: string;
  razonSocial: string;
  rut: string;
  numeroContacto?: string;
  correoElectronico?: string;
  createdAt: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  createdAt: string;
}

export interface Colaborador {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  createdAt: string;
}

export interface Gasto {
  id: string;
  fecha: string;
  empresaId: string;
  categoria: string;
  tipoDocumento: 'Factura' | 'Boleta' | 'Orden de Compra' | 'Sin Documento' | 'Otros';
  numeroDocumento: string;
  monto: number;
  detalle?: string;
  proyectoId?: string;
  comentarioTipoDocumento?: string;
  archivosAdjuntos?: Array<{ nombre: string; url: string; tipo: string }>;
}

export const categorias = [
  { id: 'gastos-generales', nombre: 'Gastos Generales', color: 'bg-category-gastos-generales' },
  { id: 'sueldos', nombre: 'Sueldos', color: 'bg-category-sueldos' },
  { id: 'honorarios', nombre: 'Honorarios', color: 'bg-category-honorarios' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', color: 'bg-category-mantenimiento' },
  { id: 'materiales', nombre: 'Materiales', color: 'bg-category-materiales' },
];

export const empresasData: Empresa[] = [
  { id: '1', razonSocial: 'Chilectra S.A.', rut: '96.800.570-7', createdAt: '2025-09-29' },
  { id: '2', razonSocial: 'Entel S.A.', rut: '96.806.980-2', createdAt: '2025-09-29' },
  { id: '3', razonSocial: 'Banco de Chile', rut: '97.004.000-5', createdAt: '2025-09-29' },
  { id: '4', razonSocial: 'Cencosud S.A.', rut: '96.885.400-8', createdAt: '2025-09-29' },
  { id: '5', razonSocial: 'Falabella S.A.', rut: '96.790.240-3', createdAt: '2025-09-29' },
  { id: '6', razonSocial: 'Sodimac', rut: '17.720.312-2', createdAt: '2025-09-29' },
];

export const proyectosData: Proyecto[] = [
  { id: '1', nombre: 'Proyecto Alpha', createdAt: '2025-09-29' },
  { id: '2', nombre: 'Proyecto Beta', createdAt: '2025-09-29' },
  { id: '3', nombre: 'Proyecto Gamma', createdAt: '2025-09-29' },
  { id: '4', nombre: 'Proyecto Delta', createdAt: '2025-09-29' },
];

export const colaboradoresData: Colaborador[] = [
  { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@example.com', telefono: '+56912345678', cargo: 'Desarrollador', createdAt: '2025-09-29' },
  { id: '2', nombre: 'María González', email: 'maria.gonzalez@example.com', telefono: '+56987654321', cargo: 'Diseñadora', createdAt: '2025-09-29' },
];

export const gastosData: Gasto[] = [
  { id: '1', fecha: '2025-12-31', empresaId: '1', categoria: 'mantenimiento', tipoDocumento: 'Boleta', numeroDocumento: '120', monto: 10000000, detalle: 'Mantenimiento eléctrico' },
  { id: '2', fecha: '2025-12-28', empresaId: '2', categoria: 'gastos-generales', tipoDocumento: 'Factura', numeroDocumento: '119', monto: 750000, detalle: 'Servicios telefónicos' },
  { id: '3', fecha: '2025-12-25', empresaId: '3', categoria: 'materiales', tipoDocumento: 'Factura', numeroDocumento: '118', monto: 1300000, detalle: 'Compra de materiales' },
  { id: '4', fecha: '2025-12-22', empresaId: '4', categoria: 'honorarios', tipoDocumento: 'Factura', numeroDocumento: '117', monto: 1500000, detalle: 'Honorarios consultoría' },
  { id: '5', fecha: '2025-12-18', empresaId: '5', categoria: 'gastos-generales', tipoDocumento: 'Factura', numeroDocumento: '116', monto: 500000, detalle: 'Gastos varios' },
  { id: '6', fecha: '2025-12-15', empresaId: '1', categoria: 'sueldos', tipoDocumento: 'Factura', numeroDocumento: '115', monto: 4250000, detalle: 'Sueldos diciembre' },
  { id: '7', fecha: '2025-12-10', empresaId: '2', categoria: 'honorarios', tipoDocumento: 'Boleta', numeroDocumento: '114', monto: 2750000, detalle: 'Honorarios legales' },
  { id: '8', fecha: '2025-12-05', empresaId: '3', categoria: 'gastos-generales', tipoDocumento: 'Factura', numeroDocumento: '113', monto: 890000, detalle: 'Servicios bancarios' },
  { id: '9', fecha: '2025-11-28', empresaId: '4', categoria: 'materiales', tipoDocumento: 'Factura', numeroDocumento: '112', monto: 2100000, detalle: 'Materiales construcción' },
  { id: '10', fecha: '2025-11-20', empresaId: '5', categoria: 'mantenimiento', tipoDocumento: 'Boleta', numeroDocumento: '111', monto: 650000, detalle: 'Reparaciones' },
  { id: '11', fecha: '2025-11-15', empresaId: '6', categoria: 'materiales', tipoDocumento: 'Factura', numeroDocumento: '110', monto: 1120000, detalle: 'Herramientas' },
  { id: '12', fecha: '2025-10-30', empresaId: '1', categoria: 'gastos-generales', tipoDocumento: 'Factura', numeroDocumento: '109', monto: 12034193, detalle: 'Gastos operacionales' },
];

export const monthlyData = [
  { mes: 'ene', total: 15200000 },
  { mes: 'feb', total: 14800000 },
  { mes: 'mar', total: 16500000 },
  { mes: 'abr', total: 18200000 },
  { mes: 'may', total: 19800000 },
  { mes: 'jun', total: 28900000 },
  { mes: 'jul', total: 18500000 },
  { mes: 'ago', total: 22100000 },
  { mes: 'sep', total: 24500000 },
  { mes: 'oct', total: 23434193 },
  { mes: 'nov', total: 13870000 },
  { mes: 'dic', total: 21940000 },
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateLong = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
