import type { Colaborador, Empresa, Gasto, Proyecto } from '@/data/mockData';

type TenantInfo = {
  id: string;
  slug: string;
  nombre: string;
};

type CategoriaOption = {
  id: string;
  nombre: string;
  color?: string;
  activa?: boolean;
};

type TipoDocumentoOption = {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  tieneImpuestos?: boolean;
  valorImpuestos?: number;
  createdAt?: string;
};

type TipoDocumentoProyectoOption = {
  id: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  createdAt?: string;
};

type MonedaProyecto = 'CLP' | 'UF' | 'USD';

type HitoPagoProyecto = {
  id: string;
  proyectoId: string;
  codigoProyecto?: string;
  nroHito: number;
  montoHito: number;
  moneda: MonedaProyecto;
  fechaCompromiso: string;
  fechaPago?: string;
  facturado: boolean;
  pagado: boolean;
  observacion?: string;
  createdAt?: string;
};

type DocumentoProyectoRecord = {
  id: string;
  proyectoId: string;
  codigoProyecto?: string;
  tipoDocumentoProyectoId: string;
  tipoDocumentoNombre?: string;
  fechaDocumento?: string;
  nroReferencia?: string;
  observacion?: string;
  createdAt?: string;
  archivoAdjunto?: {
    nombre: string;
    url: string;
    tipo: string;
  };
};

type BootstrapResponse = {
  tenant: TenantInfo;
  empresas: Empresa[];
  proyectos: Proyecto[];
  categorias: CategoriaOption[];
  tiposDocumento: TipoDocumentoOption[];
  colaboradores: Colaborador[];
};

type ConfiguracionResponse = BootstrapResponse & {
  tiposDocumentoProyecto: TipoDocumentoProyectoOption[];
};

