export const API_URL = import.meta.env.VITE_API_URL;

export function getToken(): string | null {
  return localStorage.getItem("token");
}

interface OpcionesPeticion {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  auth?: boolean;
  json?: unknown;
  formData?: FormData;
}

export async function peticion<T>(
  ruta: string,
  mensajeError: string,
  { method = "GET", auth = false, json, formData }: OpcionesPeticion = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(`${API_URL}${ruta}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? mensajeError);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
