import { getGraphClient, getSiteId } from "@/lib/sharepointClient";
import type { Gasto, Empresa, Proyecto, Colaborador } from "@/data/mockData";

const SITE_ID_CACHE_KEY = "sharepoint_site_id";

// Nombres de las listas en SharePoint
const LISTS = {
  GASTOS: "REGISTRO_GASTOS",
  EMPRESAS: "Empresas",
  PROYECTOS: "Proyectos",
  COLABORADORES: "Colaboradores",
};

// Document Library para archivos adjuntos
const DOCUMENT_LIBRARY = "DocumentosGastos";

/**
 * Obtiene el Site ID (cacheado para mejor rendimiento)
 */
async function getCachedSiteId(): Promise<string> {
  const cached = sessionStorage.getItem(SITE_ID_CACHE_KEY);
  if (cached) {
    return cached;
  }
  
  const siteId = await getSiteId();
  sessionStorage.setItem(SITE_ID_CACHE_KEY, siteId);
  return siteId;
}

/**
 * Obtiene el ID de una lista por su nombre
 */
async function getListId(listName: string): Promise<string> {
  const client = await getGraphClient();
  const siteId = await getCachedSiteId();
  
  try {
    const lists = await client
      .api(`/sites/${siteId}/lists`)
      .filter(`displayName eq '${listName}'`)
      .get();
    
    if (lists.value && lists.value.length > 0) {
      return lists.value[0].id;
    }
    
    throw new Error(`Lista "${listName}" no encontrada en SharePoint`);
  } catch (error) {
    console.error(`Error al obtener List ID para ${listName}:`, error);
    throw error;
  }
}

// ========== SERVICIOS PARA GASTOS ==========