type ProyectoCreateInput = Omit<Proyecto, 'id' | 'createdAt'>;
type EmpresaCreateInput = Omit<Empresa, 'id' | 'createdAt'>;
type ColaboradorCreateInput = Omit<Colaborador, 'id' | 'createdAt'>;
type CategoriaCreateInput = Omit<CategoriaOption, 'id'>;
type TipoDocumentoCreateInput = Omit<TipoDocumentoOption, 'id' | 'createdAt' | 'tieneImpuestos' | 'valorImpuestos'>;
type TipoDocumentoProyectoCreateInput = Omit<TipoDocumentoProyectoOption, 'id' | 'createdAt'>;
type HitoPagoProyectoCreateInput = Omit<HitoPagoProyecto, 'id' | 'codigoProyecto' | 'createdAt'>;
type DocumentoProyectoRecordCreateInput = Omit<DocumentoProyectoRecord, 'id' | 'codigoProyecto' | 'tipoDocumentoNombre' | 'createdAt' | 'archivoAdjunto'>;
type GastoAttachmentInput = NonNullable<Gasto['archivosAdjuntos']>[number];
type GastoMutationPayload = Omit<Gasto, 'id' | 'archivosAdjuntos'> & {
  archivosAdjuntos?: GastoAttachmentInput[];
  existingAttachmentIds?: string[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(hasFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error || `Request fallida: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildGastoFormData(gasto: Omit<Gasto, 'id'>) {
  const formData = new FormData();
  const archivosAdjuntos = gasto.archivosAdjuntos || [];
  const existingAttachmentIds = archivosAdjuntos
    .filter((archivo) => !(archivo.file instanceof File))
    .map((archivo) => archivo.id)
    .filter((id): id is string => Boolean(id));

  const payload: GastoMutationPayload = {
    ...gasto,
    archivosAdjuntos: undefined,
    existingAttachmentIds,
  };

  formData.append('payload', JSON.stringify(payload));

  archivosAdjuntos.forEach((archivo) => {
    if (archivo.file instanceof File) {
      formData.append('archivosAdjuntos', archivo.file);
    }
  });

  return formData;
}

export const postgresApi = {
  getBootstrap() {
    return request<BootstrapResponse>('/api/bootstrap');
  },

  getConfiguracion() {
    return request<ConfiguracionResponse>('/api/configuracion');
  },

  getGastos() {
    return request<Gasto[]>('/api/gastos');
  },

  createProyecto(proyecto: ProyectoCreateInput) {
    return request<Proyecto>('/api/proyectos', {
      method: 'POST',
      body: JSON.stringify(proyecto),
    });
  },

  updateProyecto(id: string, proyecto: ProyectoCreateInput) {
    return request<Proyecto>(`/api/proyectos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(proyecto),
    });
  },

  deleteProyecto(id: string) {
    return request<void>(`/api/proyectos/${id}`, {
      method: 'DELETE',
    });
  },

  createCategoria(categoria: CategoriaCreateInput) {
    return request<CategoriaOption>('/api/categorias', {
      method: 'POST',
      body: JSON.stringify(categoria),
    });
  },

  updateCategoria(id: string, categoria: CategoriaCreateInput) {
    return request<CategoriaOption>(`/api/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoria),
    });
  },

  deleteCategoria(id: string) {
    return request<void>(`/api/categorias/${id}`, {
      method: 'DELETE',
    });
  },

  createEmpresa(empresa: EmpresaCreateInput) {
    return request<Empresa>('/api/empresas', {
      method: 'POST',
      body: JSON.stringify(empresa),
    });
  },

  updateEmpresa(id: string, empresa: EmpresaCreateInput) {
    return request<Empresa>(`/api/empresas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(empresa),
    });
  },

  deleteEmpresa(id: string) {
    return request<void>(`/api/empresas/${id}`, {
      method: 'DELETE',
    });
  },

  createColaborador(colaborador: ColaboradorCreateInput) {
    return request<Colaborador>('/api/colaboradores', {
      method: 'POST',
      body: JSON.stringify(colaborador),
    });
  },

  updateColaborador(id: string, colaborador: ColaboradorCreateInput) {
    return request<Colaborador>(`/api/colaboradores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(colaborador),
    });
  },

  deleteColaborador(id: string) {
    return request<void>(`/api/colaboradores/${id}`, {
      method: 'DELETE',
    });
  },

  createTipoDocumento(tipoDocumento: TipoDocumentoCreateInput) {
    return request<TipoDocumentoOption>('/api/tipos-documento', {
      method: 'POST',
      body: JSON.stringify(tipoDocumento),
    });
  },

  updateTipoDocumento(id: string, tipoDocumento: TipoDocumentoCreateInput) {
    return request<TipoDocumentoOption>(`/api/tipos-documento/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tipoDocumento),
    });
  },

  deleteTipoDocumento(id: string) {
    return request<void>(`/api/tipos-documento/${id}`, {
      method: 'DELETE',
    });
  },

  createTipoDocumentoProyecto(tipoDocumentoProyecto: TipoDocumentoProyectoCreateInput) {
    return request<TipoDocumentoProyectoOption>('/api/tipos-documento-proyecto', {
      method: 'POST',
      body: JSON.stringify(tipoDocumentoProyecto),
    });
  },

  updateTipoDocumentoProyecto(id: string, tipoDocumentoProyecto: TipoDocumentoProyectoCreateInput) {
    return request<TipoDocumentoProyectoOption>(`/api/tipos-documento-proyecto/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tipoDocumentoProyecto),
    });
  },

  deleteTipoDocumentoProyecto(id: string) {
    return request<void>(`/api/tipos-documento-proyecto/${id}`, {
      method: 'DELETE',
    });
  },

  getHitosPagoProyecto() {
    return request<HitoPagoProyecto[]>('/api/control-pagos/hitos');
  },

  createHitoPagoProyecto(hito: HitoPagoProyectoCreateInput) {
    return request<HitoPagoProyecto>('/api/control-pagos/hitos', {
      method: 'POST',
      body: JSON.stringify(hito),
    });
  },

  updateHitoPagoProyecto(id: string, hito: HitoPagoProyectoCreateInput) {
    return request<HitoPagoProyecto>(`/api/control-pagos/hitos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(hito),
    });
  },

  deleteHitoPagoProyecto(id: string) {
    return request<void>(`/api/control-pagos/hitos/${id}`, {
      method: 'DELETE',
    });
  },

  getDocumentosProyecto() {
    return request<DocumentoProyectoRecord[]>('/api/control-pagos/documentos');
  },

  createDocumentoProyecto(documento: DocumentoProyectoRecordCreateInput) {
    return request<DocumentoProyectoRecord>('/api/control-pagos/documentos', {
      method: 'POST',
      body: JSON.stringify(documento),
    });
  },

  updateDocumentoProyecto(id: string, documento: DocumentoProyectoRecordCreateInput) {
    return request<DocumentoProyectoRecord>(`/api/control-pagos/documentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(documento),
    });
  },

  deleteDocumentoProyecto(id: string) {
    return request<void>(`/api/control-pagos/documentos/${id}`, {
      method: 'DELETE',
    });
  },

  createGasto(gasto: Omit<Gasto, 'id'>) {
    return request<Gasto>('/api/gastos', {
      method: 'POST',
      body: buildGastoFormData(gasto),
    });
  },

  updateGasto(id: string, gasto: Omit<Gasto, 'id'>) {
    return request<Gasto>(`/api/gastos/${id}`, {
      method: 'PUT',
      body: buildGastoFormData(gasto),
    });
  },

  deleteGasto(id: string) {
    return request<void>(`/api/gastos/${id}`, {
      method: 'DELETE',
    });
  },
};

export type {
  BootstrapResponse,
  CategoriaCreateInput,
  CategoriaOption,
  ColaboradorCreateInput,
  ConfiguracionResponse,
  DocumentoProyectoRecord,
  DocumentoProyectoRecordCreateInput,
  EmpresaCreateInput,
  HitoPagoProyecto,
  HitoPagoProyectoCreateInput,
  MonedaProyecto,
  ProyectoCreateInput,
  TenantInfo,
  TipoDocumentoCreateInput,
  TipoDocumentoOption,
  TipoDocumentoProyectoCreateInput,
  TipoDocumentoProyectoOption,
};
