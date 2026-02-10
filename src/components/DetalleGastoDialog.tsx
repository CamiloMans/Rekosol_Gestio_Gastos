import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Gasto } from '@/data/mockData';

interface DetalleGastoDialogProps {
  open: boolean;
  onClose: () => void;
  gasto: Gasto | undefined;
}

export function DetalleGastoDialog({ open, onClose, gasto }: DetalleGastoDialogProps) {
  if (!gasto) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Detalle del Gasto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {gasto.detalle ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Detalle:</p>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm whitespace-pre-wrap">{gasto.detalle}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Este gasto no tiene detalles registrados.</p>
            </div>
          )}
          
          {gasto.comentarioTipoDocumento && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tipo de Documento:</p>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm">{gasto.comentarioTipoDocumento}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

