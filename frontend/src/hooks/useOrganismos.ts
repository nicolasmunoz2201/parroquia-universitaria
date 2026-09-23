import { useCallback, useEffect, useState } from "react";
import { listarOrganismos } from "../services/organismo.service";
import type { Organismo } from "../services/organismo.service";

export function useOrganismos(opciones: { soloActivos?: boolean } = {}) {
  const { soloActivos } = opciones;
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setOrganismos(await listarOrganismos({ soloActivos }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los organismos");
    } finally {
      setCargando(false);
    }
  }, [soloActivos]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { organismos, cargando, error, recargar };
}
