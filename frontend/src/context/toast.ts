import { createContext, useContext } from "react";

export type TipoToast = "exito" | "error";

export interface ToastContextValue {
  mostrarToast: (mensaje: string, tipo?: TipoToast) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
