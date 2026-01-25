import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isSuccess = variant === "success";
        const isError = variant === "destructive";
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