export const gastosService = {
  async getAll(): Promise<Gasto[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        fecha: item.fields.FECHA || item.fields.Fecha || item.fields.fecha || "",
        empresaId: item.fields.EMPRESA || item.fields.Empresa || item.fields.empresa || "",
        categoria: item.fields.CATEGORIA || item.fields.Categoria || item.fields.categoria || "",
        tipoDocumento: item.fields.TIPO_DOCUMENTO || item.fields.TipoDocumento || item.fields.tipoDocumento || "Factura",
        numeroDocumento: item.fields.NUMERO_DOCUMENTO || item.fields.NumeroDocumento || item.fields.numeroDocumento || "",
        monto: item.fields.MONTO || item.fields.Monto || item.fields.monto || 0,
        detalle: item.fields.DETALLE || item.fields.Detalle || item.fields.detalle || "",
        proyectoId: item.fields.PROYECTO || item.fields.Proyecto || item.fields.proyecto || undefined,
        comentarioTipoDocumento: item.fields.OTRO || item.fields.Otro || item.fields.otro || undefined,
        archivosAdjuntos: item.fields.ArchivosAdjuntos || item.fields.archivosAdjuntos ? 
          (typeof item.fields.ArchivosAdjuntos === 'string' ? JSON.parse(item.fields.ArchivosAdjuntos) : 
           typeof item.fields.archivosAdjuntos === 'string' ? JSON.parse(item.fields.archivosAdjuntos) : 
           item.fields.ArchivosAdjuntos || item.fields.archivosAdjuntos) : undefined,
      }));
    } catch (error) {
      console.error("Error al obtener gastos:", error);
      throw error;
    }
  },

  async create(gasto: Omit<Gasto, "id">): Promise<Gasto> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      // Mapeo de campos del formulario a columnas de SharePoint (nombres reales de SharePoint)
      // Usando los nombres exactos que aparecen en SharePoint: PROYECTO, FECHA, CATEGORIA, TIPO_DOCUMENTO, OTRO, NUMERO_DOCUMENTO, EMPRESA, MONTO, DETALLE
      const fields: any = {
        FECHA: gasto.fecha,
        CATEGORIA: gasto.categoria,
        TIPO_DOCUMENTO: gasto.tipoDocumento,
        NUMERO_DOCUMENTO: gasto.numeroDocumento,
        MONTO: gasto.monto,
        DETALLE: gasto.detalle || "",
        PROYECTO: gasto.proyectoId || "",
        OTRO: gasto.comentarioTipoDocumento || "",
        // ArchivosAdjuntos se guarda como JSON si existe
      };
      
      // Solo agregar ArchivosAdjuntos si existe
      if (gasto.archivosAdjuntos && gasto.archivosAdjuntos.length > 0) {
        fields.ArchivosAdjuntos = JSON.stringify(gasto.archivosAdjuntos);
      }
      
      const finalFields = fields;
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields: finalFields,
        });
      
      return {
        id: response.id,
        ...gasto,
      };
    } catch (error) {
      console.error("Error al crear gasto:", error);
      throw error;
    }
  },

  async update(id: string, gasto: Partial<Gasto>): Promise<Gasto> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      // Mapeo de campos usando los nombres reales de SharePoint
      const fields: any = {};
      
      if (gasto.fecha !== undefined) {
        fields.FECHA = gasto.fecha;
      }
      if (gasto.categoria !== undefined) {
        fields.CATEGORIA = gasto.categoria;
      }
      if (gasto.tipoDocumento !== undefined) {
        fields.TIPO_DOCUMENTO = gasto.tipoDocumento;
      }
      if (gasto.numeroDocumento !== undefined) {
        fields.NUMERO_DOCUMENTO = gasto.numeroDocumento;
      }
      if (gasto.monto !== undefined) {
        fields.MONTO = gasto.monto;
      }
      if (gasto.detalle !== undefined) {
        fields.DETALLE = gasto.detalle || "";
      }
      if (gasto.proyectoId !== undefined) {
        fields.PROYECTO = gasto.proyectoId || "";
      }
      if (gasto.comentarioTipoDocumento !== undefined) {
        fields.OTRO = gasto.comentarioTipoDocumento || "";
      }
      if (gasto.archivosAdjuntos !== undefined && gasto.archivosAdjuntos.length > 0) {
        fields.ArchivosAdjuntos = JSON.stringify(gasto.archivosAdjuntos);
      }
      
      const finalFields = fields;
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}/fields`)
        .patch(finalFields);
      
      return {
        id,
        ...gasto,
      } as Gasto;
    } catch (error) {
      console.error("Error al actualizar gasto:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      throw error;
    }
  },
};

// ========== SERVICIOS PARA EMPRESAS ==========

export const empresasService = {
  async getAll(): Promise<Empresa[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.EMPRESAS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        razonSocial: item.fields.RazonSocial || "",
        rut: item.fields.RUT || "",
        numeroContacto: item.fields.NumeroContacto || undefined,
        correoElectronico: item.fields.CorreoElectronico || undefined,
        createdAt: item.fields.CreatedAt || item.createdDateTime || "",
      }));
    } catch (error) {
      console.error("Error al obtener empresas:", error);
      throw error;
    }
  },

  async create(empresa: Omit<Empresa, "id" | "createdAt">): Promise<Empresa> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.EMPRESAS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields: {
            RazonSocial: empresa.razonSocial,
            RUT: empresa.rut,
            NumeroContacto: empresa.numeroContacto || "",
            CorreoElectronico: empresa.correoElectronico || "",
            CreatedAt: new Date().toISOString().split("T")[0],
          },
        });
      
      return {
        id: response.id,
        ...empresa,
        createdAt: new Date().toISOString().split("T")[0],
      };
    } catch (error) {
      console.error("Error al crear empresa:", error);
      throw error;
    }
  },

  async update(id: string, empresa: Partial<Empresa>): Promise<Empresa> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.EMPRESAS);
    
    try {
      const fields: any = {};
      if (empresa.razonSocial !== undefined) fields.RazonSocial = empresa.razonSocial;
      if (empresa.rut !== undefined) fields.RUT = empresa.rut;
      if (empresa.numeroContacto !== undefined) fields.NumeroContacto = empresa.numeroContacto || "";
      if (empresa.correoElectronico !== undefined) fields.CorreoElectronico = empresa.correoElectronico || "";
      
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}/fields`)
        .patch(fields);
      
      return empresa as Empresa;
    } catch (error) {
      console.error("Error al actualizar empresa:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.EMPRESAS);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      throw error;
    }
  },
};

