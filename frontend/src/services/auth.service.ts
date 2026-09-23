import { getToken, peticion } from "./api";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  organismoId: string | null;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export async function login(email: string, password: string): Promise<Usuario> {
  const data = await peticion<LoginResponse>("/api/auth/login", "No se pudo iniciar sesion", {
    method: "POST",
    json: { email, password },
  });

  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
  return data.usuario;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export function getUsuarioActual(): Usuario | null {
  const raw = localStorage.getItem("usuario");
  return raw ? JSON.parse(raw) : null;
}

export async function verificarToken(): Promise<boolean> {
  if (!getToken()) return false;

  try {
    await peticion("/api/auth/me", "Sesion invalida", { auth: true });
    return true;
  } catch {
    return false;
  }
}
