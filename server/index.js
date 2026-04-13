import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { closePool, getTenant, pool, query } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

let viteDevServer = null;
const CATEGORY_COLOR_PALETTE = [
  '#FFFFBA',
  '#BAFFC9',
  '#BAE1FF',
  '#B0E0E6',
  '#DDA0DD',
  '#FFD6A5',
];
const tableColumnsCache = new Map();
const CONTROL_PAGOS_HITOS_TABLE = 'fct_hito_pago_proyecto';
const CONTROL_PAGOS_DOCUMENTOS_TABLE = 'fct_documento_proyecto';
const DOCUMENTOS_TABLE = 'documentos';
const GASTO_DOCUMENTOS_TABLE = 'fct_gasto_documento';
const STORAGE_API_URL = String(process.env.STORAGE_API_URL || '').replace(/\/+$/, '');
const STORAGE_API_SECRET = String(process.env.STORAGE_API_SECRET || '');
const MAX_GASTO_ATTACHMENT_SIZE_MB = Number(process.env.MAX_GASTO_ATTACHMENT_SIZE_MB || 25);
let controlPagosHitosSchemaPromise = null;
let controlPagosDocumentosSchemaPromise = null;
let documentosSchemaPromise = null;
let gastoDocumentosSchemaPromise = null;

const gastoAttachmentsUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, MAX_GASTO_ATTACHMENT_SIZE_MB) * 1024 * 1024,
  },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const proyectoInputSchema = z.object({
  nombre: z.string().trim().min(1),
  codigoProyecto: z.string().optional().nullable(),
  montoTotalProyecto: z.coerce.number().optional().nullable(),
  monedaBase: z.enum(['CLP', 'UF', 'USD']).optional().nullable(),
});

const categoriaInputSchema = z.object({
  nombre: z.string().trim().min(1),
  color: z.string().optional().nullable(),
});

const empresaInputSchema = z.object({
  razonSocial: z.string().trim().min(1),
  rut: z.string().optional().nullable(),
  numeroContacto: z.string().optional().nullable(),
  correoElectronico: z.string().optional().nullable(),
  categoria: z.enum(['Empresa', 'Persona Natural']).optional().nullable(),
});

const colaboradorInputSchema = z.object({
  nombre: z.string().trim().min(1),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telefono: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
});

const tipoDocumentoInputSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().optional().nullable(),
});

const tipoDocumentoProyectoInputSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().optional().nullable(),
});

const gastoInputSchema = z.object({
  fecha: z.string().min(1),
  empresaId: z.string().uuid(),
  categoria: z.string().uuid().optional().nullable(),
  tipoDocumento: z.string().uuid().optional().nullable(),
  numeroDocumento: z.string().default(''),
  monto: z.coerce.number().optional(),
  montoNeto: z.coerce.number().optional().nullable(),
  iva: z.coerce.number().optional().nullable(),
  montoTotal: z.coerce.number().optional(),
  detalle: z.string().optional().nullable(),
  proyectoId: z.string().uuid().optional().nullable(),
  colaboradorId: z.string().uuid().optional().nullable(),
  comentarioTipoDocumento: z.string().optional().nullable(),
  existingAttachmentIds: z.array(z.string().uuid()).optional().default([]),
});

const hitoPagoProyectoInputSchema = z.object({
  proyectoId: z.string().uuid(),
  nroHito: z.coerce.number().int().positive().optional().nullable(),
  montoHito: z.coerce.number().positive(),
  moneda: z.enum(['CLP', 'UF', 'USD']).optional().nullable(),
  fechaCompromiso: z.string().optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  facturado: z.boolean().optional().nullable(),
  pagado: z.boolean().optional().nullable(),
  observacion: z.string().optional().nullable(),
});

const documentoProyectoInputSchema = z.object({
  proyectoId: z.string().uuid(),
  tipoDocumentoProyectoId: z.string().uuid(),
  fechaDocumento: z.string().optional().nullable(),
  nroReferencia: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
});

function toNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function normalizeText(value, { uppercase = false, lowercase = false } = {}) {
  const rawValue = typeof value === 'string' ? value.trim() : '';

  if (!rawValue) {
    return '';
  }

  if (uppercase) {
    return rawValue.toUpperCase();
  }

  if (lowercase) {
    return rawValue.toLowerCase();
  }

  return rawValue;
}

function normalizeNullableText(value, options) {
  const normalized = normalizeText(value, options);
  return normalized || null;
}

