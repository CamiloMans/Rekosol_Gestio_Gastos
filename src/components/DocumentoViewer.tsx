import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, File } from 'lucide-react';

interface DocumentoViewerProps {
  open: boolean;
  onClose: () => void;
  archivo?: { nombre: string; url: string; tipo: string };
}

export function DocumentoViewer({ open, onClose, archivo }: DocumentoViewerProps) {
  if (!archivo) return null;

  const esImagen = archivo.tipo.startsWith('image/');
  const esPDF = archivo.tipo === 'application/pdf';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = archivo.url;
    link.download = archivo.nombre;
    link.click();
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
          {esImagen ? (
            <img
              src={archivo.url}
              alt={archivo.nombre}
              className="max-w-full max-h-full object-contain"
            />
          ) : esPDF ? (
            <iframe
              src={archivo.url}
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

