export const API_URL = "http://localhost:3000";

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

export interface Organismo {
  id: string;
  nombre: string;
  activo?: boolean;
}

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  imagenes: string[];
  organismo: Organismo;
  autor: { id: string; nombre: string };
  createdAt: string;
}

export async function listarOrganismos(
  opciones: { soloActivos?: boolean } = {}
): Promise<Organismo[]> {
  const query = opciones.soloActivos ? "?activo=true" : "";
  const res = await fetch(`${API_URL}/api/organismos${query}`);
  if (!res.ok) throw new Error("No se pudieron cargar los organismos");
  return res.json();
}

export async function crearOrganismo(datos: {
  nombre: string;
  descripcion?: string;
}): Promise<Organismo> {
  const res = await fetch(`${API_URL}/api/organismos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(datos),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo crear el organismo");
  }

  return res.json();
}

export async function desactivarOrganismo(id: string): Promise<Organismo> {
  const res = await fetch(`${API_URL}/api/organismos/${id}/desactivar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo desactivar el organismo");
  }

  return res.json();
}

export async function activarOrganismo(id: string): Promise<Organismo> {
  const res = await fetch(`${API_URL}/api/organismos/${id}/activar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo activar el organismo");
  }

  return res.json();
}

export async function eliminarOrganismo(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/organismos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo eliminar el organismo");
  }
}

export async function listarPublicaciones(
  opciones: { soloOrganismosActivos?: boolean } = {}
): Promise<Publicacion[]> {
  const query = opciones.soloOrganismosActivos ? "?activos=true" : "";
  const res = await fetch(`${API_URL}/api/publicaciones${query}`);
  if (!res.ok) throw new Error("No se pudieron cargar las publicaciones");
  return res.json();
}

export async function crearPublicacion(datos: FormData): Promise<Publicacion> {
  const res = await fetch(`${API_URL}/api/publicaciones`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: datos,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo crear la publicacion");
  }

  return res.json();
}

export async function actualizarPublicacion(id: string, datos: FormData): Promise<Publicacion> {
  const res = await fetch(`${API_URL}/api/publicaciones/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: datos,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo actualizar la publicacion");
  }

  return res.json();
}

export async function eliminarPublicacion(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/publicaciones/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "No se pudo eliminar la publicacion");
  }
}