function normalizeNumeric(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertStorageApiConfigured() {
  if (!STORAGE_API_URL || !STORAGE_API_SECRET) {
    throw new Error('La integracion de almacenamiento no esta configurada en el backend');
  }
}

function buildStorageApiUrl(endpointPath, searchParams) {
  const url = new URL(endpointPath, `${STORAGE_API_URL}/`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function uploadBufferToStorage({ buffer, fileName, mimeType, folder, projectId, recordId }) {
  assertStorageApiConfigured();

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName);
  formData.append('folder', folder || 'gastos');

  if (projectId) {
    formData.append('projectId', projectId);
  }

  if (recordId) {
    formData.append('recordId', recordId);
  }

  const response = await fetch(buildStorageApiUrl('/upload'), {
    method: 'POST',
    headers: {
      'x-upload-secret': STORAGE_API_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`No se pudo subir el archivo a Cloud Storage: ${response.status} ${errorBody}`.trim());
  }

  return response.json();
}

async function deleteStorageObject(objectPath) {
  if (!objectPath || !STORAGE_API_URL || !STORAGE_API_SECRET) {
    return;
  }

  const response = await fetch(buildStorageApiUrl('/objects'), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-upload-secret': STORAGE_API_SECRET,
    },
    body: JSON.stringify({ objectPath }),
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`No se pudo eliminar el archivo en storage: ${response.status} ${errorBody}`.trim());
  }
}

function maybeHandleMultipartUploads(req, res, next) {
  if (req.is('multipart/form-data')) {
    return gastoAttachmentsUpload.array('archivosAdjuntos')(req, res, next);
  }

  next();
}

function parseGastoPayload(req) {
  if (typeof req.body?.payload === 'string') {
    return JSON.parse(req.body.payload);
  }

  return req.body;
}

function getCategoryColor(nombre) {
  const hash = [...nombre].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const result = await query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
    `,
    [tableName],
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

async function getActiveColumnName(tableName) {
  const columns = await getTableColumns(tableName);

  if (columns.has('activo')) {
    return 'activo';
  }

  if (columns.has('activa')) {
    return 'activa';
  }

  return null;
}

function getRowActiveValue(row) {
  if (typeof row.activo === 'boolean') {
    return row.activo;
  }

  if (typeof row.activa === 'boolean') {
    return row.activa;
  }

  return undefined;
}

function mapEmpresa(row) {
  return {
    id: row.id,
    razonSocial: row.razon_social,
    rut: row.rut || '',
    numeroContacto: row.numero_contacto || undefined,
    correoElectronico: row.correo_electronico || undefined,
    categoria: row.categoria || undefined,
    activo: getRowActiveValue(row),
    createdAt: row.created_at,
  };
}

function mapProyecto(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    codigoProyecto: row.codigo_proyecto || undefined,
    montoTotalProyecto: normalizeNumeric(row.monto_total_proyecto) ?? undefined,
    monedaBase: row.moneda_base || undefined,
    activo: getRowActiveValue(row),
    createdAt: row.created_at,
  };
}

function mapCategoria(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    color: row.color || undefined,
    activa: getRowActiveValue(row),
  };
}

function mapTipoDocumento(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || undefined,
    activo: getRowActiveValue(row),
  };
}

function mapTipoDocumentoProyecto(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || undefined,
    activo: getRowActiveValue(row),
    createdAt: row.created_at,
  };
}

function mapColaborador(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email || undefined,
    telefono: row.telefono || undefined,
    cargo: row.cargo || undefined,
    activo: getRowActiveValue(row),
    createdAt: row.created_at,
  };
}

function mapGasto(row) {
  const montoTotal = Number(row.monto_total);
  const montoNeto = row.monto_neto !== null ? Number(row.monto_neto) : undefined;
  const iva = row.iva !== null ? Number(row.iva) : undefined;
  const archivosAdjuntosRaw = Array.isArray(row.archivos_adjuntos)
    ? row.archivos_adjuntos
    : typeof row.archivos_adjuntos === 'string'
      ? JSON.parse(row.archivos_adjuntos)
      : [];

  return {
    id: row.id,
    fecha: row.fecha,
    empresaId: row.empresa_id,
    categoria: row.categoria_id || '',
    tipoDocumento: row.tipo_documento_id || '',
    numeroDocumento: row.numero_documento || '',
    monto: montoTotal,
    montoNeto,
    iva,
    montoTotal,
    detalle: row.detalle || undefined,
    proyectoId: row.proyecto_id || undefined,
    colaboradorId: row.colaborador_id || undefined,
    colaboradorNombre: row.colaborador_nombre || undefined,
    comentarioTipoDocumento: row.comentario_tipo_documento || undefined,
    archivosAdjuntos: archivosAdjuntosRaw
      .filter((archivo) => archivo && archivo.id && archivo.nombre)
      .map((archivo) => ({
        id: archivo.id,
        nombre: archivo.nombre,
        url: archivo.url,
        tipo: archivo.tipo || 'application/octet-stream',
      })),
  };
}

function mapHitoPagoProyecto(row) {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    codigoProyecto: row.codigo_proyecto || undefined,
    nroHito: Number(row.nro_hito || 0),
    montoHito: Number(row.monto || 0),
    moneda: row.moneda || row.moneda_base || 'CLP',
    fechaCompromiso: row.fecha_compromiso || '',
    fechaPago: row.fecha_pago || undefined,
    facturado: Boolean(row.facturado),
    pagado: Boolean(row.pagado),
    observacion: row.observacion || row.descripcion || undefined,
    createdAt: row.created_at,
  };
}

function mapDocumentoProyecto(row) {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    codigoProyecto: row.codigo_proyecto || undefined,
    tipoDocumentoProyectoId: row.tipo_documento_id,
    tipoDocumentoNombre: row.tipo_documento_nombre || undefined,
    fechaDocumento: row.fecha_documento || undefined,
    nroReferencia: row.nro_referencia || undefined,
    observacion: row.observacion || undefined,
    createdAt: row.created_at,
    archivoAdjunto: row.nombre_archivo
      ? {
          nombre: row.nombre_archivo,
          url: row.documento_storage_id ? `/api/documentos/${row.documento_storage_id}/contenido` : '',
          tipo: row.mime_type || 'application/octet-stream',
        }
      : undefined,
  };
}

function getHitoEstado({ facturado, pagado }) {
  if (pagado) {
    return 'PAGADO';
  }

  if (facturado) {
    return 'FACTURADO';
  }

  return 'PENDIENTE';
}

async function ensureControlPagosHitosSchema() {
  if (controlPagosHitosSchemaPromise) {
    return controlPagosHitosSchemaPromise;
  }

  controlPagosHitosSchemaPromise = (async () => {
    await query(`
      create table if not exists ${CONTROL_PAGOS_HITOS_TABLE} (
        id uuid primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        proyecto_id uuid not null references dim_proyecto(id) on delete restrict,
        nombre character varying,
        descripcion text,
        fecha_compromiso date,
        fecha_pago date,
        monto numeric,
        estado character varying,
        created_at timestamp with time zone not null default now(),
        updated_at timestamp with time zone not null default now()
      )
    `);

    await query(`
      alter table ${CONTROL_PAGOS_HITOS_TABLE}
      add column if not exists nro_hito integer
    `);
    await query(`
      alter table ${CONTROL_PAGOS_HITOS_TABLE}
      add column if not exists moneda character varying(3) not null default 'CLP'
    `);
    await query(`
      alter table ${CONTROL_PAGOS_HITOS_TABLE}
      add column if not exists facturado boolean not null default false
    `);
    await query(`
      alter table ${CONTROL_PAGOS_HITOS_TABLE}
      add column if not exists pagado boolean not null default false
    `);
    await query(`
      alter table ${CONTROL_PAGOS_HITOS_TABLE}
      add column if not exists observacion text
    `);

    await query(`
      update ${CONTROL_PAGOS_HITOS_TABLE}
      set moneda = 'CLP'
      where moneda is null
         or trim(moneda) = ''
    `);
    await query(`
      update ${CONTROL_PAGOS_HITOS_TABLE}
      set facturado = false
      where facturado is null
    `);
    await query(`
      update ${CONTROL_PAGOS_HITOS_TABLE}
      set pagado = false
      where pagado is null
    `);
    await query(`
      update ${CONTROL_PAGOS_HITOS_TABLE}
      set observacion = descripcion
      where observacion is null
        and descripcion is not null
        and trim(descripcion) <> ''
    `);
    await query(`
      with ranked as (
        select
          id,
          row_number() over (
            partition by tenant_id, proyecto_id
            order by coalesce(fecha_compromiso, fecha_pago, created_at), created_at, id
          ) as next_nro
        from ${CONTROL_PAGOS_HITOS_TABLE}
      )
      update ${CONTROL_PAGOS_HITOS_TABLE} as hitos
      set nro_hito = ranked.next_nro
      from ranked
      where hitos.id = ranked.id
        and hitos.nro_hito is null
    `);
    await query(`
      update ${CONTROL_PAGOS_HITOS_TABLE}
      set estado = case
        when pagado = true then 'PAGADO'
        when facturado = true then 'FACTURADO'
        else 'PENDIENTE'
      end
      where estado is null
         or trim(estado) = ''
    `);
    await query(`
      create unique index if not exists uq_fct_hito_pago_proyecto_tenant_proyecto_nro_hito
      on ${CONTROL_PAGOS_HITOS_TABLE} (tenant_id, proyecto_id, nro_hito)
      where nro_hito is not null
    `);

    tableColumnsCache.delete(CONTROL_PAGOS_HITOS_TABLE);
  })().catch((error) => {
    controlPagosHitosSchemaPromise = null;
    throw error;
  });

  return controlPagosHitosSchemaPromise;
}

async function ensureControlPagosDocumentosSchema() {
  if (controlPagosDocumentosSchemaPromise) {
    return controlPagosDocumentosSchemaPromise;
  }

  controlPagosDocumentosSchemaPromise = (async () => {
    await ensureDocumentosSchema();

    await query(`
      create table if not exists ${CONTROL_PAGOS_DOCUMENTOS_TABLE} (
        id uuid primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        proyecto_id uuid not null references dim_proyecto(id) on delete restrict,
        documento_id uuid references documentos(id) on delete set null,
        tipo_documento_id uuid references dim_tipo_documento_proyecto(id) on delete set null,
        created_at timestamp with time zone not null default now()
      )
    `);

    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      alter column documento_id drop not null
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      drop constraint if exists fct_documento_proyecto_tipo_documento_id_fkey
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      add constraint fct_documento_proyecto_tipo_documento_id_fkey
      foreign key (tipo_documento_id)
      references dim_tipo_documento_proyecto(id)
      on delete set null
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      add column if not exists fecha_documento date
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      add column if not exists nro_referencia character varying
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      add column if not exists observacion text
    `);
    await query(`
      alter table ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      add column if not exists updated_at timestamp with time zone not null default now()
    `);

    await query(`
      update ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
      set updated_at = created_at
      where updated_at is null
    `);
    await query(`
      create index if not exists idx_fct_documento_proyecto_tenant_proyecto
      on ${CONTROL_PAGOS_DOCUMENTOS_TABLE} (tenant_id, proyecto_id)
    `);

    tableColumnsCache.delete(CONTROL_PAGOS_DOCUMENTOS_TABLE);
  })().catch((error) => {
    controlPagosDocumentosSchemaPromise = null;
    throw error;
  });

  return controlPagosDocumentosSchemaPromise;
}

