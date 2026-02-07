import { getGraphClient, getSiteId, getAccessToken, getSharePointRestToken, getSharePointSiteUrl } from "@/lib/sharepointClient";
import { msalInstance } from "@/lib/msalConfig";
import type { Gasto, Empresa, Proyecto, Colaborador } from "@/data/mockData";

const SITE_ID_CACHE_KEY = "sharepoint_site_id";

// Nombres de las listas en SharePoint
const LISTS = {
  GASTOS: "REGISTRO_GASTOS",
  EMPRESAS: "Empresas",
  PROYECTOS: "PROYECTOS",
  COLABORADORES: "Colaboradores",
  CATEGORIAS: "CATEGORIAS",
  TIPOS_DOCUMENTO: "TIPO_DOCUMENTO",
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

/**
 * Obtiene el email del usuario logueado desde MSAL
 */
function getUserEmail(): string | null {
  try {
    const account = msalInstance.getActiveAccount();
    console.log("📧 Account completo:", account);
    
    if (account) {
      // Intentar diferentes propiedades donde puede estar el email
      const email = account.username || 
                   (account as any).mail || 
                   (account as any).email ||
                   account.name;
      
      if (email) {
        console.log(`✅ Email del usuario encontrado: ${email}`);
        console.log(`📧 Account.username: ${account.username}`);
        console.log(`📧 Account.name: ${account.name}`);
        console.log(`📧 Account.mail: ${(account as any).mail}`);
        return email;
      }
    }
    
    console.warn("⚠️ No se pudo obtener el email del usuario. Account:", account);
    return null;
  } catch (error) {
    console.error("Error al obtener email del usuario:", error);
    return null;
  }
}

/**
 * Busca un colaborador por su email en la lista COLABORADORES
 */
async function findColaboradorByEmail(email: string): Promise<string | null> {
  try {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.COLABORADORES);
    
    console.log(`🔍 Buscando colaborador con email: ${email}`);
    console.log(`📋 List ID de COLABORADORES: ${listId}`);
    
    // Obtener todos los colaboradores y filtrar en memoria (más confiable que el filtro de Graph API)
    const response = await client
      .api(`/sites/${siteId}/lists/${listId}/items`)
      .expand("fields")
      .get();
    
    console.log(`📋 Total de colaboradores encontrados: ${response.value?.length || 0}`);
    
    if (response.value && response.value.length > 0) {
      // Mostrar todos los colaboradores para debugging
      response.value.forEach((item: any, index: number) => {
        const correo = item.fields?.CORREO || item.fields?.Correo || item.fields?.Email || item.fields?.correo || 'N/A';
        const nombre = item.fields?.NOMBRE || item.fields?.Nombre || item.fields?.Title || 'N/A';
        console.log(`  Colaborador ${index + 1}: ID=${item.id}, Nombre=${nombre}, Correo=${correo}`);
      });
      
      // Buscar por email (comparar en minúsculas para evitar problemas de mayúsculas/minúsculas)
      const emailLower = email.toLowerCase().trim();
      const colaborador = response.value.find((item: any) => {
        const correo = (item.fields?.CORREO || item.fields?.Correo || item.fields?.Email || item.fields?.correo || '').toLowerCase().trim();
        return correo === emailLower;
      });
      
      if (colaborador) {
        const colaboradorId = colaborador.id;
        const nombre = colaborador.fields?.NOMBRE || colaborador.fields?.Nombre || colaborador.fields?.Title || 'N/A';
        console.log(`✅ Colaborador encontrado por email ${email}: ID ${colaboradorId}, Nombre: ${nombre}`);
        return colaboradorId;
      }
    }
    
    console.warn(`⚠️ No se encontró colaborador con email: ${email}`);
    console.warn(`⚠️ Emails disponibles en la lista:`);
    if (response.value) {
      response.value.forEach((item: any) => {
        const correo = item.fields?.CORREO || item.fields?.Correo || item.fields?.Email || item.fields?.correo || 'N/A';
        console.warn(`  - ${correo}`);
      });
    }
    return null;
  } catch (error) {
    console.error("❌ Error al buscar colaborador por email:", error);
    if (error instanceof Error) {
      console.error("❌ Mensaje de error:", error.message);
    }
    return null;
  }
}

/**
 * Obtiene el nombre interno de una columna por su nombre de visualización
 */
async function getColumnInternalName(listId: string, displayName: string): Promise<string> {
  const client = await getGraphClient();
  const siteId = await getCachedSiteId();
  
  try {
    const columns = await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .get();
    
    // Buscar la columna por nombre de visualización
    const column = columns.value.find((col: any) => 
      col.displayName === displayName || 
      col.name === displayName ||
      col.displayName?.toUpperCase() === displayName.toUpperCase() ||
      col.name?.toUpperCase() === displayName.toUpperCase()
    );
    
    if (column) {
      console.log(`📋 Columna encontrada:`, {
        displayName: column.displayName,
        name: column.name,
        type: column.text ? 'text' : column.lookup ? 'lookup' : column.type,
        lookup: column.lookup ? {
          allowMultipleValues: column.lookup.allowMultipleValues,
          isRelationship: column.lookup.isRelationship,
          relationshipDeleteBehavior: column.lookup.relationshipDeleteBehavior,
          listId: column.lookup.listId,
          columnName: column.lookup.columnName
        } : null
      });
      
      // Para campos lookup, SharePoint crea campos adicionales con sufijos
      // El nombre interno puede ser diferente, pero para actualizar necesitamos usar el formato correcto
      return column.name; // Nombre interno
    }
    
    // Si no se encuentra, devolver el nombre original
    console.warn(`⚠️ Columna "${displayName}" no encontrada, usando nombre original`);
    console.warn(`⚠️ Columnas disponibles:`, columns.value.map((c: any) => ({ displayName: c.displayName, name: c.name })));
    return displayName;
  } catch (error) {
    console.error(`Error al obtener nombre interno de columna "${displayName}":`, error);
    return displayName; // Fallback al nombre original
  }
}

// ========== SERVICIOS PARA GASTOS ==========

