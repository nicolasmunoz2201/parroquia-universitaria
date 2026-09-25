import { getToken, peticion } from "./api";
import type { Rol } from "./usuario.service";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  organismoId: string | null;
  organismo?: { id: string; nombre: string } | null;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

function guardarSesion(data: LoginResponse): Usuario {
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
  return data.usuario;
}

export async function login(email: string, password: string): Promise<Usuario> {
  const data = await peticion<LoginResponse>("/api/auth/login", "No se pudo iniciar sesion", {
    method: "POST",
    json: { email, password },
  });
  return guardarSesion(data);
}

export async function registrar(nombre: string, email: string, password: string): Promise<Usuario> {
  const data = await peticion<LoginResponse>("/api/auth/registro", "No se pudo crear la cuenta", {
    method: "POST",
    json: { nombre, email, password },
  });
  return guardarSesion(data);
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export async function obtenerSesion(): Promise<Usuario | null> {
  if (!getToken()) return null;

  try {
    const data = await peticion<{ usuario: Usuario | null }>("/api/auth/me", "Sesion invalida", {
      auth: true,
    });
    if (!data.usuario) return null;
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    return data.usuario;
  } catch {
    return null;
  }
}