async function ensureDocumentosSchema() {
  if (documentosSchemaPromise) {
    return documentosSchemaPromise;
  }

  documentosSchemaPromise = (async () => {
    await query(`
      create table if not exists ${DOCUMENTOS_TABLE} (
        id uuid primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        nombre_archivo character varying not null,
        mime_type character varying not null default 'application/octet-stream',
        storage_path text not null,
        size_bytes bigint,
        created_at timestamp with time zone not null default now(),
        updated_at timestamp with time zone not null default now()
      )
    `);

    await query(`
      create index if not exists idx_documentos_tenant_created_at
      on ${DOCUMENTOS_TABLE} (tenant_id, created_at desc)
    `);

    tableColumnsCache.delete(DOCUMENTOS_TABLE);
  })().catch((error) => {
    documentosSchemaPromise = null;
    throw error;
  });

  return documentosSchemaPromise;
}

async function ensureGastoDocumentosSchema() {
  if (gastoDocumentosSchemaPromise) {
    return gastoDocumentosSchemaPromise;
  }

  gastoDocumentosSchemaPromise = (async () => {
    await ensureDocumentosSchema();

    await query(`
      create table if not exists ${GASTO_DOCUMENTOS_TABLE} (
        id uuid primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        gasto_id uuid not null references fct_gasto(id) on delete cascade,
        documento_id uuid not null references ${DOCUMENTOS_TABLE}(id) on delete cascade,
        created_at timestamp with time zone not null default now(),
        unique (tenant_id, gasto_id, documento_id)
      )
    `);

    await query(`
      create index if not exists idx_fct_gasto_documento_tenant_gasto
      on ${GASTO_DOCUMENTOS_TABLE} (tenant_id, gasto_id, created_at asc)
    `);

    await query(`
      create index if not exists idx_fct_gasto_documento_tenant_documento
      on ${GASTO_DOCUMENTOS_TABLE} (tenant_id, documento_id)
    `);
  })().catch((error) => {
    gastoDocumentosSchemaPromise = null;
    throw error;
  });

  return gastoDocumentosSchemaPromise;
}

async function deactivateOrDeleteDimension(tenantId, tableName, itemId) {
  const activeColumn = await getActiveColumnName(tableName);

  if (activeColumn) {
    return query(
      `
        update ${tableName}
        set
          ${activeColumn} = false,
          updated_at = now()
        where tenant_id = $1
          and id = $2
      `,
      [tenantId, itemId],
    );
  }

  return query(
    `
      delete from ${tableName}
      where tenant_id = $1
        and id = $2
    `,
    [tenantId, itemId],
  );
}

async function fetchBootstrapData(tenantId) {
  const [
    empresaActiveColumn,
    proyectoActiveColumn,
    categoriaActiveColumn,
    tipoDocumentoActiveColumn,
    colaboradorActiveColumn,
  ] = await Promise.all([
    getActiveColumnName('dim_empresa'),
    getActiveColumnName('dim_proyecto'),
    getActiveColumnName('dim_categoria'),
    getActiveColumnName('dim_tipo_documento'),
    getActiveColumnName('dim_colaborador'),
  ]);

  const [empresas, proyectos, categorias, tiposDocumento, colaboradores] = await Promise.all([
    query(
      `
        select *
        from dim_empresa
        where tenant_id = $1
        ${empresaActiveColumn ? `  and ${empresaActiveColumn} = true` : ''}
        order by razon_social asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_proyecto
        where tenant_id = $1
        ${proyectoActiveColumn ? `  and ${proyectoActiveColumn} = true` : ''}
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_categoria
        where tenant_id = $1
        ${categoriaActiveColumn ? `  and ${categoriaActiveColumn} = true` : ''}
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_tipo_documento
        where tenant_id = $1
        ${tipoDocumentoActiveColumn ? `  and ${tipoDocumentoActiveColumn} = true` : ''}
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_colaborador
        where tenant_id = $1
        ${colaboradorActiveColumn ? `  and ${colaboradorActiveColumn} = true` : ''}
        order by nombre asc
      `,
      [tenantId],
    ),
  ]);

  return {
    empresas: empresas.rows.map(mapEmpresa),
    proyectos: proyectos.rows.map(mapProyecto),
    categorias: categorias.rows.map(mapCategoria),
    tiposDocumento: tiposDocumento.rows.map(mapTipoDocumento),
    colaboradores: colaboradores.rows.map(mapColaborador),
  };
}

