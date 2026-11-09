import { useCallback } from "react";
import { listarPublicaciones } from "../services/publicacion.service";
import type { Publicacion } from "../services/publicacion.service";
import { useCarga } from "./useCarga";

const SIN_PUBLICACIONES: Publicacion[] = [];

export function usePublicaciones(opciones: { soloOrganismosActivos?: boolean } = {}) {
  const { soloOrganismosActivos } = opciones;
  const cargar = useCallback(() => listarPublicaciones({ soloOrganismosActivos }), [soloOrganismosActivos]);
  const { datos: publicaciones, cargando, error, recargar } = useCarga(
    cargar,
    SIN_PUBLICACIONES,
    "Error al cargar las publicaciones"
  );
  return { publicaciones, cargando, error, recargar };
}
