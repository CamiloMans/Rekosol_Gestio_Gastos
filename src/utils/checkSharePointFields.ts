import { getGraphClient, getSiteId } from "@/lib/sharepointClient";

/**
 * Obtiene los campos (columnas) de una lista en SharePoint
 */
export async function getListFields(listName: string) {
  try {
    const client = await getGraphClient();
    const siteId = await getSiteId();
    
    // Obtener el ID de la lista
    const lists = await client
      .api(`/sites/${siteId}/lists`)
      .filter(`displayName eq '${listName}'`)
      .get();
    
    if (!lists.value || lists.value.length === 0) {
      throw new Error(`Lista "${listName}" no encontrada`);
    }
    
    const listId = lists.value[0].id;
    const listInfo = lists.value[0];
    
    // Obtener las columnas de la lista
    const columns = await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .get();
    
    return {
      listId,
      listName: listInfo.displayName,
      columns: columns.value.map((col: any) => {
        // Determinar el tipo del campo
        let fieldType = 'unknown';
        if (col.text) fieldType = 'text';
        else if (col.number) fieldType = 'number';
        else if (col.choice) fieldType = 'choice';
        else if (col.dateTime) fieldType = 'dateTime';
        else if (col.multiline) fieldType = 'multiline';
        else if (col.boolean) fieldType = 'boolean';
        else if (col.currency) fieldType = 'currency';
        else if (col.url) fieldType = 'url';
        else if (col.lookup) fieldType = 'lookup';
        else if (col.personOrGroup) fieldType = 'personOrGroup';
        else if (col.type) fieldType = col.type;
        
        return {
          name: col.name || col.id,
          displayName: col.displayName || col.name || col.id,
          type: fieldType,
          required: col.required || false,
          readOnly: col.readOnly || false,
          description: col.description || '',
          hidden: col.hidden || false,
          indexed: col.indexed || false,
          raw: col, // Incluir objeto completo para debugging
        };
      }),
    };
  } catch (error: any) {
    console.error("Error al obtener campos de la lista:", error);
    if (error.response) {
      console.error("Response:", error.response);
    }
    if (error.message) {
      throw new Error(`Error al obtener campos: ${error.message}`);
    }
    throw new Error("Error desconocido al obtener campos de la lista");
  }
}