async function fetchConfigurationData(tenantId) {
  const [empresas, proyectos, colaboradores, categorias, tiposDocumento, tiposDocumentoProyecto] = await Promise.all([
    query(
      `
        select *
        from dim_empresa
        where tenant_id = $1
        order by razon_social asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_proyecto
        where tenant_id = $1
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_colaborador
        where tenant_id = $1
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_categoria
        where tenant_id = $1
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_tipo_documento
        where tenant_id = $1
        order by nombre asc
      `,
      [tenantId],
    ),
    query(
      `
        select *
        from dim_tipo_documento_proyecto
        where tenant_id = $1
        order by nombre asc
      `,
      [tenantId],
    ),
  ]);

  return {
    empresas: empresas.rows.map(mapEmpresa),
    proyectos: proyectos.rows.map(mapProyecto),
    colaboradores: colaboradores.rows.map(mapColaborador),
    categorias: categorias.rows.map(mapCategoria),
    tiposDocumento: tiposDocumento.rows.map(mapTipoDocumento),
    tiposDocumentoProyecto: tiposDocumentoProyecto.rows.map(mapTipoDocumentoProyecto),
  };
}

async function fetchGastos(tenantId) {
  await ensureGastoDocumentosSchema();

  const result = await query(
    `
      select
        g.*,
        c.nombre as colaborador_nombre,
        coalesce(
          json_agg(
            json_build_object(
              'id', d.id,
              'nombre', d.nombre_archivo,
              'url', '/api/documentos/' || d.id || '/contenido',
              'tipo', d.mime_type
            )
            order by gd.created_at asc
          ) filter (where d.id is not null),
          '[]'::json
        ) as archivos_adjuntos
      from fct_gasto g
      left join dim_colaborador c
        on c.id = g.colaborador_id
      left join ${GASTO_DOCUMENTOS_TABLE} gd
        on gd.tenant_id = g.tenant_id
       and gd.gasto_id = g.id
      left join ${DOCUMENTOS_TABLE} d
        on d.tenant_id = g.tenant_id
       and d.id = gd.documento_id
      where g.tenant_id = $1
      group by g.id, c.nombre
      order by g.fecha desc, g.created_at desc
    `,
    [tenantId],
  );

  return result.rows.map(mapGasto);
}

async function fetchGastoById(tenantId, gastoId) {
  await ensureGastoDocumentosSchema();

  const result = await query(
    `
      select
        g.*,
        c.nombre as colaborador_nombre,
        coalesce(
          json_agg(
            json_build_object(
              'id', d.id,
              'nombre', d.nombre_archivo,
              'url', '/api/documentos/' || d.id || '/contenido',
              'tipo', d.mime_type
            )
            order by gd.created_at asc
          ) filter (where d.id is not null),
          '[]'::json
        ) as archivos_adjuntos
      from fct_gasto g
      left join dim_colaborador c
        on c.id = g.colaborador_id
      left join ${GASTO_DOCUMENTOS_TABLE} gd
        on gd.tenant_id = g.tenant_id
       and gd.gasto_id = g.id
      left join ${DOCUMENTOS_TABLE} d
        on d.tenant_id = g.tenant_id
       and d.id = gd.documento_id
      where g.tenant_id = $1
        and g.id = $2
      group by g.id, c.nombre
      limit 1
    `,
    [tenantId, gastoId],
  );

  return result.rows[0] ? mapGasto(result.rows[0]) : null;
}

async function fetchGastoDocumentos(tenantId, gastoId, db = query) {
  const result = await db(
    `
      select
        d.id,
        d.nombre_archivo,
        d.mime_type,
        d.storage_path,
        d.size_bytes
      from ${GASTO_DOCUMENTOS_TABLE} gd
      inner join ${DOCUMENTOS_TABLE} d
        on d.tenant_id = gd.tenant_id
       and d.id = gd.documento_id
      where gd.tenant_id = $1
        and gd.gasto_id = $2
      order by gd.created_at asc
    `,
    [tenantId, gastoId],
  );

  return result.rows;
}

