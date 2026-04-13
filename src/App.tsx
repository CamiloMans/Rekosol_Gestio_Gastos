import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Gastos from "./pages/Gastos";
import Empresas from "./pages/Empresas";
import Reportes from "./pages/Reportes";
import NotFound from "./pages/NotFound";
import CheckFields from "./pages/CheckFields";
import ControlPagosProyectos from "./pages/control-pagos/ControlPagosProyectos";
import ControlPagosDocumentosPg from "./pages/control-pagos/ControlPagosDocumentosPg";
import ControlPagosHitos from "./pages/control-pagos/ControlPagosHitos";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Reportes />} />
      <Route path="/gastos" element={<Gastos />} />
      <Route path="/empresas" element={<Empresas />} />
      <Route path="/check-fields" element={<CheckFields />} />
      <Route path="/control-pagos/proyectos" element={<ControlPagosProyectos />} />
      <Route path="/control-pagos/documentos" element={<ControlPagosDocumentosPg />} />
      <Route path="/control-pagos/hitos" element={<ControlPagosHitos />} />
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
