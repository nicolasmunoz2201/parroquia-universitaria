import { peticion } from "./api";

export interface Organismo {
  id: string;
  nombre: string;
  activo?: boolean;
}

export function listarOrganismos(opciones: { soloActivos?: boolean } = {}): Promise<Organismo[]> {
  const query = opciones.soloActivos ? "?activo=true" : "";
  return peticion(`/api/organismos${query}`, "No se pudieron cargar los organismos");
}

export function crearOrganismo(datos: { nombre: string; descripcion?: string }): Promise<Organismo> {
  return peticion("/api/organismos", "No se pudo crear el organismo", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function desactivarOrganismo(id: string): Promise<Organismo> {
  return peticion(`/api/organismos/${id}/desactivar`, "No se pudo desactivar el organismo", {
    method: "PATCH",
    auth: true,
  });
}

export function activarOrganismo(id: string): Promise<Organismo> {
  return peticion(`/api/organismos/${id}/activar`, "No se pudo activar el organismo", {
    method: "PATCH",
    auth: true,
  });
}

export function eliminarOrganismo(id: string): Promise<void> {
  return peticion(`/api/organismos/${id}`, "No se pudo eliminar el organismo", {
    method: "DELETE",
    auth: true,
  });
}
