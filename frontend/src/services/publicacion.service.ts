import { peticion } from "./api";
import type { Organismo } from "./organismo.service";

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  imagenes: string[];
  organismo: Organismo;
  autor: { id: string; nombre: string };
  createdAt: string;
}

export function listarPublicaciones(
  opciones: { soloOrganismosActivos?: boolean } = {}
): Promise<Publicacion[]> {
  const query = opciones.soloOrganismosActivos ? "?activos=true" : "";
  return peticion(`/api/publicaciones${query}`, "No se pudieron cargar las publicaciones");
}

export function crearPublicacion(datos: FormData): Promise<Publicacion> {
  return peticion("/api/publicaciones", "No se pudo crear la publicacion", {
    method: "POST",
    auth: true,
    formData: datos,
  });
}

export function actualizarPublicacion(id: string, datos: FormData): Promise<Publicacion> {
  return peticion(`/api/publicaciones/${id}`, "No se pudo actualizar la publicacion", {
    method: "PUT",
    auth: true,
    formData: datos,
  });
}

export function eliminarPublicacion(id: string): Promise<void> {
  return peticion(`/api/publicaciones/${id}`, "No se pudo eliminar la publicacion", {
    method: "DELETE",
    auth: true,
  });
}
