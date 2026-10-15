import { useCallback, useEffect, useState } from "react";

export function useCarga<T>(cargar: () => Promise<T>, valorInicial: T, mensajeError: string) {
  const [datos, setDatos] = useState<T>(valorInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setDatos(await cargar());
    } catch (err) {
      setError(err instanceof Error ? err.message : mensajeError);
    } finally {
      setCargando(false);
    }
  }, [cargar, mensajeError]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { datos, cargando, error, recargar };
}
