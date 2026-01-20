import { Client } from "@microsoft/microsoft-graph-client";
import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { msalInstance, graphScopes } from "./msalConfig";

/**
 * Obtiene un token de acceso para Microsoft Graph API
 */
export async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount();
  
  if (!account) {
    throw new Error("No hay cuenta activa. Por favor, inicia sesión.");
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: graphScopes,
      account: account,
    });
    
    return response.accessToken;
  } catch (error) {
    // Si falla el token silencioso, intentar con popup
    const response = await msalInstance.acquireTokenPopup({
      scopes: graphScopes,
    });
    
    return response.accessToken;
  }
}

/**
 * Crea un cliente de Microsoft Graph con autenticación
 */
export async function getGraphClient(): Promise<Client> {
  const token = await getAccessToken();
  
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

/**
 * Obtiene el Site ID de SharePoint basado en la URL del sitio
 */
export async function getSiteId(): Promise<string> {
  const siteUrl = import.meta.env.VITE_SHAREPOINT_SITE_URL || "";
  const client = await getGraphClient();
  
  // Extraer el hostname y el path del sitio
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const path = url.pathname;
  
  try {
    // Obtener el sitio por hostname y path
    const site = await client
      .api(`/sites/${hostname}:${path}`)
      .get();
    
    return site.id;
  } catch (error) {
    console.error("Error al obtener Site ID:", error);
    throw new Error(`No se pudo obtener el Site ID. Verifica que la URL del sitio sea correcta: ${siteUrl}`);
  }
}

