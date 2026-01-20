import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSharePointAuth } from '@/hooks/useSharePoint';
import { getListFields } from '@/utils/checkSharePointFields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function CheckFields() {
  const { isAuthenticated, isLoading } = useSharePointAuth();
  const [loading, setLoading] = useState(false);
  const [listFields, setListFields] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Campos requeridos según nuestro modelo
  const requiredFields = [
    { name: 'Fecha', type: 'text/date' },
    { name: 'EmpresaId', type: 'text' },
    { name: 'Categoria', type: 'text' },
    { name: 'TipoDocumento', type: 'choice' },
    { name: 'NumeroDocumento', type: 'text' },
    { name: 'Monto', type: 'number' },
    { name: 'Detalle', type: 'multiline' },
    { name: 'ProyectoId', type: 'text' },
    { name: 'ColaboradorId', type: 'text' },
    { name: 'ComentarioTipoDocumento', type: 'text' },
    { name: 'ArchivosAdjuntos', type: 'multiline' },
  ];

  const checkFields = async () => {
    if (!isAuthenticated) {
      setError('Debes iniciar sesión primero');
      return;
    }

    setLoading(true);
    setError(null);
    setListFields(null);

    try {
      const fields = await getListFields('REGISTRO_GASTOS');
      setListFields(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener campos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMissingFields = () => {
    if (!listFields) return [];

    const existingFieldNames = listFields.columns.map((col: any) => col.name);
    const missing = requiredFields.filter(
      req => !existingFieldNames.includes(req.name)
    );

    return missing;
  };

  const getExtraFields = () => {
    if (!listFields) return [];

    const requiredFieldNames = requiredFields.map(f => f.name);
    const extra = listFields.columns.filter(
      (col: any) => !requiredFieldNames.includes(col.name) && col.name !== 'Title' && col.name !== 'Id' && col.name !== 'Created' && col.name !== 'Modified' && col.name !== 'CreatedBy' && col.name !== 'ModifiedBy'
    );

    return extra;
  };

  useEffect(() => {
    if (isAuthenticated && !loading && !listFields) {
      checkFields();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No autenticado</AlertTitle>
          <AlertDescription>
            Por favor, inicia sesión desde el menú lateral para verificar los campos.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Verificación de Campos SharePoint</h1>
            <p className="text-muted-foreground mt-2">
              Verifica los campos de la lista REGISTRO_GASTOS
            </p>
          </div>
          <Button onClick={checkFields} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Campos'
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {listFields && (
          <div className="grid gap-6">
            {/* Campos existentes */}
            <Card>
              <CardHeader>
                <CardTitle>Campos Existentes en la Lista</CardTitle>
                <CardDescription>
                  {listFields.columns.length} campos encontrados en "{listFields.listName}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {listFields.columns.map((col: any, index: number) => {
                    const isRequired = requiredFields.some(f => f.name === col.name);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {isRequired ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <div className="font-medium">{col.displayName || col.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Nombre interno: {col.name} | Tipo: {col.type} | 
                              {col.required ? ' Requerido' : ' Opcional'} | 
                              {col.readOnly ? ' Solo lectura' : ' Editable'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Campos faltantes */}
            {getMissingFields().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Campos Faltantes</CardTitle>
                  <CardDescription>
                    {getMissingFields().length} campos requeridos que no existen en la lista
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getMissingFields().map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border border-destructive rounded-lg bg-destructive/10"
                      >
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="font-medium">{field.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Tipo requerido: {field.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campos extra */}
            {getExtraFields().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">Campos Adicionales</CardTitle>
                  <CardDescription>
                    {getExtraFields().length} campos en SharePoint que no se usan en la aplicación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getExtraFields().map((col: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50"
                      >
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <div className="font-medium">{col.displayName || col.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Tipo: {col.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumen */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {listFields.columns.filter((col: any) =>
                        requiredFields.some(f => f.name === col.name)
                      ).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Campos Correctos</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-destructive">
                      {getMissingFields().length}
                    </div>
                    <div className="text-sm text-muted-foreground">Campos Faltantes</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {getExtraFields().length}
                    </div>
                    <div className="text-sm text-muted-foreground">Campos Extra</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

