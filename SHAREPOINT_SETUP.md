# Configuración de SharePoint para RekoSol

Este documento explica cómo configurar SharePoint para la aplicación de gestión de gastos.

## Prerequisitos

1. **Acceso a Azure Portal** con permisos de administrador
2. **Cuenta de Office 365** con SharePoint
3. **Sitio de SharePoint** creado (en este caso: `https://rekosolcl.sharepoint.com/sites/REKOSOL-GESTIONDEGASTOS`)

## Paso 1: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
VITE_AZURE_CLIENT_ID=29dab7f0-65d9-4f70-97c3-84f90a260ad5
VITE_AZURE_TENANT_ID=171e890b-edfd-4ff3-ae4f-5b25b45e75ee
VITE_SHAREPOINT_SITE_URL=https://rekosolcl.sharepoint.com/sites/REKOSOL-GESTIONDEGASTOS
```

## Paso 2: Configurar Permisos de API en Azure Portal

1. Ve a [Azure Portal](https://portal.azure.com)
2. Navega a **Azure Active Directory** > **App registrations**
3. Busca tu aplicación "Rekosol – Web App"
4. Ve a **API permissions**
5. Asegúrate de tener los siguientes permisos:
   - `Sites.ReadWrite.All` (Microsoft Graph)
   - `Files.ReadWrite.All` (Microsoft Graph)
6. Haz clic en **Grant admin consent** para dar consentimiento administrativo

## Paso 3: Crear Listas en SharePoint

Necesitas crear las siguientes listas en tu sitio de SharePoint:

### Lista "REGISTRO_GASTOS"
Campos requeridos:
- **Fecha** (Single line of text o Date)
- **EmpresaId** (Single line of text)
- **Categoria** (Single line of text)
- **TipoDocumento** (Choice: Factura, Boleta, Orden de Compra, Sin Documento, Otros)
- **NumeroDocumento** (Single line of text)
- **Monto** (Number)
- **Detalle** (Multiple lines of text)
- **ProyectoId** (Single line of text)
- **ColaboradorId** (Single line of text)
- **ComentarioTipoDocumento** (Single line of text)
- **ArchivosAdjuntos** (Multiple lines of text - JSON)

### Lista "Empresas"
Campos requeridos:
- **RazonSocial** (Single line of text)
- **RUT** (Single line of text)
- **NumeroContacto** (Single line of text)
- **CorreoElectronico** (Single line of text)
- **CreatedAt** (Single line of text)

### Lista "Proyectos"
Campos requeridos:
- **Title** (Single line of text) - Este campo existe por defecto
- **Nombre** (Single line of text)
- **CreatedAt** (Single line of text)

### Lista "Colaboradores"
Campos requeridos:
- **Title** (Single line of text) - Este campo existe por defecto
- **Nombre** (Single line of text)
- **Email** (Single line of text)
- **Telefono** (Single line of text)
- **Cargo** (Single line of text)
- **CreatedAt** (Single line of text)

## Paso 4: Crear Document Library

Crea una Document Library llamada **"DocumentosGastos"** para almacenar los archivos adjuntos de los gastos.

## Uso de la Aplicación

1. Inicia la aplicación: `npm run dev`
2. Haz clic en **"Iniciar Sesión"** en la barra lateral
3. Inicia sesión con tu cuenta de Office 365
4. Una vez autenticado, los datos se cargarán y guardarán en SharePoint automáticamente

## Notas Importantes

- Si no estás autenticado, la aplicación usará datos locales (mock) como respaldo
- Los cambios se guardan directamente en SharePoint cuando estás autenticado
- Asegúrate de tener los permisos necesarios en SharePoint para leer/escribir en las listas

## Solución de Problemas

### Error: "No hay cuenta activa"
- Asegúrate de hacer clic en "Iniciar Sesión" y completar el proceso de autenticación

### Error: "Lista no encontrada en SharePoint"
- Verifica que las listas estén creadas con los nombres exactos: "REGISTRO_GASTOS", "Empresas", "Proyectos", "Colaboradores"
- Verifica que tengas permisos de lectura en el sitio

### Error: "No se pudo obtener el Site ID"
- Verifica que la URL del sitio en `.env` sea correcta
- Verifica que tengas acceso al sitio de SharePoint