export const gastosService = {
  // Función temporal para revisar un item específico con attachments
  async checkItemWithAttachments(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      // Obtener el item
      const item = await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .expand("fields")
        .get();
      
      console.log("📋 Item completo:", JSON.stringify(item, null, 2));
      
      // Para SharePoint lists, los attachments se acceden usando SharePoint REST API directamente
      // No se puede usar Microsoft Graph API para attachments en list items
      console.log("📎 Campo Attachments en fields:", item.fields?.Attachments);
      console.log("📎 webUrl del item:", item.webUrl);
      
      // Usar SharePoint REST API directamente para obtener attachments
      // Necesitamos un token específico para SharePoint REST API (no el de Microsoft Graph)
      const siteUrl = getSharePointSiteUrl();
      const token = await getSharePointRestToken(); // Token específico para SharePoint REST API
      
      // Construir la URL de SharePoint REST API usando el nombre de la lista
      // IMPORTANTE: Usar la URL completa del sitio (incluyendo el path), no solo el origin
      const listName = LISTS.GASTOS; // Usar el nombre de la lista
      const restApiUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${id})/AttachmentFiles`;
      
      console.log("📎 Intentando obtener attachments desde SharePoint REST API:", restApiUrl);
      
      try {
        const response = await fetch(restApiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json;odata=verbose',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("📎 Attachments desde SharePoint REST API:", JSON.stringify(data, null, 2));
          
          if (data.d && data.d.results && data.d.results.length > 0) {
            console.log("📎 Número de attachments encontrados:", data.d.results.length);
            
            data.d.results.forEach((att: any, index: number) => {
              console.log(`📎 Attachment ${index + 1}:`, {
                FileName: att.FileName,
                ServerRelativeUrl: att.ServerRelativeUrl,
                // Construir URL completa
                fullUrl: `${new URL(siteUrl).origin}${att.ServerRelativeUrl}`,
                // Ver todos los campos disponibles
                allFields: Object.keys(att),
                fullObject: att,
              });
            });
          } else {
            console.log("📎 No se encontraron attachments en la respuesta");
          }
        } else {
          const errorText = await response.text();
          console.error("❌ Error al obtener attachments:", response.status, errorText);
        }
      } catch (restError: any) {
        console.error("❌ Error al usar SharePoint REST API:", restError);
      }
    } catch (error) {
      console.error("Error al revisar item con attachments:", error);
      throw error;
    }
  },

  // Función temporal para revisar las columnas lookup
  async checkLookupColumns(): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      // Obtener todas las columnas
      const columns = await client
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .get();
      
      console.log("📋 Todas las columnas de la lista:");
      columns.value.forEach((col: any) => {
        if (col.lookup) {
          console.log(`🔍 Columna lookup encontrada:`, {
            displayName: col.displayName,
            name: col.name,
            lookup: {
              listId: col.lookup.listId,
              columnName: col.lookup.columnName,
              allowMultipleValues: col.lookup.allowMultipleValues
            }
          });
        }
      });
      
      // Obtener un item reciente para ver los nombres reales de los campos
      const items = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .top(1)
        .get();
      
      if (items.value && items.value.length > 0) {
        const item = items.value[0];
        console.log("📋 Item de ejemplo:", item.id);
        console.log("📋 Todos los campos del item:", Object.keys(item.fields || {}));
        
        // Buscar campos que contengan "EMPRESA", "PROYECTO", "TIPO_DOCUMENTO"
        const camposRelevantes = Object.keys(item.fields || {}).filter(k => 
          k.includes('EMPRESA') || 
          k.includes('PROYECTO') || 
          k.includes('TIPO_DOCUMENTO') ||
          k.includes('TipoDocumento') ||
          k.includes('Empresa') ||
          k.includes('Proyecto')
        );
        
        console.log("📋 Campos relevantes encontrados:");
        camposRelevantes.forEach(campo => {
          console.log(`  - ${campo}:`, item.fields[campo], `(tipo: ${typeof item.fields[campo]})`);
        });
      }
    } catch (error) {
      console.error("Error al revisar columnas:", error);
      throw error;
    }
  },

  async getAll(): Promise<Gasto[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      // Obtener todos los items con sus attachments usando SharePoint REST API
      // Microsoft Graph API no soporta attachments en list items directamente
      const siteUrl = getSharePointSiteUrl();
      const token = await getSharePointRestToken(); // Token específico para SharePoint REST API
      
      const itemsWithAttachments = await Promise.all(
        response.value.map(async (item: any) => {
          // Obtener attachments usando SharePoint REST API
          let attachments: Array<{ nombre: string; url: string; tipo: string }> = [];
          
          // Solo intentar obtener attachments si el campo Attachments es true
          if (item.fields?.Attachments === true) {
            try {
              // Usar el nombre de la lista en lugar del GUID para SharePoint REST API
              // IMPORTANTE: Usar la URL completa del sitio (incluyendo el path)
              const listName = LISTS.GASTOS;
              const restApiUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${item.id})/AttachmentFiles`;
              const attachmentsResponse = await fetch(restApiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json;odata=verbose',
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (attachmentsResponse.ok) {
                const data = await attachmentsResponse.json();
                if (data.d && data.d.results && data.d.results.length > 0) {
                  // Construir la URL del endpoint REST API para descargar el archivo
                  // Usamos GetFileByServerRelativeUrl que es el método recomendado
                  attachments = data.d.results.map((att: any) => {
                    // Escapar comillas simples en ServerRelativeUrl para el endpoint
                    const escapedUrl = att.ServerRelativeUrl.replace(/'/g, "''");
                    const downloadUrl = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${escapedUrl}')/$value`;
                    
                    return {
                      nombre: att.FileName,
                      url: downloadUrl,
                      tipo: att.ContentType || 'application/octet-stream',
                      serverRelativeUrl: att.ServerRelativeUrl, // Guardar también para referencia
                    };
                  });
                }
              }
            } catch (attachmentsError) {
              console.warn(`⚠️ No se pudieron obtener attachments para item ${item.id}:`, attachmentsError);
            }
          }
          
          return { ...item, attachments };
        })
      );
      
      return itemsWithAttachments.map((item: any) => {
        // CATEGORIA es un campo lookup
        // SharePoint almacena campos lookup con sufijos: "CATEGORIALookupId"
        // Basado en el item 9 revisado: "CATEGORIALookupId": "3"
        let categoriaId = "";
        
        // Buscar el campo lookup usando los nombres posibles
        const categoriaLookupId = item.fields.CATEGORIALookupId || 
                                  item.fields.CATEGORIA_x003a__x0020_IDLookupId ||
                                  item.fields.CATEGORIA;
        
        if (categoriaLookupId) {
          if (typeof categoriaLookupId === 'object' && categoriaLookupId.LookupId) {
            // Es un objeto lookup
            categoriaId = String(categoriaLookupId.LookupId);
          } else {
            // Es directamente el ID (número o string)
            categoriaId = String(categoriaLookupId);
          }
        }
        
        // EMPRESA es un campo lookup
        let empresaId = "";
        const empresaLookupId = item.fields.EMPRESALookupId || 
                                item.fields.EMPRESA_x003a__x0020_IDLookupId ||
                                item.fields.EMPRESA;
        if (empresaLookupId) {
          empresaId = String(empresaLookupId);
        }
        
        // TIPO_DOCUMENTO es un campo lookup
        let tipoDocumentoId = "";
        const tipoDocumentoLookupId = item.fields.TIPO_DOCUMENTOLookupId || 
                                      item.fields.TIPO_DOCUMENTO_x003a__x0020_IDLookupId ||
                                      item.fields.TIPO_DOCUMENTO;
        if (tipoDocumentoLookupId) {
          tipoDocumentoId = String(tipoDocumentoLookupId);
        }
        
        // PROYECTO es un campo lookup
        let proyectoId = "";
        const proyectoLookupId = item.fields.PROYECTOLookupId || 
                                 item.fields.PROYECTO_x003a__x0020_IDLookupId ||
                                 item.fields.PROYECTO;
        if (proyectoLookupId) {
          proyectoId = String(proyectoLookupId);
        }
        
        // PERSONA es un campo lookup
        let colaboradorId = "";
        const personaLookupId = item.fields.PERSONALookupId || 
                               item.fields.PERSONA_x003a__x0020_IDLookupId ||
                               item.fields.PERSONA;
        if (personaLookupId) {
          if (typeof personaLookupId === 'object' && personaLookupId.LookupId) {
            // Es un objeto lookup
            colaboradorId = String(personaLookupId.LookupId);
          } else {
            // Es directamente el ID (número o string)
            colaboradorId = String(personaLookupId);
          }
        }
        
        return {
          id: item.id,
          fecha: item.fields.FECHA || item.fields.Fecha || item.fields.fecha || "",
          empresaId: empresaId, // Usar el ID del lookup
          categoria: categoriaId, // Usar el ID del lookup
          tipoDocumento: tipoDocumentoId || "Factura", // Usar el ID del lookup (necesitaremos mapear a nombre después)
          numeroDocumento: item.fields.NUMERO_DOCUMENTO || item.fields.NumeroDocumento || item.fields.numeroDocumento || "",
          // Usar MONTO_TOTAL como principal, con fallback a MONTO para compatibilidad con datos antiguos
          montoTotal: item.fields.MONTO_TOTAL || item.fields.MontoTotal || item.fields.montoTotal || item.fields.MONTO || item.fields.Monto || item.fields.monto || 0,
          monto: item.fields.MONTO_TOTAL || item.fields.MontoTotal || item.fields.montoTotal || item.fields.MONTO || item.fields.Monto || item.fields.monto || 0, // Para compatibilidad interna
          montoNeto: item.fields.MONTO_NETO || item.fields.MontoNeto || item.fields.montoNeto || undefined,
          iva: item.fields.IVA || item.fields.Iva || item.fields.iva || undefined,
          detalle: item.fields.DETALLE || item.fields.Detalle || item.fields.detalle || "",
          proyectoId: proyectoId || undefined, // Usar el ID del lookup
          colaboradorId: colaboradorId || undefined, // Usar el ID del lookup de PERSONA
          comentarioTipoDocumento: item.fields.OTRO || item.fields.Otro || item.fields.otro || undefined,
          archivosAdjuntos: item.attachments && item.attachments.length > 0 ? item.attachments : undefined,
        };
      });
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
      // Obtener el email del usuario logueado y buscar el colaborador correspondiente
      const userEmail = getUserEmail();
      let personaId: number | null = null;
      
      if (userEmail) {
        console.log(`🔍 Buscando colaborador para el usuario: ${userEmail}`);
        const colaboradorIdStr = await findColaboradorByEmail(userEmail);
        if (colaboradorIdStr) {
          const parsed = Number(colaboradorIdStr);
          if (!isNaN(parsed) && parsed > 0) {
            personaId = parsed;
            console.log(`✅ Colaborador encontrado, ID: ${personaId}`);
          }
        }
      } else {
        console.warn("⚠️ No se pudo obtener el email del usuario logueado");
      }
      
      // Obtener los nombres internos de las columnas lookup
      const categoriaColumnName = await getColumnInternalName(listId, "CATEGORIA");
      const empresaColumnName = await getColumnInternalName(listId, "EMPRESA");
      const proyectoColumnName = await getColumnInternalName(listId, "PROYECTO");
      const tipoDocumentoColumnName = await getColumnInternalName(listId, "TIPO_DOCUMENTO");
      const personaColumnName = await getColumnInternalName(listId, "PERSONA");
      
      console.log("📋 Nombres internos de columnas lookup:");
      console.log("  - CATEGORIA:", categoriaColumnName);
      console.log("  - EMPRESA:", empresaColumnName);
      console.log("  - PROYECTO:", proyectoColumnName);
      console.log("  - TIPO_DOCUMENTO:", tipoDocumentoColumnName);
      console.log("  - PERSONA:", personaColumnName);
      
      // Parsear IDs de campos lookup (deben ser números)
      let categoriaId: number | null = null;
      if (gasto.categoria) {
        const parsed = Number(gasto.categoria);
        if (!isNaN(parsed) && parsed > 0) {
          categoriaId = parsed;
        } else {
          console.warn("⚠️ ID de categoría inválido:", gasto.categoria);
        }
      }
      
      let empresaId: number | null = null;
      if (gasto.empresaId) {
        const parsed = Number(gasto.empresaId);
        if (!isNaN(parsed) && parsed > 0) {
          empresaId = parsed;
        } else {
          console.warn("⚠️ ID de empresa inválido:", gasto.empresaId);
        }
      }
      
      let proyectoId: number | null = null;
      if (gasto.proyectoId) {
        const parsed = Number(gasto.proyectoId);
        if (!isNaN(parsed) && parsed > 0) {
          proyectoId = parsed;
        } else {
          console.warn("⚠️ ID de proyecto inválido:", gasto.proyectoId);
        }
      }
      
      // TIPO_DOCUMENTO es lookup, necesitamos el ID
      // Por ahora, asumimos que viene como ID numérico
      let tipoDocumentoId: number | null = null;
      if (gasto.tipoDocumento) {
        const parsed = Number(gasto.tipoDocumento);
        if (!isNaN(parsed) && parsed > 0) {
          tipoDocumentoId = parsed;
        } else {
          // Si no es un número, puede ser el nombre del tipo de documento
          // Por ahora, lo ignoramos y se actualizará después si es necesario
          console.warn("⚠️ TIPO_DOCUMENTO no es un ID numérico:", gasto.tipoDocumento);
        }
      }
      
      // Campos básicos que NO son lookup
      // Ya no guardamos MONTO, solo MONTO_TOTAL
      const fields: any = {
        FECHA: gasto.fecha,
        // MONTO_TOTAL siempre se guarda (es el monto total, con o sin impuestos)
        MONTO_TOTAL: gasto.montoTotal !== undefined && gasto.montoTotal !== null 
          ? gasto.montoTotal 
          : gasto.monto, // Fallback al monto si no hay montoTotal
      };
      
      // Agregar campos de impuestos si están definidos
      if (gasto.montoNeto !== undefined && gasto.montoNeto !== null) {
        fields.MONTO_NETO = gasto.montoNeto;
      }
      if (gasto.iva !== undefined && gasto.iva !== null) {
        fields.IVA = gasto.iva;
      }
      
      // Agregar campos de texto simples (estos deberían funcionar)
      if (gasto.detalle && gasto.detalle.trim() !== "") {
        fields.DETALLE = gasto.detalle;
      }
      
      if (gasto.numeroDocumento && gasto.numeroDocumento.trim() !== "") {
        fields.NUMERO_DOCUMENTO = gasto.numeroDocumento;
      }
      
      if (gasto.comentarioTipoDocumento && gasto.comentarioTipoDocumento.trim() !== "") {
        fields.OTRO = gasto.comentarioTipoDocumento;
      }
      
      // NOTA: Todos los campos lookup (CATEGORIA, EMPRESA, PROYECTO, TIPO_DOCUMENTO)
      // se manejarán después con PATCH, no se agregan al POST inicial
      
      // Solo agregar ArchivosAdjuntos si existe
      if (gasto.archivosAdjuntos && gasto.archivosAdjuntos.length > 0) {
        fields.ArchivosAdjuntos = JSON.stringify(gasto.archivosAdjuntos);
      }
      
      console.log("📤 Campos a enviar:", JSON.stringify(fields, null, 2));
      console.log("📤 Tipo de cada campo:", Object.keys(fields).map(key => `${key}: ${typeof fields[key]}`));
      
      // Validar que no haya campos undefined o null (SharePoint no los acepta)
      const cleanFields: any = {};
      Object.keys(fields).forEach(key => {
        const value = fields[key];
        // Solo incluir campos que tengan un valor válido
        if (value !== undefined && value !== null && value !== "") {
          cleanFields[key] = value;
        }
      });
      
      console.log("📤 Campos limpios a enviar:", JSON.stringify(cleanFields, null, 2));
      
      // Limpiar campos y preparar para envío
      const fieldsToSend = { ...cleanFields };
      
      // Remover ArchivosAdjuntos por ahora (puede causar problemas)
      if (fieldsToSend.ArchivosAdjuntos) {
        console.log("⚠️ Removiendo campo ArchivosAdjuntos (se agregará después)...");
        delete fieldsToSend.ArchivosAdjuntos;
      }
      
      // Remover cualquier referencia al campo MONTO (ya no existe, se usa MONTO_TOTAL y MONTO_NETO)
      if (fieldsToSend.MONTO) {
        console.log("⚠️ Removiendo campo MONTO (ya no existe, se usa MONTO_TOTAL y MONTO_NETO)...");
        delete fieldsToSend.MONTO;
      }
      if (fieldsToSend.Monto) {
        console.log("⚠️ Removiendo campo Monto (ya no existe, se usa MONTO_TOTAL y MONTO_NETO)...");
        delete fieldsToSend.Monto;
      }
      if (fieldsToSend.monto) {
        console.log("⚠️ Removiendo campo monto (ya no existe, se usa MONTO_TOTAL y MONTO_NETO)...");
        delete fieldsToSend.monto;
      }
      
      // Remover todos los campos lookup del POST inicial (SharePoint rechaza lookup en POST)
      // Estos se actualizarán después con PATCH
      const lookupFieldsToUpdate: { [key: string]: number } = {};
      
      // CATEGORIA
      if (fieldsToSend[categoriaColumnName] || fieldsToSend.CATEGORIA) {
        console.log("⚠️ Removiendo campo CATEGORIA del POST (se actualizará con PATCH después)");
        delete fieldsToSend[categoriaColumnName];
        delete fieldsToSend.CATEGORIA;
      }
      if (categoriaId !== null) {
        lookupFieldsToUpdate[`${categoriaColumnName}LookupId`] = categoriaId;
        console.log("📝 Categoría ID guardado para actualizar después:", categoriaId);
      }
      
      // EMPRESA
      if (fieldsToSend[empresaColumnName] || fieldsToSend.EMPRESA) {
        console.log("⚠️ Removiendo campo EMPRESA del POST (se actualizará con PATCH después)");
        delete fieldsToSend[empresaColumnName];
        delete fieldsToSend.EMPRESA;
      }
      if (empresaId !== null) {
        lookupFieldsToUpdate[`${empresaColumnName}LookupId`] = empresaId;
        console.log("📝 Empresa ID guardado para actualizar después:", empresaId);
      }
      
      // PROYECTO
      if (fieldsToSend[proyectoColumnName] || fieldsToSend.PROYECTO) {
        console.log("⚠️ Removiendo campo PROYECTO del POST (se actualizará con PATCH después)");
        delete fieldsToSend[proyectoColumnName];
        delete fieldsToSend.PROYECTO;
      }
      if (proyectoId !== null) {
        lookupFieldsToUpdate[`${proyectoColumnName}LookupId`] = proyectoId;
        console.log("📝 Proyecto ID guardado para actualizar después:", proyectoId);
      }
      
      // TIPO_DOCUMENTO
      if (fieldsToSend[tipoDocumentoColumnName] || fieldsToSend.TIPO_DOCUMENTO) {
        console.log("⚠️ Removiendo campo TIPO_DOCUMENTO del POST (se actualizará con PATCH después)");
        delete fieldsToSend[tipoDocumentoColumnName];
        delete fieldsToSend.TIPO_DOCUMENTO;
      }
      if (tipoDocumentoId !== null) {
        lookupFieldsToUpdate[`${tipoDocumentoColumnName}LookupId`] = tipoDocumentoId;
        console.log("📝 Tipo Documento ID guardado para actualizar después:", tipoDocumentoId);
      }
      
      // PERSONA (colaborador identificado por email del usuario logueado)
      if (personaId !== null) {
        const personaLookupField = `${personaColumnName}LookupId`;
        lookupFieldsToUpdate[personaLookupField] = personaId;
        console.log("📝 Persona ID guardado para actualizar después:");
        console.log(`  - Campo: ${personaLookupField}`);
        console.log(`  - Valor: ${personaId}`);
        console.log(`  - Tipo: ${typeof personaId}`);
      } else {
        console.warn("⚠️ No se pudo obtener el ID de la persona. No se guardará en el campo PERSONA.");
      }
      
      console.log("📤 Campos finales a enviar (sin categoría):", JSON.stringify(fieldsToSend, null, 2));
      console.log("📤 ¿Incluye CATEGORIA?", categoriaColumnName in fieldsToSend || "CATEGORIA" in fieldsToSend);
      
      // Crear el item SIN el campo lookup primero (para evitar error 400)
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .post({
          fields: fieldsToSend,
        });
      
      console.log("✅ Gasto creado exitosamente (sin campos lookup). Response ID:", response.id);
      
      // Actualizar todos los campos lookup con PATCH después de crear el item
      // IMPORTANTE: Para campos lookup, SharePoint usa nombres con sufijo "LookupId"
      if (Object.keys(lookupFieldsToUpdate).length > 0) {
        try {
          console.log("📝 Actualizando campos lookup después de crear el item...");
          console.log("📝 ID del item:", response.id);
          console.log("📝 Campos lookup a actualizar:", lookupFieldsToUpdate);
          
          // Actualizar todos los campos lookup en una sola llamada PATCH
          await client
            .api(`/sites/${siteId}/lists/${listId}/items/${response.id}/fields`)
            .patch(lookupFieldsToUpdate);
          
          console.log("✅ Campos lookup actualizados exitosamente");
          
          // Leer el item actualizado para verificar
          const itemUpdated = await client
            .api(`/sites/${siteId}/lists/${listId}/items/${response.id}`)
            .expand("fields")
            .get();
          
          // Verificar que los campos se guardaron
          console.log("🔍 Verificando campos lookup actualizados:");
          Object.keys(lookupFieldsToUpdate).forEach(fieldName => {
            const valorGuardado = itemUpdated.fields?.[fieldName];
            if (valorGuardado) {
              console.log(`✅ Campo ${fieldName} verificado y guardado correctamente:`, valorGuardado);
            } else {
              console.warn(`⚠️ Campo ${fieldName} no aparece después de actualizar. Verifica en SharePoint.`);
              console.warn(`⚠️ Campos disponibles en el item:`, Object.keys(itemUpdated.fields || {}));
            }
          });
          
          // Verificación específica para PERSONA
          if (personaId !== null) {
            const personaLookupField = `${personaColumnName}LookupId`;
            const personaGuardada = itemUpdated.fields?.[personaLookupField];
            if (personaGuardada) {
              console.log(`✅ Campo PERSONA (${personaLookupField}) guardado correctamente:`, personaGuardada);
            } else {
              console.error(`❌ Campo PERSONA (${personaLookupField}) NO se guardó. Valor esperado: ${personaId}`);
              console.error(`❌ Todos los campos del item:`, JSON.stringify(itemUpdated.fields, null, 2));
            }
          }
        } catch (updateError: any) {
          console.error("❌ Error al actualizar los campos lookup:", updateError);
          if (updateError?.body) {
            console.error("❌ Detalles del error:", JSON.stringify(updateError.body, null, 2));
          }
          // No lanzar el error - el item ya se creó, solo fallaron los campos lookup
          console.warn("⚠️ El gasto se creó pero algunos campos lookup no se pudieron actualizar. Intenta actualizarlos manualmente.");
        }
      }
      
      // Subir archivos adjuntos después de crear el item
      if (gasto.archivosAdjuntos && gasto.archivosAdjuntos.length > 0) {
        try {
          console.log("📎 Subiendo archivos adjuntos...");
          console.log("📎 Número de archivos:", gasto.archivosAdjuntos.length);
          
          // Los archivos vienen como objetos con {nombre, url, tipo}
          // Necesitamos convertir las URLs de blob a archivos File para subirlos
          // O mejor, recibir los archivos File directamente desde el componente
          // Por ahora, intentaremos subir los archivos que vengan como File objects
          
          // Si los archivos vienen como objetos con URL (blob URLs), necesitamos convertirlos
          // Por ahora, asumimos que vienen como File objects desde el componente
          const archivosParaSubir: File[] = [];
          
          for (const archivo of gasto.archivosAdjuntos) {
            // Si el archivo tiene una propiedad 'file' (File object), usarlo
            // Si no, intentar obtener el archivo desde la URL blob
            if ((archivo as any).file instanceof File) {
              archivosParaSubir.push((archivo as any).file);
            } else {
              // Si viene como objeto con URL blob, necesitamos el File original
              // Por ahora, saltamos estos archivos y los manejaremos después
              console.warn("⚠️ Archivo sin File object:", archivo.nombre);
            }
          }
          
          // Subir cada archivo como attachment
          for (const archivo of archivosParaSubir) {
            try {
              console.log(`📎 Subiendo archivo: ${archivo.name}`);
              
              // Leer el archivo como ArrayBuffer
              const arrayBuffer = await archivo.arrayBuffer();
              
              console.log(`📤 Archivo leído: ${archivo.name} (${arrayBuffer.byteLength} bytes, tipo: ${archivo.type || 'application/octet-stream'})`);
              
              // Subir el archivo usando SharePoint REST API
              // Microsoft Graph API no soporta attachments en list items
              const siteUrl = getSharePointSiteUrl();
              const token = await getSharePointRestToken(); // Token específico para SharePoint REST API
              
              // Construir la URL de SharePoint REST API para subir el attachment
              // IMPORTANTE: Usar la URL completa del sitio (incluyendo el path), no solo el origin
              const listName = LISTS.GASTOS;
              // SharePoint REST API requiere que el nombre del archivo esté codificado correctamente
              // Usar encodeURIComponent para manejar caracteres especiales en el nombre del archivo
              const fileName = encodeURIComponent(archivo.name);
              const restApiUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${response.id})/AttachmentFiles/add(FileName='${fileName}')`;
              
              console.log(`📤 Subiendo archivo a: ${restApiUrl}`);
              
              // Subir el archivo usando SharePoint REST API
              // IMPORTANTE: SharePoint REST API requiere el contenido binario directamente, no base64
              // El Content-Type debe ser el tipo MIME del archivo o application/octet-stream
              const uploadResponse = await fetch(restApiUrl, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json;odata=verbose',
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': archivo.type || 'application/octet-stream',
                },
                body: arrayBuffer, // Usar el ArrayBuffer directamente, no base64
              });
              
              if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Error ${uploadResponse.status}: ${errorText}`);
              }
              
              console.log(`✅ Archivo ${archivo.name} subido exitosamente`);
            } catch (fileError: any) {
              console.error(`❌ Error al subir archivo ${archivo.name}:`, fileError);
              if (fileError?.body) {
                console.error("❌ Detalles del error:", JSON.stringify(fileError.body, null, 2));
              }
              // Continuar con los demás archivos
            }
          }
          
          if (archivosParaSubir.length > 0) {
            console.log(`✅ ${archivosParaSubir.length} archivo(s) adjunto(s) subido(s) exitosamente`);
          }
        } catch (attachmentsError: any) {
          console.error("❌ Error al subir archivos adjuntos:", attachmentsError);
          if (attachmentsError?.body) {
            console.error("❌ Detalles del error:", JSON.stringify(attachmentsError.body, null, 2));
          }
          // No lanzar el error - el item ya se creó, solo fallaron los archivos
          console.warn("⚠️ El gasto se creó pero algunos archivos adjuntos no se pudieron subir.");
        }
      }
      
      return {
        id: response.id,
        ...gasto,
      };
    } catch (error: any) {
      console.error("❌ Error al crear gasto:", error);
      if (error instanceof Error) {
        console.error("Detalles del error:", error.message);
      }
      // Mostrar más detalles del error si están disponibles
      if (error?.body) {
        console.error("Cuerpo del error:", JSON.stringify(error.body, null, 2));
      }
      if (error?.statusCode) {
        console.error("Código de estado:", error.statusCode);
      }
      throw error;
    }
  },

  async update(id: string, gasto: Partial<Gasto>): Promise<Gasto> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.GASTOS);
    
    try {
      // Obtener nombres internos de las columnas lookup (igual que en create)
      const categoriaColumnName = await getColumnInternalName(listId, "CATEGORIA");
      const empresaColumnName = await getColumnInternalName(listId, "EMPRESA");
      const proyectoColumnName = await getColumnInternalName(listId, "PROYECTO");
      const tipoDocumentoColumnName = await getColumnInternalName(listId, "TIPO_DOCUMENTO");
      
      // Campos básicos que NO son lookup
      const fields: any = {};
      
      if (gasto.fecha !== undefined && gasto.fecha !== null && gasto.fecha !== '') {
        fields.FECHA = gasto.fecha;
      }
      
      if (gasto.numeroDocumento !== undefined && gasto.numeroDocumento !== null && gasto.numeroDocumento !== '') {
        fields.NUMERO_DOCUMENTO = gasto.numeroDocumento;
      }
      
      // Ya no guardamos MONTO, solo MONTO_TOTAL
      if (gasto.montoTotal !== undefined && gasto.montoTotal !== null) {
        fields.MONTO_TOTAL = gasto.montoTotal;
      } else if (gasto.monto !== undefined && gasto.monto !== null) {
        // Fallback: si no hay montoTotal pero hay monto, usar monto como total
        fields.MONTO_TOTAL = gasto.monto;
      }
      
      if (gasto.montoNeto !== undefined && gasto.montoNeto !== null) {
        fields.MONTO_NETO = gasto.montoNeto;
      }
      
      if (gasto.iva !== undefined && gasto.iva !== null) {
        fields.IVA = gasto.iva;
      }
      
      if (gasto.detalle !== undefined && gasto.detalle !== null && gasto.detalle.trim() !== '') {
        fields.DETALLE = gasto.detalle;
      }
      
      if (gasto.comentarioTipoDocumento !== undefined && gasto.comentarioTipoDocumento !== null && gasto.comentarioTipoDocumento.trim() !== '') {
        fields.OTRO = gasto.comentarioTipoDocumento;
      }
      
      // Preparar campos lookup (usando formato LookupId)
      const lookupFields: any = {};
      
      // CATEGORIA
      if (gasto.categoria !== undefined && gasto.categoria !== null && gasto.categoria !== '') {
        const parsed = Number(gasto.categoria);
        if (!isNaN(parsed) && parsed > 0) {
          lookupFields[`${categoriaColumnName}LookupId`] = parsed;
          console.log("📝 Actualizando categoría con ID:", parsed);
        } else {
          console.warn("⚠️ ID de categoría inválido para actualización:", gasto.categoria);
        }
      }
      
      // EMPRESA
      if (gasto.empresaId !== undefined && gasto.empresaId !== null && gasto.empresaId !== '') {
        const parsed = Number(gasto.empresaId);
        if (!isNaN(parsed) && parsed > 0) {
          lookupFields[`${empresaColumnName}LookupId`] = parsed;
          console.log("📝 Actualizando empresa con ID:", parsed);
        } else {
          console.warn("⚠️ ID de empresa inválido para actualización:", gasto.empresaId);
        }
      }
      
      // PROYECTO
      if (gasto.proyectoId !== undefined && gasto.proyectoId !== null && gasto.proyectoId !== '') {
        const parsed = Number(gasto.proyectoId);
        if (!isNaN(parsed) && parsed > 0) {
          lookupFields[`${proyectoColumnName}LookupId`] = parsed;
          console.log("📝 Actualizando proyecto con ID:", parsed);
        } else {
          console.warn("⚠️ ID de proyecto inválido para actualización:", gasto.proyectoId);
        }
      }
      
      // TIPO_DOCUMENTO
      if (gasto.tipoDocumento !== undefined && gasto.tipoDocumento !== null && gasto.tipoDocumento !== '') {
        const parsed = Number(gasto.tipoDocumento);
        if (!isNaN(parsed) && parsed > 0) {
          lookupFields[`${tipoDocumentoColumnName}LookupId`] = parsed;
          console.log("📝 Actualizando tipo documento con ID:", parsed);
        } else {
          console.warn("⚠️ ID de tipo documento inválido para actualización:", gasto.tipoDocumento);
        }
      }
      
      // Limpiar campos: no enviar undefined, null o strings vacíos
      const cleanFields: any = {};
      Object.keys(fields).forEach(key => {
        const value = fields[key];
        if (value !== undefined && value !== null && value !== '') {
          cleanFields[key] = value;
        }
      });
      
      // Combinar campos normales y lookup
      const finalFields = { ...cleanFields, ...lookupFields };
      
      console.log("📤 Campos a actualizar:", JSON.stringify(finalFields, null, 2));
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}/fields`)
        .patch(finalFields);
      
      return {
        id,
        ...gasto,
      } as Gasto;
    } catch (error) {
      console.error("Error al actualizar gasto:", error);
      if (error instanceof Error) {
        console.error("Detalles del error:", error.message);
      }
      if ((error as any)?.body) {
        console.error("Cuerpo del error:", JSON.stringify((error as any).body, null, 2));
      }
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
        razonSocial: item.fields.NOM_EMPRESA || item.fields.NomEmpresa || item.fields.RazonSocial || "",
        rut: item.fields.RUT || item.fields.Rut || "",
        numeroContacto: item.fields.NUM_CONTACTO || item.fields.NumContacto || item.fields.NumeroContacto || undefined,
        correoElectronico: item.fields.CORREO || item.fields.Correo || item.fields.CorreoElectronico || undefined,
        categoria: item.fields.CATEGORIA || item.fields.Categoria || undefined,
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
      // Mapeo de campos del formulario a columnas de SharePoint (nombres reales)
      // NOM_EMPRESA, RUT, NUM_CONTACTO, CORREO, CATEGORIA
      const fields: any = {
        NOM_EMPRESA: empresa.razonSocial,
        RUT: empresa.rut,
        NUM_CONTACTO: empresa.numeroContacto || "",
        CORREO: empresa.correoElectronico || "",
      };
      
      // Agregar CATEGORIA si está definida (campo Choice)
      if (empresa.categoria) {
        fields.CATEGORIA = empresa.categoria;
      }
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields,
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
      // Mapeo usando los nombres reales de SharePoint
      const fields: any = {};
      if (empresa.razonSocial !== undefined) fields.NOM_EMPRESA = empresa.razonSocial;
      if (empresa.rut !== undefined) fields.RUT = empresa.rut;
      if (empresa.numeroContacto !== undefined) fields.NUM_CONTACTO = empresa.numeroContacto || "";
      if (empresa.correoElectronico !== undefined) fields.CORREO = empresa.correoElectronico || "";
      if (empresa.categoria !== undefined) fields.CATEGORIA = empresa.categoria || "";
      
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
        nombre: item.fields.NOM_PROYECTO || item.fields.NomProyecto || item.fields.Nombre || item.fields.Title || "",
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
      // Mapeo usando el nombre real de la columna en SharePoint: NOM_PROYECTO
      const fields: any = {
        NOM_PROYECTO: proyecto.nombre,
      };
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields,
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
        nombre: item.fields.NOMBRE || item.fields.Nombre || item.fields.Title || "",
        email: item.fields.CORREO || item.fields.Correo || item.fields.Email || undefined,
        telefono: item.fields.NUM_CONTACTO || item.fields.NumContacto || item.fields.Telefono || undefined,
        cargo: item.fields.CARGO || item.fields.Cargo || undefined,
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
      // Mapeo usando los nombres reales de las columnas en SharePoint: NOMBRE, CORREO, NUM_CONTACTO, CARGO
      const fields: any = {
        NOMBRE: colaborador.nombre,
        CORREO: colaborador.email || "",
        NUM_CONTACTO: colaborador.telefono || "",
        CARGO: colaborador.cargo || "",
      };
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields,
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

// ========== SERVICIOS PARA CATEGORIAS ==========

export interface Categoria {
  id: string;
  nombre: string;
  color?: string;
}

export const categoriasService = {
  async getAll(): Promise<Categoria[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.CATEGORIAS);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        nombre: item.fields.NOM_CATEGORIA || item.fields.NomCategoria || item.fields.NOMBRE || item.fields.Nombre || item.fields.Title || "",
        color: item.fields.COLOR || item.fields.Color || `bg-category-${item.id}`,
      }));
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      throw error;
    }
  },

  async create(categoria: Omit<Categoria, "id">): Promise<Categoria> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.CATEGORIAS);
    
    try {
      const fields: any = {
        NOM_CATEGORIA: categoria.nombre,
      };
      
      if (categoria.color) {
        fields.COLOR = categoria.color;
      }
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields,
        });
      
      return {
        id: response.id,
        ...categoria,
      };
    } catch (error) {
      console.error("Error al crear categoría:", error);
      throw error;
    }
  },

  async update(id: string, categoria: Partial<Categoria>): Promise<Categoria> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.CATEGORIAS);
    
    try {
      const fields: any = {};
      if (categoria.nombre !== undefined) fields.NOM_CATEGORIA = categoria.nombre;
      if (categoria.color !== undefined) fields.COLOR = categoria.color;
      
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}/fields`)
        .patch(fields);
      
      return {
        id,
        ...categoria,
      } as Categoria;
    } catch (error) {
      console.error("Error al actualizar categoría:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.CATEGORIAS);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      throw error;
    }
  },

  /**
   * Actualiza los colores de las categorías basándose en los nombres
   * Mapea los nombres de categorías locales a sus colores (clases Tailwind que usan variables CSS)
   */
  async updateCategoriasColors(): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.CATEGORIAS);
    
    // Mapeo de nombres de categorías a clases Tailwind que usan las variables CSS pasteles
    // Estas clases referencian los colores definidos en index.css
    const colorMap: Record<string, string> = {
      'Gastos Generales': 'bg-category-gastos-generales',
      'Sueldos': 'bg-category-sueldos',
      'Honorarios': 'bg-category-honorarios',
      'Mantenimiento': 'bg-category-mantenimiento',
      'Materiales': 'bg-category-materiales',
    };
    
    try {
      // Obtener todas las categorías
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      // Actualizar cada categoría con su color correspondiente
      const updatePromises = response.value.map(async (item: any) => {
        const nombre = item.fields.NOM_CATEGORIA || item.fields.NomCategoria || item.fields.NOMBRE || item.fields.Nombre || item.fields.Title || "";
        const color = colorMap[nombre];
        
        if (color) {
          try {
            await client
              .api(`/sites/${siteId}/lists/${listId}/items/${item.id}/fields`)
              .patch({
                COLOR: color,
              });
            console.log(`✅ Color actualizado para "${nombre}": ${color}`);
          } catch (error) {
            console.error(`❌ Error al actualizar color para "${nombre}":`, error);
          }
        } else {
          console.warn(`⚠️ No se encontró color para la categoría "${nombre}"`);
        }
      });
      
      await Promise.all(updatePromises);
      console.log("✅ Actualización de colores completada");
    } catch (error) {
      console.error("Error al actualizar colores de categorías:", error);
      throw error;
    }
  },
};