async function createDocumentoRecord(db, tenantId, documento) {
  const documentoId = randomUUID();

  await db(
    `
      insert into ${DOCUMENTOS_TABLE} (
        id,
        tenant_id,
        nombre_archivo,
        mime_type,
        storage_path,
        size_bytes
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      documentoId,
      tenantId,
      documento.originalName,
      documento.contentType || 'application/octet-stream',
      documento.objectPath,
      normalizeNumeric(documento.sizeBytes),
    ],
  );

  return documentoId;
}

async function attachUploadedFilesToGasto(db, tenantId, gastoId, uploadedFiles) {
  for (const uploadedFile of uploadedFiles) {
    const documentoId = await createDocumentoRecord(db, tenantId, uploadedFile);

    await db(
      `
        insert into ${GASTO_DOCUMENTOS_TABLE} (
          id,
          tenant_id,
          gasto_id,
          documento_id
        )
        values ($1, $2, $3, $4)
      `,
      [randomUUID(), tenantId, gastoId, documentoId],
    );
  }
}

async function removeGastoDocumentos(db, tenantId, gastoId, documentIdsToRemove) {
  if (documentIdsToRemove.length === 0) {
    return [];
  }

  const result = await db(
    `
      delete from ${DOCUMENTOS_TABLE} d
      using ${GASTO_DOCUMENTOS_TABLE} gd
      where gd.tenant_id = $1
        and gd.gasto_id = $2
        and gd.documento_id = any($3::uuid[])
        and d.tenant_id = gd.tenant_id
        and d.id = gd.documento_id
      returning d.id, d.storage_path
    `,
    [tenantId, gastoId, documentIdsToRemove],
  );

  return result.rows;
}

async function cleanupStorageObjects(records) {
  for (const record of records) {
    try {
      await deleteStorageObject(record.objectPath || record.storage_path);
    } catch (error) {
      console.warn('No se pudo eliminar un objeto en Cloud Storage', {
        objectPath: record.objectPath || record.storage_path,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

async function fetchStoredDocumentById(tenantId, documentId) {
  await ensureDocumentosSchema();

  const result = await query(
    `
      select id, nombre_archivo, mime_type, storage_path, size_bytes
      from ${DOCUMENTOS_TABLE}
      where tenant_id = $1
        and id = $2
      limit 1
    `,
    [tenantId, documentId],
  );

  return result.rows[0] || null;
}

async function fetchHitosPagoProyecto(tenantId) {
  await ensureControlPagosHitosSchema();

  const result = await query(
    `
      select
        h.*,
        p.codigo_proyecto,
        p.moneda_base
      from ${CONTROL_PAGOS_HITOS_TABLE} h
      inner join dim_proyecto p
        on p.id = h.proyecto_id
      where h.tenant_id = $1
      order by p.nombre asc, h.nro_hito asc, h.created_at asc
    `,
    [tenantId],
  );

  return result.rows.map(mapHitoPagoProyecto);
}

async function fetchHitoPagoProyectoById(tenantId, hitoId) {
  await ensureControlPagosHitosSchema();

  const result = await query(
    `
      select
        h.*,
        p.codigo_proyecto,
        p.moneda_base
      from ${CONTROL_PAGOS_HITOS_TABLE} h
      inner join dim_proyecto p
        on p.id = h.proyecto_id
      where h.tenant_id = $1
        and h.id = $2
      limit 1
    `,
    [tenantId, hitoId],
  );

  return result.rows[0] ? mapHitoPagoProyecto(result.rows[0]) : null;
}

async function getNextHitoNumber(tenantId, proyectoId) {
  await ensureControlPagosHitosSchema();

  const result = await query(
    `
      select coalesce(max(nro_hito), 0) + 1 as next_nro
      from ${CONTROL_PAGOS_HITOS_TABLE}
      where tenant_id = $1
        and proyecto_id = $2
    `,
    [tenantId, proyectoId],
  );

  return Number(result.rows[0]?.next_nro || 1);
}

async function fetchDocumentosProyecto(tenantId) {
  await ensureControlPagosDocumentosSchema();

  const result = await query(
    `
      select
        dp.*,
        p.codigo_proyecto,
        t.nombre as tipo_documento_nombre,
        d.id as documento_storage_id,
        d.nombre_archivo,
        d.mime_type,
        d.storage_path
      from ${CONTROL_PAGOS_DOCUMENTOS_TABLE} dp
      inner join dim_proyecto p
        on p.id = dp.proyecto_id
      left join dim_tipo_documento_proyecto t
        on t.id = dp.tipo_documento_id
      left join documentos d
        on d.id = dp.documento_id
       and d.tenant_id = dp.tenant_id
      where dp.tenant_id = $1
      order by dp.fecha_documento desc nulls last, dp.created_at desc
    `,
    [tenantId],
  );

  return result.rows.map(mapDocumentoProyecto);
}

async function fetchDocumentoProyectoById(tenantId, documentoProyectoId) {
  await ensureControlPagosDocumentosSchema();

  const result = await query(
    `
      select
        dp.*,
        p.codigo_proyecto,
        t.nombre as tipo_documento_nombre,
        d.id as documento_storage_id,
        d.nombre_archivo,
        d.mime_type,
        d.storage_path
      from ${CONTROL_PAGOS_DOCUMENTOS_TABLE} dp
      inner join dim_proyecto p
        on p.id = dp.proyecto_id
      left join dim_tipo_documento_proyecto t
        on t.id = dp.tipo_documento_id
      left join documentos d
        on d.id = dp.documento_id
       and d.tenant_id = dp.tenant_id
      where dp.tenant_id = $1
        and dp.id = $2
      limit 1
    `,
    [tenantId, documentoProyectoId],
  );

  return result.rows[0] ? mapDocumentoProyecto(result.rows[0]) : null;
}

app.get('/api/health', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const dbCheck = await query('select now() as now');

    res.json({
      ok: true,
      serverTime: dbCheck.rows[0].now,
      tenant,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido al verificar la base de datos',
    });
  }
});

app.get('/api/bootstrap', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const data = await fetchBootstrapData(tenant.id);

    res.json({
      tenant,
      ...data,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al cargar catalogos',
    });
  }
});

app.get('/api/configuracion', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const data = await fetchConfigurationData(tenant.id);

    res.json({
      tenant,
      ...data,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al cargar configuracion',
    });
  }
});

app.post('/api/proyectos', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = proyectoInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_proyecto');
    const columns = [
      'id',
      'tenant_id',
      'nombre',
      'codigo_proyecto',
      'monto_total_proyecto',
      'moneda_base',
    ];
    const values = [
      randomUUID(),
      tenant.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.codigoProyecto, { uppercase: true }),
      normalizeNumeric(payload.montoTotalProyecto),
      normalizeNullableText(payload.monedaBase, { uppercase: true }),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(true);
    }

    const result = await query(
      `
        insert into dim_proyecto (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapProyecto(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear proyecto',
    });
  }
});

app.put('/api/proyectos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = proyectoInputSchema.extend({
      activo: z.boolean().optional().nullable(),
    }).parse(req.body);
    const activeColumn = await getActiveColumnName('dim_proyecto');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.codigoProyecto, { uppercase: true }),
      normalizeNumeric(payload.montoTotalProyecto),
      normalizeNullableText(payload.monedaBase, { uppercase: true }),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $7`;
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        update dim_proyecto
        set
          nombre = $3,
          codigo_proyecto = $4,
          monto_total_proyecto = $5,
          moneda_base = $6${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json(mapProyecto(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar proyecto',
    });
  }
});

app.delete('/api/proyectos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_proyecto', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar el proyecto porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar proyecto',
    });
  }
});

app.post('/api/categorias', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = categoriaInputSchema.parse(req.body);
    const nombre = normalizeText(payload.nombre, { uppercase: true });
    const activeColumn = await getActiveColumnName('dim_categoria');
    const columns = ['id', 'tenant_id', 'nombre', 'color'];
    const values = [
      randomUUID(),
      tenant.id,
      nombre,
      normalizeNullableText(payload.color) || getCategoryColor(nombre),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(true);
    }

    const result = await query(
      `
        insert into dim_categoria (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapCategoria(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear categoria',
    });
  }
});

app.put('/api/categorias/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = categoriaInputSchema.extend({
      activa: z.boolean().optional().nullable(),
    }).parse(req.body);
    const activeColumn = await getActiveColumnName('dim_categoria');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.color),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $5`;
      values.push(payload.activa ?? true);
    }

    const result = await query(
      `
        update dim_categoria
        set
          nombre = $3,
          color = $4${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoria no encontrada' });
    }

    res.json(mapCategoria(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar categoria',
    });
  }
});

app.delete('/api/categorias/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_categoria', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoria no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar la categoria porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar categoria',
    });
  }
});

