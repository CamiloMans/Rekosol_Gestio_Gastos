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
  type Categoria,
  type TipoDocumento,
} from "@/services/sharepointService";

export function useSharePointAuth() {
  const { instance, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [accounts, instance]);

  const login = async () => {
    try {
      console.log("Intentando iniciar sesión...");
      console.log("Client ID:", import.meta.env.VITE_AZURE_CLIENT_ID ? "Configurado" : "FALTANTE");
      console.log("Tenant ID:", import.meta.env.VITE_AZURE_TENANT_ID ? "Configurado" : "FALTANTE");
      console.log("Redirect URI:", window.location.origin);
      
      // Intentar primero con popup, si falla usar redirect
      try {
        const response = await instance.loginPopup({
          ...loginRequest,
          redirectUri: window.location.origin,
        });
        console.log("Login exitoso (popup):", response);
        setIsAuthenticated(true);
      } catch (popupError: any) {
        console.warn("Popup falló, intentando con redirect:", popupError);
        // Si el popup falla, usar redirect
        await instance.loginRedirect({
          ...loginRequest,
          redirectUri: window.location.origin,
        });
        // Con redirect, la página se recargará, así que no necesitamos actualizar el estado aquí
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      
      // Manejar errores específicos
      if (error.errorCode === "user_cancelled") {
        throw new Error("Inicio de sesión cancelado por el usuario");
      } else if (error.errorCode === "popup_window_error" || error.message?.includes("popup")) {
        throw new Error("El popup fue bloqueado. Se intentará usar redirect en su lugar.");
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

// Hook para gestionar gastos desde SharePoint
export function useGastos() {
  const { isAuthenticated } = useSharePointAuth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadGastos = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await gastosService.getAll();
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
  }, [isAuthenticated]);

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
export function useEmpresas() {
  const { isAuthenticated } = useSharePointAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadEmpresas = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await empresasService.getAll();
      setEmpresas(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      console.error("Error al cargar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  const createEmpresa = async (empresa: Omit<Empresa, "id" | "createdAt">) => {
    try {
      const nuevaEmpresa = await empresasService.create(empresa);
      setEmpresas([...empresas, nuevaEmpresa]);
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
    deleteProyecto,
  };
}

// Hook para gestionar colaboradores desde SharePoint
export function useColaboradores() {
  const { isAuthenticated } = useSharePointAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadColaboradores = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await colaboradoresService.getAll();
      setColaboradores(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      console.error("Error al cargar colaboradores:", err);
    } finally {
      setLoading(false);
    }
  };

  const createColaborador = async (colaborador: Omit<Colaborador, "id" | "createdAt">) => {
    try {
      const nuevoColaborador = await colaboradoresService.create(colaborador);
      setColaboradores([...colaboradores, nuevoColaborador]);
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
export function useCategorias() {
  const { isAuthenticated } = useSharePointAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCategorias = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await categoriasService.getAll();
      setCategorias(data);
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
      setCategorias([...categorias, nuevaCategoria]);
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

