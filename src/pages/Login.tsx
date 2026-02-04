import { useEffect, useState } from 'react';
import { useSharePointAuth } from '@/hooks/useSharePoint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Code } from 'lucide-react';

const DEV_PASSWORD = 'Calen123?';
const DEV_MODE_KEY = 'rekosol_dev_mode';

export default function Login() {
  const { isAuthenticated, isLoading, login } = useSharePointAuth();
  const [logoError, setLogoError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devPassword, setDevPassword] = useState('');
  const [showDevMode, setShowDevMode] = useState(false);

  useEffect(() => {
    // Verificar si ya está en modo desarrollador
    const devMode = localStorage.getItem(DEV_MODE_KEY);
    if (devMode === 'true') {
      // Si ya está en modo dev, no necesitamos hacer nada
      // El componente App se encargará de permitir el acceso
    }
  }, [isAuthenticated]);

  const handleDevLogin = () => {
    if (devPassword === DEV_PASSWORD) {
      localStorage.setItem(DEV_MODE_KEY, 'true');
      // Recargar la página para que App.tsx detecte el cambio
      window.location.reload();
    } else {
      setLoginError('Contraseña de desarrollador incorrecta');
      setDevPassword('');
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      console.log('Iniciando proceso de login...');
      // El login con redirect redirigirá la página, así que no esperamos la respuesta
      await login();
      // Si llegamos aquí, significa que el redirect no se ejecutó (no debería pasar)
      console.log('Login completado (esto no debería aparecer con redirect)');
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      const errorMessage = error?.message || 'Error desconocido al iniciar sesión';
      setLoginError(errorMessage);
      setIsLoggingIn(false);
    }
    // No ponemos setIsLoggingIn(false) en el finally porque con redirect la página se recargará
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center">
            {!logoError ? (
              <img
                src="/logo-rekosol.png"
                alt="RekoSol Logo"
                className="h-full w-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">RS</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RekoSol</h1>
            <p className="mt-2 text-muted-foreground">
              Gestión de Gastos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground text-center">
              Para acceder a la aplicación, necesitas iniciar sesión con tu cuenta de Microsoft.
            </p>
          </div>

          {loginError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive text-center">
                {loginError}
              </p>
            </div>
          )}

          <Button
            onClick={handleLogin}
            className="w-full h-12 text-base"
            size="lg"
            disabled={isLoggingIn || isLoading}
          >
            {isLoggingIn ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Iniciar sesión con Microsoft
              </>
            )}
          </Button>

          {/* Modo desarrollador */}
          <div className="pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowDevMode(!showDevMode)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDevMode ? 'Ocultar' : 'Mostrar'} modo desarrollador
            </button>
            
            {showDevMode && (
              <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-medium">Modo Desarrollador</Label>
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Contraseña de desarrollador"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDevLogin();
                      }
                    }}
                    className="h-9 text-sm"
                  />
                  <Button
                    onClick={handleDevLogin}
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs"
                  >
                    Acceder como desarrollador
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Al iniciar sesión, aceptas los términos de uso y políticas de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}

