import { HORAS_APERTURA_CONFIRMACION, HORAS_CIERRE_CONFIRMACION } from "../constants/actividades";

const MS_POR_HORA = 60 * 60 * 1000;

export function aperturaConfirmacion(inicio: string) {
  return new Date(new Date(inicio).getTime() - HORAS_APERTURA_CONFIRMACION * MS_POR_HORA);
}

export function cierreConfirmacion(inicio: string) {
  return new Date(new Date(inicio).getTime() - HORAS_CIERRE_CONFIRMACION * MS_POR_HORA);
}

export function puedeConfirmarAhora(inicio: string, ahora = new Date()) {
  return ahora >= aperturaConfirmacion(inicio) && ahora < cierreConfirmacion(inicio);
}

export function inscripcionesAbiertas(inicio: string, ahora = new Date()) {
  return ahora < cierreConfirmacion(inicio);
}

export function textoCupos(disponibles: number) {
  if (disponibles === 0) return "Sin cupos: lista de espera";
  return disponibles === 1 ? "1 cupo disponible" : `${disponibles} cupos disponibles`;
}
