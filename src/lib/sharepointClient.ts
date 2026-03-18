import { Client } from "@microsoft/microsoft-graph-client";
import { msalInstance, graphScopes } from "./msalConfig";

/**
 * Normaliza y valida la URL de SharePoint
 * Asegura que tenga el protocolo https:// correcto
 */
export function normalizeSharePointUrl(url: string): string {
  if (!url) {
    return url;
  }

  // Eliminar espacios en blanco
  url = url.trim();

  // Corregir errores comunes como "ttps://" -> "https://"
  url = url.replace(/^ttps:\/\//, "https://");

  // Corregir casos donde ya se agrego https:// pero la URL tenia ttps://
  url = url.replace(/^https:\/\/ttps:\/\//, "https://");
  url = url.replace(/^http:\/\/ttps:\/\//, "https://");

  // Si la URL no tiene protocolo, agregarlo
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Forzar HTTPS para SharePoint
  url = url.replace(/^http:\/\//, "https://");

  return url;
}

/**
 * Obtiene token de Microsoft Graph para los scopes indicados.
 */
export async function getAccessTokenWithScopes(scopes: string[]): Promise<string> {
  try {
    const account = msalInstance.getActiveAccount();

    if (!account) {
      throw new Error("No hay cuenta activa. Por favor, inicia sesion.");
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account,
      });

      return response.accessToken;
    } catch (error: any) {
      if (error.errorCode === "user_cancelled") {
        throw error;
      }

      const response = await msalInstance.acquireTokenPopup({ scopes });
      return response.accessToken;
    }
  } catch (error: any) {
    console.error("Error al obtener token de acceso:", error);
    throw new Error(error.message || "Error al obtener token de acceso. Por favor, inicia sesion.");
  }
}

/**
 * Obtiene un token de acceso para Microsoft Graph API con scopes estandar.
 */
export async function getAccessToken(): Promise<string> {
  return getAccessTokenWithScopes(graphScopes);
}

/**
 * Crea un cliente de Microsoft Graph con autenticacion estandar.
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
 * Crea un cliente de Microsoft Graph con scopes explicitos.
 */
export async function getGraphClientWithScopes(scopes: string[]): Promise<Client> {
  const token = await getAccessTokenWithScopes(scopes);

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

/**
 * Obtiene la URL de SharePoint normalizada desde variables de entorno.
 */
export function getSharePointSiteUrl(): string {
  let siteUrl = import.meta.env.VITE_SHAREPOINT_SITE_URL || "";
  if (!siteUrl) {
    throw new Error("VITE_SHAREPOINT_SITE_URL no esta configurado");
  }

  siteUrl = normalizeSharePointUrl(siteUrl);

  try {
    const url = new URL(siteUrl);
    if (!url.hostname || url.hostname.includes("ttps") || url.hostname.includes("null")) {
      throw new Error(`URL de SharePoint invalida despues de normalizacion: ${siteUrl}`);
    }
  } catch (error) {
    throw new Error(
      `VITE_SHAREPOINT_SITE_URL no es una URL valida: ${siteUrl}. Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return siteUrl;
}

/**
 * Obtiene token especifico para SharePoint REST API.
 */
export async function getSharePointRestToken(): Promise<string> {
  try {
    const account = msalInstance.getActiveAccount();

    if (!account) {
      throw new Error("No hay cuenta activa. Por favor, inicia sesion.");
    }

    const siteUrl = getSharePointSiteUrl();
    const url = new URL(siteUrl);

    if (!url.origin || url.origin === "null") {
      throw new Error(`No se pudo obtener el origen de la URL de SharePoint: ${siteUrl}`);
    }

    const sharePointScope = `${url.origin}/.default`;

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: [sharePointScope],
        account,
      });

      return response.accessToken;
    } catch (error: any) {
      if (error.errorCode === "user_cancelled") {
        throw error;
      }

      const response = await msalInstance.acquireTokenPopup({
        scopes: [sharePointScope],
      });

      return response.accessToken;
    }
  } catch (error: any) {
    console.error("Error al obtener token de SharePoint REST API:", error);
    throw new Error(
      error.message || "Error al obtener token de SharePoint REST API. Por favor, inicia sesion.",
    );
  }
}

/**
 * Obtiene el Site ID de SharePoint basado en la URL del sitio.
 */
export async function getSiteId(): Promise<string> {
  const siteUrl = getSharePointSiteUrl();
  const client = await getGraphClient();

  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const path = url.pathname;

  try {
    const site = await client
      .api(`/sites/${hostname}:${path}`)
      .get();

    return site.id;
  } catch (error) {
    console.error("Error al obtener Site ID:", error);
    throw new Error(`No se pudo obtener el Site ID. Verifica que la URL del sitio sea correcta: ${siteUrl}`);
  }
}
