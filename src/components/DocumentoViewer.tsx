import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, File, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSharePointRestToken, getSharePointSiteUrl } from '@/lib/sharepointClient';

interface DocumentoViewerProps {
  open: boolean;
  onClose: () => void;
  archivo?: { nombre: string; url: string; tipo: string };
}

export function DocumentoViewer({ open, onClose, archivo }: DocumentoViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && archivo) {
      loadFileWithAuth();
    } else if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, archivo?.url]);

  if (!archivo) return null;

  const esImagen = archivo.tipo.startsWith('image/');
  const esPDF = archivo.tipo === 'application/pdf';

  const resolveFallbackDownloadUrl = (rawUrl: string): string | null => {
    try {
      if (rawUrl.includes('/_api/web/GetFileByServerRelativeUrl(')) return null;

      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.pathname.includes('/_api/')) return null;

      const siteUrl = getSharePointSiteUrl();
      const decodedPath = decodeURIComponent(parsed.pathname);
      const escapedPath = decodedPath.replace(/'/g, "''");
      return `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${escapedPath}')/$value`;
    } catch (fallbackError) {
      console.warn('No se pudo construir URL fallback para el archivo:', fallbackError);
      return null;
    }
  };

  const downloadBlobWithAuth = async (): Promise<Blob> => {
    const token = await getSharePointRestToken();
    const urls: string[] = [archivo.url];
    const fallbackUrl = resolveFallbackDownloadUrl(archivo.url);

    if (fallbackUrl && fallbackUrl !== archivo.url) {
      urls.push(fallbackUrl);
    }

    let lastError: Error | null = null;

    for (const candidateUrl of urls) {
      try {
        const response = await fetch(candidateUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: '*/*',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`Error al cargar el archivo: ${response.status} ${response.statusText} ${errorText}`);
          continue;
        }

        return await response.blob();
      } catch (downloadError: any) {
        lastError = downloadError instanceof Error ? downloadError : new Error(String(downloadError));
      }
    }

    throw lastError || new Error('No se pudo cargar el archivo');
  };

  const normalizeBlobMimeType = (blob: Blob): Blob => {
    if (blob.type && blob.type !== 'application/octet-stream') {
      return blob;
    }

    const extension = archivo.nombre.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    if (extension && mimeTypes[extension]) {
      return new Blob([blob], { type: mimeTypes[extension] });
    }

    return blob;
  };

  const loadFileWithAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const blob = await downloadBlobWithAuth();
      const finalBlob = normalizeBlobMimeType(blob);
      const url = URL.createObjectURL(finalBlob);
      setBlobUrl(url);
    } catch (loadError: any) {
      console.error('Error al cargar archivo:', loadError);
      setError(loadError?.message || 'No se pudo cargar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = archivo.nombre;
      link.click();
      return;
    }

    try {
      const blob = await downloadBlobWithAuth();
      const finalBlob = normalizeBlobMimeType(blob);
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = archivo.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadError: any) {
      console.error('Error al descargar archivo:', downloadError);
      alert('No se pudo descargar el archivo. Por favor, intenta nuevamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-card" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold truncate flex-1 mr-4">{archivo.nombre}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleDownload} title="Descargar">
                <Download size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={onClose}>
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
            <img src={blobUrl} alt={archivo.nombre} className="max-w-full max-h-full object-contain" />
          ) : blobUrl && esPDF ? (
            <iframe src={blobUrl} className="w-full h-[70vh] border-0" title={archivo.nombre} />
          ) : blobUrl ? (
            <iframe src={blobUrl} className="w-full h-[70vh] border-0" title={archivo.nombre} />
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