// ========== SERVICIOS PARA PROYECTOS ==========

export const proyectosService = {
  async getAll(): Promise<Proyecto[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.PROYECTOS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        nombre: item.fields.Nombre || item.fields.Title || "",
        createdAt: item.fields.CreatedAt || item.createdDateTime || "",
      }));
    } catch (error) {
      console.error("Error al obtener proyectos:", error);
      throw error;
    }
  },

  async create(proyecto: Omit<Proyecto, "id" | "createdAt">): Promise<Proyecto> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.PROYECTOS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields: {
            Title: proyecto.nombre,
            Nombre: proyecto.nombre,
            CreatedAt: new Date().toISOString().split("T")[0],
          },
        });
      
      return {
        id: response.id,
        ...proyecto,
        createdAt: new Date().toISOString().split("T")[0],
      };
    } catch (error) {
      console.error("Error al crear proyecto:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.PROYECTOS);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar proyecto:", error);
      throw error;
    }
  },
};

// ========== SERVICIOS PARA COLABORADORES ==========

export const colaboradoresService = {
  async getAll(): Promise<Colaborador[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.COLABORADORES);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        nombre: item.fields.Nombre || item.fields.Title || "",
        email: item.fields.Email || undefined,
        telefono: item.fields.Telefono || undefined,
        cargo: item.fields.Cargo || undefined,
        createdAt: item.fields.CreatedAt || item.createdDateTime || "",
      }));
    } catch (error) {
      console.error("Error al obtener colaboradores:", error);
      throw error;
    }
  },

  async create(colaborador: Omit<Colaborador, "id" | "createdAt">): Promise<Colaborador> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.COLABORADORES);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields: {
            Title: colaborador.nombre,
            Nombre: colaborador.nombre,
            Email: colaborador.email || "",
            Telefono: colaborador.telefono || "",
            Cargo: colaborador.cargo || "",
            CreatedAt: new Date().toISOString().split("T")[0],
          },
        });
      
      return {
        id: response.id,
        ...colaborador,
        createdAt: new Date().toISOString().split("T")[0],
      };
    } catch (error) {
      console.error("Error al crear colaborador:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.COLABORADORES);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar colaborador:", error);
      throw error;
    }
  },
};

// ========== SERVICIO PARA ARCHIVOS ==========

export const archivosService = {
  /**
   * Sube un archivo a la Document Library de SharePoint
   */
  async uploadFile(file: File, gastoId: string): Promise<{ nombre: string; url: string; tipo: string }> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    
    try {
      // Obtener el drive (Document Library) del sitio
      const drive = await client
        .api(`/sites/${siteId}/drives`)
        .filter(`name eq '${DOCUMENT_LIBRARY}'`)
        .get();
      
      if (!drive.value || drive.value.length === 0) {
        throw new Error(`Document Library "${DOCUMENT_LIBRARY}" no encontrada`);
      }
      
      const driveId = drive.value[0].id;
      
      // Crear una carpeta para el gasto si no existe
      const folderPath = `/Gasto-${gastoId}`;
      const fileName = `${Date.now()}-${file.name}`;
      
      // Convertir archivo a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Subir el archivo
      const uploadedFile = await client
        .api(`/sites/${siteId}/drives/${driveId}/root:${folderPath}/${fileName}:`)
        .put(arrayBuffer);
      
      return {
        nombre: file.name,
        url: uploadedFile.webUrl,
        tipo: file.type || "application/octet-stream",
      };
    } catch (error) {
      console.error("Error al subir archivo:", error);
      throw error;
    }
  },
};

