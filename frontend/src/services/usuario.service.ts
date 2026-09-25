import { peticion } from "./api";
import type { Organismo } from "./organismo.service";

export type Rol = "ADMINISTRADOR" | "ENCARGADO_ORGANISMO" | "ENCARGADO_COMEDOR" | "FELIGRES";

export const ETIQUETAS_ROL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  ENCARGADO_ORGANISMO: "Encargado de organismo",
  ENCARGADO_COMEDOR: "Encargado de comedor",
  FELIGRES: "Feligrés",
};

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  organismoId: string | null;
  organismo: Organismo | null;
  createdAt: string;
}

export function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return peticion("/api/usuarios", "No se pudieron cargar los usuarios", { auth: true });
}

export function crearUsuario(datos: {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  organismoId?: string;
}): Promise<UsuarioAdmin> {
  return peticion("/api/usuarios", "No se pudo crear el usuario", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function cambiarPasswordUsuario(id: string, password: string): Promise<void> {
  return peticion(`/api/usuarios/${id}/password`, "No se pudo cambiar la contraseña", {
    method: "PATCH",
    auth: true,
    json: { password },
  });
}

export function actualizarRolUsuario(
  id: string,
  datos: { rol: Rol; organismoId?: string }
): Promise<UsuarioAdmin> {
  return peticion(`/api/usuarios/${id}/rol`, "No se pudo actualizar el rol", {
    method: "PATCH",
    auth: true,
    json: datos,
  });
}
