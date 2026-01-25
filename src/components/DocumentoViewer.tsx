import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, File, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSharePointRestToken } from '@/lib/sharepointClient';

interface DocumentoViewerProps {
  open: boolean;
  onClose: () => void;
  archivo?: { nombre: string; url: string; tipo: string };
}

export function DocumentoViewer({ open, onClose, archivo }: DocumentoViewerProps) {
  // TODOS los hooks DEBEN llamarse siempre, antes de cualquier return condicional
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar el archivo con autenticación cuando se abre el viewer
  useEffect(() => {
    if (open && archivo) {
      loadFileWithAuth();
    } else {
      // Limpiar el blob URL cuando se cierra
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    }

    return () => {
      // Limpiar el blob URL al desmontar o cuando cambia el archivo
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, archivo?.url]);

  // Ahora podemos hacer el return condicional después de TODOS los hooks
  if (!archivo) return null;

  const esImagen = archivo.tipo.startsWith('image/');
  const esPDF = archivo.tipo === 'application/pdf';

  const loadFileWithAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📎 Iniciando carga de archivo:', {
        nombre: archivo.nombre,
        url: archivo.url,
        tipo: archivo.tipo,
      });

      // Obtener token de SharePoint REST API
      const token = await getSharePointRestToken();
      console.log('📎 Token obtenido exitosamente');

      // Descargar el archivo usando el endpoint REST API de SharePoint
      console.log('📎 Descargando archivo desde endpoint REST API:', archivo.url);
      const response = await fetch(archivo.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*', // Aceptar cualquier tipo de contenido para archivos binarios
        },
      });

      console.log('📎 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en la respuesta:', errorText);
        throw new Error(`Error al cargar el archivo: ${response.status} ${response.statusText}`);
      }

      // Convertir la respuesta a blob
      const blob = await response.blob();
      console.log('📎 Blob creado:', {
        size: blob.size,
        type: blob.type,
      });

      // Si el tipo del blob es genérico, intentar inferirlo del nombre del archivo
      let finalBlob = blob;
      if (blob.type === 'application/octet-stream' || !blob.type) {
        const extension = archivo.nombre.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        if (extension && mimeTypes[extension]) {
          finalBlob = new Blob([blob], { type: mimeTypes[extension] });
          console.log('📎 Tipo MIME inferido:', mimeTypes[extension]);
        }
      }

      // Crear una URL blob para mostrar el archivo
      const url = URL.createObjectURL(finalBlob);
      console.log('✅ Blob URL creado:', url);
      setBlobUrl(url);
    } catch (err: any) {
      console.error('❌ Error al cargar archivo:', err);
      setError(err.message || 'No se pudo cargar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (blobUrl) {
      // Si ya tenemos el blob URL, usarlo directamente
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = archivo.nombre;
      link.click();
    } else {
      // Si no, intentar descargar con autenticación
      try {
        const token = await getSharePointRestToken();
        const response = await fetch(archivo.url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': '*/*', // Aceptar cualquier tipo de contenido para archivos binarios
          },
        });

        if (!response.ok) {
          throw new Error(`Error al descargar el archivo: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        console.error('Error al descargar archivo:', err);
        alert('No se pudo descargar el archivo. Por favor, intenta nuevamente.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold truncate flex-1 mr-4">
              {archivo.nombre}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                title="Descargar"
              >
                <Download size={18} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
              >
                <X size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4 max-h-[calc(90vh-120px)] overflow-auto flex items-center justify-center bg-muted/30 rounded-lg p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Loader2 size={48} className="text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Cargando archivo...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <File size={64} className="text-muted-foreground" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={handleDownload} variant="outline">
                <Download size={18} className="mr-2" />
                Intentar descargar
              </Button>
            </div>
          ) : blobUrl && esImagen ? (
            <img
              src={blobUrl}
              alt={archivo.nombre}
              className="max-w-full max-h-full object-contain"
            />
          ) : blobUrl && esPDF ? (
            <iframe
              src={blobUrl}
              className="w-full h-[70vh] border-0"
              title={archivo.nombre}
            />
          ) : blobUrl ? (
            // Para otros tipos de archivo, intentar mostrar en iframe si es posible
            <iframe
              src={blobUrl}
              className="w-full h-[70vh] border-0"
              title={archivo.nombre}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <File size={64} className="text-muted-foreground" />
              <p className="text-muted-foreground">Vista previa no disponible</p>
              <Button onClick={handleDownload} variant="outline">
                <Download size={18} className="mr-2" />
                Descargar archivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

