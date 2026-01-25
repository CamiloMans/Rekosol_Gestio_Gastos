import { useEffect, useState } from 'react';
import { useSharePointAuth } from '@/hooks/useSharePoint';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { isAuthenticated, isLoading, login } = useSharePointAuth();
  const [logoError, setLogoError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Si ya está autenticado, no necesitamos hacer nada aquí
    // El componente App se encargará de redirigir
  }, [isAuthenticated]);

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

