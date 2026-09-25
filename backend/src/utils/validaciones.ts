export const LARGO_MINIMO_PASSWORD = 6;

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function leerTexto(valor: unknown): string | undefined {
  return typeof valor === "string" ? valor.trim() : undefined;
}

export function leerEmail(valor: unknown): string | undefined {
  return leerTexto(valor)?.toLowerCase();
}

export function validarPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < LARGO_MINIMO_PASSWORD) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`;
  }
  return null;
}

export function validarDatosCuenta(nombre?: string, email?: string, password?: unknown): string | null {
  if (!nombre || !email || !password) {
    return "nombre, email y password son requeridos";
  }
  if (!EMAIL_VALIDO.test(email)) {
    return "El correo no tiene un formato valido";
  }
  return validarPassword(password);
}
