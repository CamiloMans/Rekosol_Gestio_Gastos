import { Client } from "@microsoft/microsoft-graph-client";
import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { msalInstance, graphScopes } from "./msalConfig";

/**
 * Obtiene un token de acceso para Microsoft Graph API
 */
export async function getAccessToken(): Promise<string> {
  try {
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
    } catch (error: any) {
      // Si falla el token silencioso, intentar con popup solo si no es un error de cancelación
      if (error.errorCode === "user_cancelled" || error.errorCode === "consent_required") {
        throw error;
      }
      
      const response = await msalInstance.acquireTokenPopup({
        scopes: graphScopes,
      });
      
      return response.accessToken;
    }
  } catch (error: any) {
    console.error("Error al obtener token de acceso:", error);
    throw new Error(error.message || "Error al obtener token de acceso. Por favor, inicia sesión.");
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
 * Obtiene un token de acceso específico para SharePoint REST API
 * SharePoint REST API requiere un token con el scope del sitio, no de Microsoft Graph
 */
export async function getSharePointRestToken(): Promise<string> {
  try {
    const account = msalInstance.getActiveAccount();
    
    if (!account) {
      throw new Error("No hay cuenta activa. Por favor, inicia sesión.");
    }

    const siteUrl = import.meta.env.VITE_SHAREPOINT_SITE_URL || "";
    if (!siteUrl) {
      throw new Error("VITE_SHAREPOINT_SITE_URL no está configurado");
    }

    // Construir el scope para SharePoint REST API
    // Formato: https://{tenant}.sharepoint.com/.default o https://{siteUrl}/.default
    const url = new URL(siteUrl);
    const sharePointScope = `${url.origin}/.default`;

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: [sharePointScope],
        account: account,
      });
      
      return response.accessToken;
    } catch (error: any) {
      // Si falla el token silencioso, intentar con popup
      if (error.errorCode === "user_cancelled" || error.errorCode === "consent_required") {
        throw error;
      }
      
      const response = await msalInstance.acquireTokenPopup({
        scopes: [sharePointScope],
      });
      
      return response.accessToken;
    }
  } catch (error: any) {
    console.error("Error al obtener token de SharePoint REST API:", error);
    throw new Error(error.message || "Error al obtener token de SharePoint REST API. Por favor, inicia sesión.");
  }
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

