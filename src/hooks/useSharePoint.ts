import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import { loginRequest } from "@/lib/msalConfig";
import type { Gasto, Empresa, Proyecto, Colaborador } from "@/data/mockData";
import {
  gastosService,
  empresasService,
  proyectosService,
  colaboradoresService,
  categoriasService,
  tiposDocumentoService,
  controlPagosSchemaService,
  tiposDocumentoProyectoService,
  documentosProyectoService,
  hitosPagoProyectoService,
  type Categoria,
  type TipoDocumento,
  type TipoDocumentoProyecto,
  type DocumentoProyecto,
  type HitoPagoProyecto,
  type HitoPagoProyectoCreateInput,
} from "@/services/sharepointService";

export function useSharePointAuth() {
  const { instance, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay cuentas
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [accounts, instance]);

  const login = async () => {
    try {
      console.log("Intentando iniciar sesión...");
      console.log("Client ID:", import.meta.env.VITE_AZURE_CLIENT_ID ? "Configurado" : "FALTANTE");
      console.log("Tenant ID:", import.meta.env.VITE_AZURE_TENANT_ID ? "Configurado" : "FALTANTE");
      console.log("Redirect URI:", window.location.origin);
      
      // Usar redirect directamente ya que es más confiable
      // El popup puede ser bloqueado por el navegador
      await instance.loginRedirect({
        ...loginRequest,
        redirectUri: window.location.origin,
      });
      
      // Con redirect, la página se redirigirá a Microsoft y luego volverá
      // No necesitamos hacer nada más aquí, el handleRedirectPromise en main.tsx se encargará
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      
      // Manejar errores específicos
      if (error.errorCode === "user_cancelled") {
        throw new Error("Inicio de sesión cancelado por el usuario");
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Error desconocido al iniciar sesión. Revisa la consola para más detalles.");
      }
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    account: accounts[0] || null,
  };
}

type UseGastosOptions = {
  mode?: "recent" | "all";
  includeAttachments?: boolean;
};

// Hook para gestionar gastos desde SharePoint
export function useGastos(options: UseGastosOptions = {}) {
  const { mode = "recent", includeAttachments = true } = options;
  const { isAuthenticated } = useSharePointAuth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadGastos = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await gastosService.getAll({ mode, includeAttachments });
      setGastos(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      console.error("Error al cargar gastos:", err);
    } finally {
      setLoading(false);
    }
  };

  const createGasto = async (gasto: Omit<Gasto, "id">) => {
    try {
      const nuevoGasto = await gastosService.create(gasto);
      setGastos([...gastos, nuevoGasto]);
      return nuevoGasto;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear gasto"));
      throw err;
    }
  };

  const updateGasto = async (id: string, gasto: Partial<Gasto>) => {
    try {
      const gastoActualizado = await gastosService.update(id, gasto);
      setGastos(gastos.map((g) => (g.id === id ? { ...g, ...gastoActualizado } : g)));
      return gastoActualizado;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al actualizar gasto"));
      throw err;
    }
  };

  const deleteGasto = async (id: string) => {
    try {
      await gastosService.delete(id);
      setGastos(gastos.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar gasto"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGastos();
    }
  }, [isAuthenticated, mode, includeAttachments]);

  return {
    gastos,
    loading,
    error,
    loadGastos,
    createGasto,
    updateGasto,
    deleteGasto,
  };
}