app.post('/api/empresas', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = empresaInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_empresa');
    const columns = [
      'id',
      'tenant_id',
      'razon_social',
      'rut',
      'numero_contacto',
      'correo_electronico',
      'categoria',
    ];
    const values = [
      randomUUID(),
      tenant.id,
      normalizeText(payload.razonSocial, { uppercase: true }),
      normalizeNullableText(payload.rut, { uppercase: true }),
      normalizeNullableText(payload.numeroContacto),
      normalizeNullableText(payload.correoElectronico, { lowercase: true }),
      normalizeNullableText(payload.categoria),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(true);
    }

    const result = await query(
      `
        insert into dim_empresa (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapEmpresa(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear empresa',
    });
  }
});

app.put('/api/empresas/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = empresaInputSchema.extend({
      activo: z.boolean().optional().nullable(),
    }).parse(req.body);
    const activeColumn = await getActiveColumnName('dim_empresa');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.razonSocial, { uppercase: true }),
      normalizeNullableText(payload.rut, { uppercase: true }),
      normalizeNullableText(payload.numeroContacto),
      normalizeNullableText(payload.correoElectronico, { lowercase: true }),
      normalizeNullableText(payload.categoria),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $8`;
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        update dim_empresa
        set
          razon_social = $3,
          rut = $4,
          numero_contacto = $5,
          correo_electronico = $6,
          categoria = $7${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(mapEmpresa(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar empresa',
    });
  }
});

app.delete('/api/empresas/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_empresa', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar la empresa porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar empresa',
    });
  }
});

app.post('/api/colaboradores', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = colaboradorInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_colaborador');
    const columns = ['id', 'tenant_id', 'nombre', 'email', 'telefono', 'cargo'];
    const values = [
      randomUUID(),
      tenant.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.email, { lowercase: true }),
      normalizeNullableText(payload.telefono),
      normalizeNullableText(payload.cargo, { uppercase: true }),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(true);
    }

    const result = await query(
      `
        insert into dim_colaborador (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapColaborador(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear colaborador',
    });
  }
});

app.put('/api/colaboradores/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = colaboradorInputSchema.extend({
      activo: z.boolean().optional().nullable(),
    }).parse(req.body);
    const activeColumn = await getActiveColumnName('dim_colaborador');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.email, { lowercase: true }),
      normalizeNullableText(payload.telefono),
      normalizeNullableText(payload.cargo, { uppercase: true }),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $7`;
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        update dim_colaborador
        set
          nombre = $3,
          email = $4,
          telefono = $5,
          cargo = $6${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    res.json(mapColaborador(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar colaborador',
    });
  }
});

app.delete('/api/colaboradores/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_colaborador', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar el colaborador porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar colaborador',
    });
  }
});

app.post('/api/tipos-documento', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = tipoDocumentoInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_tipo_documento');
    const columns = ['id', 'tenant_id', 'nombre', 'descripcion'];
    const values = [
      randomUUID(),
      tenant.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.descripcion, { uppercase: true }),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        insert into dim_tipo_documento (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapTipoDocumento(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear tipo de documento',
    });
  }
});

app.put('/api/tipos-documento/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = tipoDocumentoInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_tipo_documento');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.descripcion, { uppercase: true }),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $5`;
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        update dim_tipo_documento
        set
          nombre = $3,
          descripcion = $4${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tipo de documento no encontrado' });
    }

    res.json(mapTipoDocumento(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar tipo de documento',
    });
  }
});

app.delete('/api/tipos-documento/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_tipo_documento', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tipo de documento no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar el tipo de documento porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar tipo de documento',
    });
  }
});

app.post('/api/tipos-documento-proyecto', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = tipoDocumentoProyectoInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_tipo_documento_proyecto');
    const columns = ['id', 'tenant_id', 'nombre', 'descripcion'];
    const values = [
      randomUUID(),
      tenant.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.descripcion, { uppercase: true }),
    ];

    if (activeColumn) {
      columns.push(activeColumn);
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        insert into dim_tipo_documento_proyecto (
          ${columns.join(', ')}
        )
        values (${values.map((_, index) => `$${index + 1}`).join(', ')})
        returning *
      `,
      values,
    );

    res.status(201).json(mapTipoDocumentoProyecto(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear documento de proyecto',
    });
  }
});

