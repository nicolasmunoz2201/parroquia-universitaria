const API_URL = "http://localhost:3000";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export async function login(email: string, password: string): Promise<Usuario> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo iniciar sesion");
  }

  const data: LoginResponse = await res.json();
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

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function verificarToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
