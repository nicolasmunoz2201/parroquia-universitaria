import { useCallback, useEffect, useState } from "react";
import { listarUsuarios } from "../services/usuario.service";
import type { UsuarioAdmin } from "../services/usuario.service";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los usuarios");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { usuarios, cargando, error, recargar };
}