app.put('/api/tipos-documento-proyecto/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = tipoDocumentoProyectoInputSchema.parse(req.body);
    const activeColumn = await getActiveColumnName('dim_tipo_documento_proyecto');
    const values = [
      tenant.id,
      req.params.id,
      normalizeText(payload.nombre, { uppercase: true }),
      normalizeNullableText(payload.descripcion, { uppercase: true }),
    ];

    let activeFragment = '';
    if (activeColumn) {
      activeFragment = `,\n          ${activeColumn} = $5`;
      values.push(payload.activo ?? true);
    }

    const result = await query(
      `
        update dim_tipo_documento_proyecto
        set
          nombre = $3,
          descripcion = $4${activeFragment},
          updated_at = now()
        where tenant_id = $1
          and id = $2
        returning *
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Documento de proyecto no encontrado' });
    }

    res.json(mapTipoDocumentoProyecto(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar documento de proyecto',
    });
  }
});

app.delete('/api/tipos-documento-proyecto/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const result = await deactivateOrDeleteDimension(tenant.id, 'dim_tipo_documento_proyecto', req.params.id);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Documento de proyecto no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar el documento de proyecto porque tiene registros relacionados.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar documento de proyecto',
    });
  }
});

app.get('/api/control-pagos/hitos', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const hitos = await fetchHitosPagoProyecto(tenant.id);
    res.json(hitos);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al cargar hitos de pago',
    });
  }
});

app.post('/api/control-pagos/hitos', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = hitoPagoProyectoInputSchema.parse(req.body);
    await ensureControlPagosHitosSchema();
    const nroHito = payload.nroHito ?? await getNextHitoNumber(tenant.id, payload.proyectoId);
    const facturado = payload.facturado ?? false;
    const pagado = payload.pagado ?? false;

    const result = await query(
      `
        insert into ${CONTROL_PAGOS_HITOS_TABLE} (
          id,
          tenant_id,
          proyecto_id,
          nombre,
          descripcion,
          fecha_compromiso,
          fecha_pago,
          monto,
          estado,
          nro_hito,
          moneda,
          facturado,
          pagado,
          observacion
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        returning id
      `,
      [
        randomUUID(),
        tenant.id,
        payload.proyectoId,
        `HITO ${nroHito}`,
        normalizeNullableText(payload.observacion, { uppercase: true }),
        toNullable(payload.fechaCompromiso),
        toNullable(payload.fechaPago),
        normalizeNumeric(payload.montoHito),
        getHitoEstado({ facturado, pagado }),
        nroHito,
        normalizeNullableText(payload.moneda, { uppercase: true }) || 'CLP',
        facturado,
        pagado,
        normalizeNullableText(payload.observacion, { uppercase: true }),
      ],
    );
    res.status(201).json(await fetchHitoPagoProyectoById(tenant.id, result.rows[0].id));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un hito con ese numero para el proyecto seleccionado.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear hito de pago',
    });
  }
});

app.put('/api/control-pagos/hitos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = hitoPagoProyectoInputSchema.parse(req.body);
    const existing = await fetchHitoPagoProyectoById(tenant.id, req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Hito no encontrado' });
    }

    const facturado = payload.facturado ?? false;
    const pagado = payload.pagado ?? false;
    const proyectoChanged = String(existing.proyectoId) !== String(payload.proyectoId);
    const nroHito = payload.nroHito
      ?? (proyectoChanged ? await getNextHitoNumber(tenant.id, payload.proyectoId) : existing.nroHito);

    await query(
      `
        update ${CONTROL_PAGOS_HITOS_TABLE}
        set
          proyecto_id = $3,
          nombre = $4,
          descripcion = $5,
          fecha_compromiso = $6,
          fecha_pago = $7,
          monto = $8,
          estado = $9,
          nro_hito = $10,
          moneda = $11,
          facturado = $12,
          pagado = $13,
          observacion = $14,
          updated_at = now()
        where tenant_id = $1
          and id = $2
      `,
      [
        tenant.id,
        req.params.id,
        payload.proyectoId,
        `HITO ${nroHito}`,
        normalizeNullableText(payload.observacion, { uppercase: true }),
        toNullable(payload.fechaCompromiso),
        toNullable(payload.fechaPago),
        normalizeNumeric(payload.montoHito),
        getHitoEstado({ facturado, pagado }),
        nroHito,
        normalizeNullableText(payload.moneda, { uppercase: true }) || 'CLP',
        facturado,
        pagado,
        normalizeNullableText(payload.observacion, { uppercase: true }),
      ],
    );

    res.json(await fetchHitoPagoProyectoById(tenant.id, req.params.id));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un hito con ese numero para el proyecto seleccionado.',
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar hito de pago',
    });
  }
});

app.delete('/api/control-pagos/hitos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const deleteResult = await query(
      `
        delete from ${CONTROL_PAGOS_HITOS_TABLE}
        where tenant_id = $1
          and id = $2
      `,
      [tenant.id, req.params.id],
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Hito no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar hito de pago',
    });
  }
});

app.get('/api/control-pagos/documentos', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const documentos = await fetchDocumentosProyecto(tenant.id);
    res.json(documentos);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al cargar documentos de proyecto',
    });
  }
});

app.post('/api/control-pagos/documentos', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = documentoProyectoInputSchema.parse(req.body);
    await ensureControlPagosDocumentosSchema();

    const result = await query(
      `
        insert into ${CONTROL_PAGOS_DOCUMENTOS_TABLE} (
          id,
          tenant_id,
          proyecto_id,
          documento_id,
          tipo_documento_id,
          fecha_documento,
          nro_referencia,
          observacion
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id
      `,
      [
        randomUUID(),
        tenant.id,
        payload.proyectoId,
        null,
        payload.tipoDocumentoProyectoId,
        toNullable(payload.fechaDocumento),
        normalizeNullableText(payload.nroReferencia, { uppercase: true }),
        normalizeNullableText(payload.observacion, { uppercase: true }),
      ],
    );

    res.status(201).json(await fetchDocumentoProyectoById(tenant.id, result.rows[0].id));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear documento de proyecto',
    });
  }
});

app.put('/api/control-pagos/documentos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const payload = documentoProyectoInputSchema.parse(req.body);
    await ensureControlPagosDocumentosSchema();

    const updateResult = await query(
      `
        update ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
        set
          proyecto_id = $3,
          tipo_documento_id = $4,
          fecha_documento = $5,
          nro_referencia = $6,
          observacion = $7,
          updated_at = now()
        where tenant_id = $1
          and id = $2
      `,
      [
        tenant.id,
        req.params.id,
        payload.proyectoId,
        payload.tipoDocumentoProyectoId,
        toNullable(payload.fechaDocumento),
        normalizeNullableText(payload.nroReferencia, { uppercase: true }),
        normalizeNullableText(payload.observacion, { uppercase: true }),
      ],
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(await fetchDocumentoProyectoById(tenant.id, req.params.id));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar documento de proyecto',
    });
  }
});

app.delete('/api/control-pagos/documentos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    const deleteResult = await query(
      `
        delete from ${CONTROL_PAGOS_DOCUMENTOS_TABLE}
        where tenant_id = $1
          and id = $2
      `,
      [tenant.id, req.params.id],
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar documento de proyecto',
    });
  }
});

app.get('/api/gastos', async (_req, res) => {
  try {
    const tenant = await getTenant();
    const gastos = await fetchGastos(tenant.id);
    res.json(gastos);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al cargar gastos',
    });
  }
});

app.get('/api/documentos/:id/contenido', async (req, res) => {
  try {
    const tenant = await getTenant();
    const documento = await fetchStoredDocumentById(tenant.id, req.params.id);

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    assertStorageApiConfigured();

    const storageResponse = await fetch(
      buildStorageApiUrl('/objects/content', { objectPath: documento.storage_path }),
      {
        headers: {
          'x-upload-secret': STORAGE_API_SECRET,
        },
      },
    );

    if (!storageResponse.ok || !storageResponse.body) {
      const errorBody = await storageResponse.text().catch(() => '');
      return res.status(storageResponse.status === 404 ? 404 : 502).json({
        error: errorBody || 'No se pudo recuperar el archivo almacenado',
      });
    }

    const contentType = storageResponse.headers.get('content-type') || documento.mime_type || 'application/octet-stream';
    const contentLength = storageResponse.headers.get('content-length');
    const encodedName = encodeURIComponent(documento.nombre_archivo);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedName}`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-transform');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    Readable.fromWeb(storageResponse.body).pipe(res);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al descargar documento',
    });
  }
});

