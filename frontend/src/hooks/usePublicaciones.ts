import { useCallback, useEffect, useState } from "react";
import { listarPublicaciones } from "../services/publicacion.service";
import type { Publicacion } from "../services/publicacion.service";

export function usePublicaciones(opciones: { soloOrganismosActivos?: boolean } = {}) {
  const { soloOrganismosActivos } = opciones;
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setPublicaciones(await listarPublicaciones({ soloOrganismosActivos }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las publicaciones");
    } finally {
      setCargando(false);
    }
  }, [soloOrganismosActivos]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { publicaciones, cargando, error, recargar };
}
