import { Configuration, PublicClientApplication } from "@azure/msal-browser";

// Verificar configuración
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";

if (!clientId || !tenantId) {
  console.warn("⚠️ Variables de entorno no configuradas. Verifica el archivo .env");
}

// Configuración de MSAL
export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
};

// Crear instancia de MSAL
export const msalInstance = new PublicClientApplication(msalConfig);

// Nota: La inicialización se hace en main.tsx para evitar problemas de timing

// Scopes requeridos para SharePoint
// Para SPA, no se puede usar .default con scopes específicos
// Debe usar el formato completo: https://graph.microsoft.com/ScopeName
export const graphScopes = [
  "https://graph.microsoft.com/Sites.ReadWrite.All",
  "https://graph.microsoft.com/Files.ReadWrite.All",
  "openid",
  "profile",
  "offline_access",
];

// Configuración para login
export const loginRequest = {
  scopes: graphScopes,
};

