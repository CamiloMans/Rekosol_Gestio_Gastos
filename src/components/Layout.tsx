import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Receipt, Settings, BarChart3, Plus, DollarSign, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  onNewGasto?: () => void;
}

const navItems = [
  { path: '/', label: 'Reportes', icon: BarChart3 },
  { path: '/gastos', label: 'Gastos', icon: Receipt },
  { path: '/empresas', label: 'Configuración', icon: Settings },
];

export function Layout({ children, onNewGasto }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const SWIPE_THRESHOLD = 50; // Distancia mínima para considerar un swipe
  const EDGE_THRESHOLD = 30; // Distancia desde el borde izquierdo para activar
  const SWIPE_TIME_THRESHOLD = 300; // Tiempo máximo en ms para considerar un swipe

  // Detectar swipe desde el borde izquierdo
  useEffect(() => {
    const isMobile = () => window.innerWidth < 1024;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Solo en móvil y cuando el sidebar está cerrado
      if (!isMobile() || mobileMenuOpen) {
        touchStartRef.current = null;
        return;
      }
      
      const touch = e.touches[0];
      // Verificar si el touch comenzó cerca del borde izquierdo
      if (touch.clientX <= EDGE_THRESHOLD) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        };
      } else {
        touchStartRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || !isMobile() || mobileMenuOpen) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // Si se mueve hacia la derecha y no mucho verticalmente, prevenir el back gesture
      if (deltaX > 10 && deltaY < 50 && touchStartRef.current.x <= EDGE_THRESHOLD) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !isMobile() || mobileMenuOpen) {
        touchStartRef.current = null;
        return;
      }
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      // Verificar si es un swipe válido: hacia la derecha, no muy vertical, y rápido
      if (
        deltaX >= SWIPE_THRESHOLD &&
        deltaY < 100 &&
        deltaTime < SWIPE_TIME_THRESHOLD &&
        touchStartRef.current.x <= EDGE_THRESHOLD
      ) {
        setMobileMenuOpen(true);
      }
      
      touchStartRef.current = null;
    };

    // Agregar listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Icono hamburguesa - solo visible en móvil cuando el sidebar está oculto */}
      {!mobileMenuOpen && (
        <button
          className="fixed left-4 top-4 z-50 lg:hidden p-2 bg-card/40 backdrop-blur-sm rounded-lg shadow-md hover:bg-card/60 transition-colors"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={24} className="text-foreground/70" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:transform-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6">
          {/* Logo en sidebar */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-transparent">
              {!logoError ? (
                <img 
                  src="/logo-rekosol.png" 
                  alt="RekoSol Logo" 
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-accent flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">RekoSol</h1>
              <p className="text-sm text-muted-foreground">Gestión de Gastos</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Floating action button for new expense */}
      {onNewGasto && (
        <Button
          onClick={onNewGasto}
          className="fixed bottom-6 right-6 lg:hidden h-14 w-14 rounded-full shadow-lg"
        >
          <Plus size={24} />
        </Button>
      )}
    </div>
  );
}
