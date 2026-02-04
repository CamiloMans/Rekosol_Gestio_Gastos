import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange: setDialogOpen,
  title,
  description,
  onConfirm,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
}: ConfirmDialogProps) {
  const [shouldExecuteConfirm, setShouldExecuteConfirm] = React.useState(false);
  
  // Resetear el estado cuando el diálogo se abre
  React.useEffect(() => {
    if (open) {
      setShouldExecuteConfirm(false);
    }
  }, [open]);

  const handleConfirm = (e: React.MouseEvent) => {
    console.log("✅ ConfirmDialog - Botón ELIMINAR clickeado");
    e.preventDefault();
    e.stopPropagation();
    // Marcar que se debe ejecutar la confirmación
    setShouldExecuteConfirm(true);
    // Ejecutar la acción de confirmación SOLO cuando se hace clic explícitamente aquí
    console.log("🔥 ConfirmDialog - Ejecutando onConfirm");
    onConfirm();
    // Cerrar el diálogo
    console.log("🚪 ConfirmDialog - Cerrando diálogo después de confirmar");
    setDialogOpen(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    console.log("❌ ConfirmDialog - Botón CANCELAR clickeado");
    e.preventDefault();
    e.stopPropagation();
    // Asegurar que NO se ejecute onConfirm
    setShouldExecuteConfirm(false);
    // NO ejecutar onConfirm, solo cerrar el diálogo
    console.log("🚪 ConfirmDialog - Cerrando diálogo SIN ejecutar onConfirm");
    setDialogOpen(false);
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    console.log("🔄 ConfirmDialog - handleDialogOpenChange llamado, newOpen:", newOpen, "shouldExecuteConfirm:", shouldExecuteConfirm);
    // Si se está cerrando el diálogo y NO se debe ejecutar la confirmación, solo cerrar
    if (!newOpen && !shouldExecuteConfirm) {
      console.log("🚫 ConfirmDialog - Cerrando sin ejecutar onConfirm");
      setDialogOpen(false);
      return;
    }
    // En cualquier otro caso, solo actualizar el estado
    setDialogOpen(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleDialogOpenChange} modal={true}>
      <AlertDialogContent 
        className="bg-card"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCancel(e as any);
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

