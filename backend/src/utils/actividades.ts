import { HORAS_APERTURA_CONFIRMACION, HORAS_CIERRE_CONFIRMACION } from "../constants/actividades";

const MS_POR_HORA = 60 * 60 * 1000;

export function aperturaConfirmacion(inicio: Date) {
  return new Date(inicio.getTime() - HORAS_APERTURA_CONFIRMACION * MS_POR_HORA);
}

export function cierreInscripciones(inicio: Date) {
  return new Date(inicio.getTime() - HORAS_CIERRE_CONFIRMACION * MS_POR_HORA);
}

export function inscripcionesAbiertas(inicio: Date, ahora = new Date()) {
  return ahora < cierreInscripciones(inicio);
}

export function puedeConfirmarAsistencia(inicio: Date, ahora = new Date()) {
  return ahora >= aperturaConfirmacion(inicio) && ahora < cierreInscripciones(inicio);
}

export function calcularCuposLibres(cupos: number, ocupados: number) {
  return Math.max(cupos - ocupados, 0);
}
