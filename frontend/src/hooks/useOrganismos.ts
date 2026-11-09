import { useCallback } from "react";
import { listarOrganismos } from "../services/organismo.service";
import type { Organismo } from "../services/organismo.service";
import { useCarga } from "./useCarga";

const SIN_ORGANISMOS: Organismo[] = [];

export function useOrganismos(opciones: { soloActivos?: boolean } = {}) {
  const { soloActivos } = opciones;
  const cargar = useCallback(() => listarOrganismos({ soloActivos }), [soloActivos]);
  const { datos: organismos, cargando, error, recargar } = useCarga(
    cargar,
    SIN_ORGANISMOS,
    "Error al cargar los organismos"
  );
  return { organismos, cargando, error, recargar };
}
