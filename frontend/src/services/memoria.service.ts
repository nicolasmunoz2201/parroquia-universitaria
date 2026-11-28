import { peticion } from "./api";

export interface Testimonio {
  id: string;
  autorNombre: string;
  contenido: string;
  createdAt: string;
}

export interface Hito {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fotos: { id: string; url: string }[];
  testimonios: Testimonio[];
}

const BASE = "/api/memoria";

export function listarHitos(): Promise<Hito[]> {
  return peticion(`${BASE}/hitos`, "No se pudo cargar la memoria histórica");
}

export function crearHito(datos: FormData): Promise<Hito> {
  return peticion(`${BASE}/hitos`, "No se pudo guardar el hito", { method: "POST", auth: true, formData: datos });
}

export function actualizarHito(id: string, datos: FormData): Promise<Hito> {
  return peticion(`${BASE}/hitos/${id}`, "No se pudo actualizar el hito", { method: "PUT", auth: true, formData: datos });
}

export function eliminarHito(id: string): Promise<void> {
  return peticion(`${BASE}/hitos/${id}`, "No se pudo eliminar el hito", { method: "DELETE", auth: true });
}

export function agregarTestimonio(hitoId: string, datos: { autorNombre: string; contenido: string }): Promise<Testimonio> {
  return peticion(`${BASE}/hitos/${hitoId}/testimonios`, "No se pudo guardar el testimonio", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function eliminarTestimonio(id: string): Promise<void> {
  return peticion(`${BASE}/testimonios/${id}`, "No se pudo eliminar el testimonio", { method: "DELETE", auth: true });
}