// Hook para gestionar empresas desde SharePoint
const EMPRESAS_CACHE_KEY = "empresas_cache";
const EMPRESAS_CACHE_TIMESTAMP = "empresas_cache_timestamp";
const EMPRESAS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useEmpresas() {
  const { isAuthenticated } = useSharePointAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadEmpresas = async (forceRefresh = false) => {
    if (!isAuthenticated) return;
    
    // Verificar caché si no es un refresh forzado
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(EMPRESAS_CACHE_KEY);
        const timestamp = sessionStorage.getItem(EMPRESAS_CACHE_TIMESTAMP);
        
        if (cached && timestamp) {
          const cacheAge = Date.now() - parseInt(timestamp, 10);
          if (cacheAge < EMPRESAS_CACHE_DURATION) {
            // El caché es válido, usar datos cacheados
            setEmpresas(JSON.parse(cached));
            return;
          }
        }
      } catch (e) {
        // Si hay error al leer el caché, continuar con la carga normal
        console.warn("Error al leer caché de empresas:", e);
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log("🔄 Cargando empresas desde SharePoint...");
      const data = await empresasService.getAll();
      console.log(`✅ Empresas cargadas: ${data.length} encontradas`, data);
      setEmpresas(data);
      
      // Guardar en caché
      try {
        sessionStorage.setItem(EMPRESAS_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(EMPRESAS_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al guardar caché de empresas:", e);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(err instanceof Error ? err : new Error(errorMessage));
      console.error("❌ Error al cargar empresas:", err);
      
      // Mostrar el error en la consola con más detalles
      if (err instanceof Error) {
        console.error("Detalles del error:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmpresa = async (empresa: Omit<Empresa, "id" | "createdAt">) => {
    try {
      const nuevaEmpresa = await empresasService.create(empresa);
      const nuevasEmpresas = [...empresas, nuevaEmpresa];
      setEmpresas(nuevasEmpresas);
      
      // Actualizar caché
      try {
        sessionStorage.setItem(EMPRESAS_CACHE_KEY, JSON.stringify(nuevasEmpresas));
        sessionStorage.setItem(EMPRESAS_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al actualizar caché de empresas:", e);
      }
      
      return nuevaEmpresa;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear empresa"));
      throw err;
    }
  };

  const updateEmpresa = async (id: string, empresa: Partial<Empresa>) => {
    try {
      await empresasService.update(id, empresa);
      setEmpresas(empresas.map((e) => (e.id === id ? { ...e, ...empresa } : e)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al actualizar empresa"));
      throw err;
    }
  };

  const deleteEmpresa = async (id: string) => {
    try {
      await empresasService.delete(id);
      setEmpresas(empresas.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar empresa"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadEmpresas();
    }
  }, [isAuthenticated]);

  return {
    empresas,
    loading,
    error,
    loadEmpresas,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
}

// Hook para gestionar proyectos desde SharePoint
export function useProyectos() {
  const { isAuthenticated } = useSharePointAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadProyectos = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await proyectosService.getAll();
      setProyectos(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      console.error("Error al cargar proyectos:", err);
    } finally {
      setLoading(false);
    }
  };

  const createProyecto = async (proyecto: Omit<Proyecto, "id" | "createdAt">) => {
    try {
      const nuevoProyecto = await proyectosService.create(proyecto);
      setProyectos([...proyectos, nuevoProyecto]);
      return nuevoProyecto;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear proyecto"));
      throw err;
    }
  };

  const updateProyecto = async (id: string, proyecto: Partial<Proyecto>) => {
    try {
      const proyectoActualizado = await proyectosService.update(id, proyecto);
      setProyectos(proyectos.map((p) => (p.id === id ? { ...p, ...proyectoActualizado } : p)));
      return proyectoActualizado;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al actualizar proyecto"));
      throw err;
    }
  };

  const deleteProyecto = async (id: string) => {
    try {
      await proyectosService.delete(id);
      setProyectos(proyectos.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar proyecto"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProyectos();
    }
  }, [isAuthenticated]);

  return {
    proyectos,
    loading,
    error,
    loadProyectos,
    createProyecto,
    updateProyecto,
    deleteProyecto,
  };
}

// Hook para gestionar colaboradores desde SharePoint
const COLABORADORES_CACHE_KEY = "colaboradores_cache";
const COLABORADORES_CACHE_TIMESTAMP = "colaboradores_cache_timestamp";
const COLABORADORES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useColaboradores() {
  const { isAuthenticated } = useSharePointAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadColaboradores = async (forceRefresh = false) => {
    if (!isAuthenticated) return;
    
    // Verificar caché si no es un refresh forzado
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(COLABORADORES_CACHE_KEY);
        const timestamp = sessionStorage.getItem(COLABORADORES_CACHE_TIMESTAMP);
        
        if (cached && timestamp) {
          const cacheAge = Date.now() - parseInt(timestamp, 10);
          if (cacheAge < COLABORADORES_CACHE_DURATION) {
            // El caché es válido, usar datos cacheados
            setColaboradores(JSON.parse(cached));
            return;
          }
        }
      } catch (e) {
        // Si hay error al leer el caché, continuar con la carga normal
        console.warn("Error al leer caché de colaboradores:", e);
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log("🔄 Cargando colaboradores desde SharePoint...");
      const data = await colaboradoresService.getAll();
      console.log(`✅ Colaboradores cargados: ${data.length} encontrados`, data);
      setColaboradores(data);
      
      // Guardar en caché
      try {
        sessionStorage.setItem(COLABORADORES_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(COLABORADORES_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al guardar caché de colaboradores:", e);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(err instanceof Error ? err : new Error(errorMessage));
      console.error("❌ Error al cargar colaboradores:", err);
      
      // Mostrar el error en la consola con más detalles
      if (err instanceof Error) {
        console.error("Detalles del error:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createColaborador = async (colaborador: Omit<Colaborador, "id" | "createdAt">) => {
    try {
      const nuevoColaborador = await colaboradoresService.create(colaborador);
      const nuevosColaboradores = [...colaboradores, nuevoColaborador];
      setColaboradores(nuevosColaboradores);
      
      // Actualizar caché
      try {
        sessionStorage.setItem(COLABORADORES_CACHE_KEY, JSON.stringify(nuevosColaboradores));
        sessionStorage.setItem(COLABORADORES_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al actualizar caché de colaboradores:", e);
      }
      
      return nuevoColaborador;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear colaborador"));
      throw err;
    }
  };

  const deleteColaborador = async (id: string) => {
    try {
      await colaboradoresService.delete(id);
      setColaboradores(colaboradores.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar colaborador"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadColaboradores();
    }
  }, [isAuthenticated]);

  return {
    colaboradores,
    loading,
    error,
    loadColaboradores,
    createColaborador,
    deleteColaborador,
  };
}

// Hook para gestionar categorías desde SharePoint
const CATEGORIAS_CACHE_KEY = "categorias_cache";
const CATEGORIAS_CACHE_TIMESTAMP = "categorias_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useCategorias() {
  const { isAuthenticated } = useSharePointAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCategorias = async (forceRefresh = false) => {
    if (!isAuthenticated) return;
    
    // Verificar caché si no es un refresh forzado
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CATEGORIAS_CACHE_KEY);
        const timestamp = sessionStorage.getItem(CATEGORIAS_CACHE_TIMESTAMP);
        
        if (cached && timestamp) {
          const cacheAge = Date.now() - parseInt(timestamp, 10);
          if (cacheAge < CACHE_DURATION) {
            // El caché es válido, usar datos cacheados
            setCategorias(JSON.parse(cached));
            return;
          }
        }
      } catch (e) {
        // Si hay error al leer el caché, continuar con la carga normal
        console.warn("Error al leer caché de categorías:", e);
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await categoriasService.getAll();
      setCategorias(data);
      
      // Guardar en caché
      try {
        sessionStorage.setItem(CATEGORIAS_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(CATEGORIAS_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al guardar caché de categorías:", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      console.error("Error al cargar categorías:", err);
    } finally {
      setLoading(false);
    }
  };

  const createCategoria = async (categoria: Omit<Categoria, "id">) => {
    try {
      const nuevaCategoria = await categoriasService.create(categoria);
      const nuevasCategorias = [...categorias, nuevaCategoria];
      setCategorias(nuevasCategorias);
      
      // Actualizar caché
      try {
        sessionStorage.setItem(CATEGORIAS_CACHE_KEY, JSON.stringify(nuevasCategorias));
        sessionStorage.setItem(CATEGORIAS_CACHE_TIMESTAMP, Date.now().toString());
      } catch (e) {
        console.warn("Error al actualizar caché de categorías:", e);
      }
      
      return nuevaCategoria;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear categoría"));
      throw err;
    }
  };

  const updateCategoria = async (id: string, categoria: Partial<Categoria>) => {
    try {
      await categoriasService.update(id, categoria);
      setCategorias(categorias.map((c) => (c.id === id ? { ...c, ...categoria } : c)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al actualizar categoría"));
      throw err;
    }
  };

  const deleteCategoria = async (id: string) => {
    try {
      await categoriasService.delete(id);
      setCategorias(categorias.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar categoría"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCategorias();
    }
  }, [isAuthenticated]);

  return {
    categorias,
    loading,
    error,
    loadCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  };
}

// Hook para gestionar tipos de documento desde SharePoint
export function useTiposDocumento() {
  const { isAuthenticated } = useSharePointAuth();
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTiposDocumento = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await tiposDocumentoService.getAll();
      setTiposDocumento(data);
    } catch (err) {
      // Si la lista no existe, usar array vacío en lugar de mostrar error
      console.warn("No se pudo cargar tipos de documento desde SharePoint:", err);
      setTiposDocumento([]);
      setError(null); // No mostrar error si la lista no existe
    } finally {
      setLoading(false);
    }
  };

  const createTipoDocumento = async (tipoDocumento: Omit<TipoDocumento, "id">) => {
    try {
      const nuevoTipoDocumento = await tiposDocumentoService.create(tipoDocumento);
      setTiposDocumento([...tiposDocumento, nuevoTipoDocumento]);
      return nuevoTipoDocumento;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al crear tipo de documento"));
      throw err;
    }
  };

  const updateTipoDocumento = async (id: string, tipoDocumento: Partial<TipoDocumento>) => {
    try {
      await tiposDocumentoService.update(id, tipoDocumento);
      setTiposDocumento(tiposDocumento.map((t) => (t.id === id ? { ...t, ...tipoDocumento } : t)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al actualizar tipo de documento"));
      throw err;
    }
  };

  const deleteTipoDocumento = async (id: string) => {
    try {
      await tiposDocumentoService.delete(id);
      setTiposDocumento(tiposDocumento.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al eliminar tipo de documento"));
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTiposDocumento();
    }
  }, [isAuthenticated]);

  return {
    tiposDocumento,
    loading,
    error,
    loadTiposDocumento,
    createTipoDocumento,
    updateTipoDocumento,
    deleteTipoDocumento,
  };
}

export function useControlPagosSchema() {
  const { isAuthenticated } = useSharePointAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [missing, setMissing] = useState<Array<{ list: string; columns: string[] }>>([]);
  const [error, setError] = useState<Error | null>(null);

  const checkSchema = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const status = await controlPagosSchemaService.getSchemaStatus();
      setIsReady(status.isReady);
      setMissing(status.missing);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al verificar esquema"));
      setIsReady(false);
    } finally {
      setLoading(false);
    }
  };

  const initializeSchema = async () => {
    if (!isAuthenticated) return;

    setInitializing(true);
    setError(null);
    try {
      await controlPagosSchemaService.ensureControlPagosSchema();
      await checkSchema();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al inicializar esquema"));
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkSchema();
    }
  }, [isAuthenticated]);

  return {
    isReady,
    missing,
    loading,
    initializing,
    error,
    checkSchema,
    initializeSchema,
  };
}

export function useTiposDocumentoProyecto() {
  const { isAuthenticated } = useSharePointAuth();
  const [tiposDocumentoProyecto, setTiposDocumentoProyecto] = useState<TipoDocumentoProyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTiposDocumentoProyecto = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const data = await tiposDocumentoProyectoService.getAll();
      setTiposDocumentoProyecto(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al cargar tipos de documento de proyecto"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createTipoDocumentoProyecto = async (payload: Omit<TipoDocumentoProyecto, "id">) => {
    const created = await tiposDocumentoProyectoService.create(payload);
    setTiposDocumentoProyecto((prev) => [...prev, created]);
    return created;
  };

  const updateTipoDocumentoProyecto = async (id: string, payload: Partial<TipoDocumentoProyecto>) => {
    await tiposDocumentoProyectoService.update(id, payload);
    setTiposDocumentoProyecto((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
  };

  const deleteTipoDocumentoProyecto = async (id: string) => {
    await tiposDocumentoProyectoService.delete(id);
    setTiposDocumentoProyecto((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTiposDocumentoProyecto();
    }
  }, [isAuthenticated]);

  return {
    tiposDocumentoProyecto,
    loading,
    error,
    loadTiposDocumentoProyecto,
    createTipoDocumentoProyecto,
    updateTipoDocumentoProyecto,
    deleteTipoDocumentoProyecto,
  };
}

export function useDocumentosProyecto() {
  const { isAuthenticated } = useSharePointAuth();
  const [documentosProyecto, setDocumentosProyecto] = useState<DocumentoProyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDocumentosProyecto = async (filters?: {
    proyectoId?: string;
    codigoProyecto?: string;
    tipoDocumentoProyectoId?: string;
  }) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const data = await documentosProyectoService.getAll(filters);
      setDocumentosProyecto(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al cargar documentos de proyecto"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createDocumentoProyecto = async (payload: Parameters<typeof documentosProyectoService.create>[0]) => {
    const created = await documentosProyectoService.create(payload);
    setDocumentosProyecto((prev) => [...prev, created]);
    return created;
  };

  const updateDocumentoProyecto = async (id: string, payload: Partial<DocumentoProyecto>) => {
    await documentosProyectoService.update(id, payload);
    setDocumentosProyecto((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
  };

  const deleteDocumentoProyecto = async (id: string) => {
    await documentosProyectoService.delete(id);
    setDocumentosProyecto((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDocumentosProyecto();
    }
  }, [isAuthenticated]);

  return {
    documentosProyecto,
    loading,
    error,
    loadDocumentosProyecto,
    createDocumentoProyecto,
    updateDocumentoProyecto,
    deleteDocumentoProyecto,
  };
}

export function useHitosPagoProyecto() {
  const { isAuthenticated } = useSharePointAuth();
  const [hitosPagoProyecto, setHitosPagoProyecto] = useState<HitoPagoProyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadHitosPagoProyecto = async (filters?: {
    proyectoId?: string;
    codigoProyecto?: string;
  }) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const data = await hitosPagoProyectoService.getAll(filters);
      setHitosPagoProyecto(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error al cargar hitos de pago"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createHitoPagoProyecto = async (payload: HitoPagoProyectoCreateInput) => {
    const created = await hitosPagoProyectoService.create(payload);
    setHitosPagoProyecto((prev) => [...prev, created].sort((a, b) => a.nroHito - b.nroHito));
    return created;
  };

  const updateHitoPagoProyecto = async (id: string, payload: Partial<HitoPagoProyecto>) => {
    await hitosPagoProyectoService.update(id, payload);
    setHitosPagoProyecto((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, ...payload } : item))
        .sort((a, b) => a.nroHito - b.nroHito)
    );
  };

  const deleteHitoPagoProyecto = async (id: string) => {
    await hitosPagoProyectoService.delete(id);
    setHitosPagoProyecto((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadHitosPagoProyecto();
    }
  }, [isAuthenticated]);

  return {
    hitosPagoProyecto,
    loading,
    error,
    loadHitosPagoProyecto,
    createHitoPagoProyecto,
    updateHitoPagoProyecto,
    deleteHitoPagoProyecto,
  };
}
