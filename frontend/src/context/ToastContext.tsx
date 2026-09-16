import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type TipoToast = "exito" | "error";

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  mostrarToast: (mensaje: string, tipo?: TipoToast) => void;
}

const DURACION_MS = 3500;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const siguienteId = useRef(0);

  const mostrarToast = useCallback((mensaje: string, tipo: TipoToast = "exito") => {
    const id = siguienteId.current++;
    setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
    }, DURACION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="toast-contenedor">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tipo}`}>
            {toast.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
