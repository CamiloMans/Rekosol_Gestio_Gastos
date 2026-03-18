import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useControlPagosSchema } from "@/hooks/useSharePoint";
import { Loader2, Wrench } from "lucide-react";

export function SchemaInitializer() {
  const { isReady, missing, loading, initializing, error, initializeSchema } = useControlPagosSchema();

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando estructura de SharePoint para Control de Pagos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isReady) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-300">
      <CardHeader>
        <CardTitle>Estructura pendiente en SharePoint</CardTitle>
        <CardDescription>
          Falta crear o completar listas/columnas para operar el módulo Control de Pagos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
          </div>
        )}

        <div className="space-y-2 text-sm">
          {missing.map((item) => (
            <div key={item.list}>
              <span className="font-semibold">{item.list}</span>: {item.columns.join(", ")}
            </div>
          ))}
        </div>

        <Button onClick={initializeSchema} disabled={initializing} className="gap-2">
          {initializing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Inicializando...
            </>
          ) : (
            <>
              <Wrench className="h-4 w-4" />
              Inicializar módulo Control de Pagos
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
