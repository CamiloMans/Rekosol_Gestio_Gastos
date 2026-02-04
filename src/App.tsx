import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSharePointAuth } from "@/hooks/useSharePoint";
import Gastos from "./pages/Gastos";
import Empresas from "./pages/Empresas";
import Reportes from "./pages/Reportes";
import NotFound from "./pages/NotFound";
import CheckFields from "./pages/CheckFields";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const DEV_MODE_KEY = 'rekosol_dev_mode';

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useSharePointAuth();
  const [devMode, setDevMode] = useState(false);

  // Verificar modo desarrollador
  useEffect(() => {
    const devModeEnabled = localStorage.getItem(DEV_MODE_KEY) === 'true';
    setDevMode(devModeEnabled);
  }, []);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading && !devMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no está en modo desarrollador, mostrar solo la pantalla de login
  if (!isAuthenticated && !devMode) {
    return <Login />;
  }

  // Si está autenticado, mostrar las rutas de la aplicación
  return (
    <Routes>
      <Route path="/" element={<Reportes />} />
      <Route path="/gastos" element={<Gastos />} />
      <Route path="/empresas" element={<Empresas />} />
      <Route path="/check-fields" element={<CheckFields />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