app.post('/api/gastos', maybeHandleMultipartUploads, async (req, res) => {
  try {
    const tenant = await getTenant();
    await ensureGastoDocumentosSchema();

    const payload = gastoInputSchema.parse(parseGastoPayload(req));
    const montoTotal = normalizeNumeric(payload.montoTotal ?? payload.monto);
    const uploadedFilesInput = Array.isArray(req.files) ? req.files : [];

    if (montoTotal === null) {
      return res.status(400).json({ error: 'montoTotal es obligatorio' });
    }

    const gastoId = randomUUID();
    const uploadedFiles = [];

    for (const file of uploadedFilesInput) {
      uploadedFiles.push(await uploadBufferToStorage({
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        folder: 'gastos',
        projectId: payload.proyectoId,
        recordId: gastoId,
      }));
    }

    const client = await pool.connect();

    try {
      await client.query('begin');

      await client.query(
        `
          insert into fct_gasto (
            id,
            tenant_id,
            fecha,
            empresa_id,
            categoria_id,
            tipo_documento_id,
            numero_documento,
            monto_neto,
            iva,
            monto_total,
            detalle,
            proyecto_id,
            colaborador_id,
            comentario_tipo_documento
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )
        `,
        [
          gastoId,
          tenant.id,
          payload.fecha,
          payload.empresaId,
          toNullable(payload.categoria),
          toNullable(payload.tipoDocumento),
          payload.numeroDocumento ?? '',
          normalizeNumeric(payload.montoNeto),
          normalizeNumeric(payload.iva),
          montoTotal,
          toNullable(payload.detalle),
          toNullable(payload.proyectoId),
          toNullable(payload.colaboradorId),
          toNullable(payload.comentarioTipoDocumento),
        ],
      );

      await attachUploadedFilesToGasto((text, params) => client.query(text, params), tenant.id, gastoId, uploadedFiles);

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      await cleanupStorageObjects(uploadedFiles);
      throw error;
    } finally {
      client.release();
    }

    const created = await fetchGastoById(tenant.id, gastoId);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Uno de los archivos supera el limite de ${MAX_GASTO_ATTACHMENT_SIZE_MB} MB`,
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al crear gasto',
    });
  }
});

app.put('/api/gastos/:id', maybeHandleMultipartUploads, async (req, res) => {
  try {
    const tenant = await getTenant();
    await ensureGastoDocumentosSchema();

    const payload = gastoInputSchema.parse(parseGastoPayload(req));
    const montoTotal = normalizeNumeric(payload.montoTotal ?? payload.monto);
    const uploadedFilesInput = Array.isArray(req.files) ? req.files : [];

    if (montoTotal === null) {
      return res.status(400).json({ error: 'montoTotal es obligatorio' });
    }

    const uploadedFiles = [];

    for (const file of uploadedFilesInput) {
      uploadedFiles.push(await uploadBufferToStorage({
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        folder: 'gastos',
        projectId: payload.proyectoId,
        recordId: req.params.id,
      }));
    }

    const client = await pool.connect();
    let removedDocumentRows = [];

    try {
      await client.query('begin');

      const updateResult = await client.query(
        `
          update fct_gasto
          set
            fecha = $3,
            empresa_id = $4,
            categoria_id = $5,
            tipo_documento_id = $6,
            numero_documento = $7,
            monto_neto = $8,
            iva = $9,
            monto_total = $10,
            detalle = $11,
            proyecto_id = $12,
            colaborador_id = $13,
            comentario_tipo_documento = $14,
            updated_at = now()
          where tenant_id = $1
            and id = $2
        `,
        [
          tenant.id,
          req.params.id,
          payload.fecha,
          payload.empresaId,
          toNullable(payload.categoria),
          toNullable(payload.tipoDocumento),
          payload.numeroDocumento ?? '',
          normalizeNumeric(payload.montoNeto),
          normalizeNumeric(payload.iva),
          montoTotal,
          toNullable(payload.detalle),
          toNullable(payload.proyectoId),
          toNullable(payload.colaboradorId),
          toNullable(payload.comentarioTipoDocumento),
        ],
      );

      if (updateResult.rowCount === 0) {
        await client.query('rollback');
        await cleanupStorageObjects(uploadedFiles);
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      const currentDocuments = await fetchGastoDocumentos(
        tenant.id,
        req.params.id,
        (text, params) => client.query(text, params),
      );
      const keepIds = new Set(payload.existingAttachmentIds || []);
      const documentIdsToRemove = currentDocuments
        .filter((documento) => !keepIds.has(documento.id))
        .map((documento) => documento.id);

      removedDocumentRows = await removeGastoDocumentos(
        (text, params) => client.query(text, params),
        tenant.id,
        req.params.id,
        documentIdsToRemove,
      );

      await attachUploadedFilesToGasto(
        (text, params) => client.query(text, params),
        tenant.id,
        req.params.id,
        uploadedFiles,
      );

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      await cleanupStorageObjects(uploadedFiles);
      throw error;
    } finally {
      client.release();
    }

    await cleanupStorageObjects(removedDocumentRows);

    const updated = await fetchGastoById(tenant.id, req.params.id);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload invalido',
        details: error.flatten(),
      });
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Uno de los archivos supera el limite de ${MAX_GASTO_ATTACHMENT_SIZE_MB} MB`,
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al actualizar gasto',
    });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  try {
    const tenant = await getTenant();
    await ensureGastoDocumentosSchema();

    const client = await pool.connect();
    let removedDocumentRows = [];
    let deleteResult;

    try {
      await client.query('begin');

      const currentDocuments = await fetchGastoDocumentos(
        tenant.id,
        req.params.id,
        (text, params) => client.query(text, params),
      );

      removedDocumentRows = await removeGastoDocumentos(
        (text, params) => client.query(text, params),
        tenant.id,
        req.params.id,
        currentDocuments.map((documento) => documento.id),
      );

      deleteResult = await client.query(
        `
          delete from fct_gasto
          where tenant_id = $1
            and id = $2
        `,
        [tenant.id, req.params.id],
      );

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    await cleanupStorageObjects(removedDocumentRows);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al eliminar gasto',
    });
  }
});

async function registerFrontend() {
  if (isProduction) {
    app.use(express.static(distDir, { index: false }));
  } else {
    const { createServer } = await import('vite');
    viteDevServer = await createServer({
      root: rootDir,
      appType: 'custom',
      server: {
        middlewareMode: true,
      },
    });

    app.use(viteDevServer.middlewares);
  }

  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }

    try {
      const indexPath = isProduction
        ? path.resolve(distDir, 'index.html')
        : path.resolve(rootDir, 'index.html');

      let template = await fs.readFile(indexPath, 'utf-8');

      if (!isProduction && viteDevServer) {
        template = await viteDevServer.transformIndexHtml(req.originalUrl, template);
      }

      res.status(200).setHeader('Content-Type', 'text/html').end(template);
    } catch (error) {
      if (viteDevServer && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }

      next(error);
    }
  });
}

await registerFrontend();
await ensureControlPagosHitosSchema();
await ensureControlPagosDocumentosSchema();

const startupTenant = await getTenant();

const server = app.listen(port, () => {
  console.log(`Servidor web + API escuchando en http://localhost:${port}`);
  console.log(`Tenant activo: ${startupTenant.nombre} (${startupTenant.slug})`);
});

const shutdown = async () => {
  server.close(async () => {
    if (viteDevServer) {
      await viteDevServer.close();
    }
    await closePool();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

pool.on('error', (error) => {
  console.error('Error inesperado del pool PostgreSQL:', error);
});