// ========== SERVICIOS PARA TIPOS DE DOCUMENTO ==========

export interface TipoDocumento {
  id: string;
  nombre: string;
  tieneImpuestos?: boolean;
  valorImpuestos?: number;
}

export const tiposDocumentoService = {
  async getAll(): Promise<TipoDocumento[]> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.TIPOS_DOCUMENTO);
    
    try {
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .expand("fields")
        .get();
      
      return response.value.map((item: any) => ({
        id: item.id,
        nombre: item.fields.NOM_DOCUMENTO || item.fields.NomDocumento || item.fields.NOMBRE || item.fields.Nombre || item.fields.Title || "",
        tieneImpuestos: item.fields.APLICA_IMPUESTO || item.fields.AplicaImpuesto || item.fields.aplicaImpuesto || false,
        valorImpuestos: item.fields.VALOR_IMPUESTO || item.fields.ValorImpuesto || item.fields.valorImpuesto || undefined,
      }));
    } catch (error) {
      console.error("Error al obtener tipos de documento:", error);
      throw error;
    }
  },

  async create(tipoDocumento: Omit<TipoDocumento, "id">): Promise<TipoDocumento> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.TIPOS_DOCUMENTO);
    
    try {
      const fields: any = {
        NOM_DOCUMENTO: tipoDocumento.nombre,
      };
      
      // Agregar campos de impuestos si están definidos
      if (tipoDocumento.tieneImpuestos !== undefined) {
        fields.APLICA_IMPUESTO = tipoDocumento.tieneImpuestos;
      }
      if (tipoDocumento.valorImpuestos !== undefined) {
        fields.VALOR_IMPUESTO = tipoDocumento.valorImpuestos;
      }
      
      const response = await client
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .post({
          fields,
        });
      
      return {
        id: response.id,
        ...tipoDocumento,
      };
    } catch (error) {
      console.error("Error al crear tipo de documento:", error);
      throw error;
    }
  },

  async update(id: string, tipoDocumento: Partial<TipoDocumento>): Promise<TipoDocumento> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.TIPOS_DOCUMENTO);
    
    try {
      const fields: any = {};
      if (tipoDocumento.nombre !== undefined) fields.NOM_DOCUMENTO = tipoDocumento.nombre;
      if (tipoDocumento.tieneImpuestos !== undefined) fields.APLICA_IMPUESTO = tipoDocumento.tieneImpuestos;
      if (tipoDocumento.valorImpuestos !== undefined) fields.VALOR_IMPUESTO = tipoDocumento.valorImpuestos;
      
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}/fields`)
        .patch(fields);
      
      return {
        id,
        ...tipoDocumento,
      } as TipoDocumento;
    } catch (error) {
      console.error("Error al actualizar tipo de documento:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const client = await getGraphClient();
    const siteId = await getCachedSiteId();
    const listId = await getListId(LISTS.TIPOS_DOCUMENTO);
    
    try {
      await client
        .api(`/sites/${siteId}/lists/${listId}/items/${id}`)
        .delete();
    } catch (error) {
      console.error("Error al eliminar tipo de documento:", error);
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

