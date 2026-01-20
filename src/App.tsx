import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Gastos from "./pages/Gastos";
import Empresas from "./pages/Empresas";
import Reportes from "./pages/Reportes";
import NotFound from "./pages/NotFound";
import CheckFields from "./pages/CheckFields";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Reportes />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/check-fields" element={<CheckFields />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
