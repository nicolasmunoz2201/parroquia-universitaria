import { EstadoInscripcion } from "../generated/prisma/client";

export const ROLES_GESTION_ACTIVIDADES = ["ADMINISTRADOR", "ENCARGADO_ORGANISMO"];

export const ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD: EstadoInscripcion[] = [
  EstadoInscripcion.PENDIENTE,
  EstadoInscripcion.ACEPTADA,
  EstadoInscripcion.CONFIRMADA,
];

export const ESTADOS_INSCRIPCION_VIGENTE: EstadoInscripcion[] = [
  EstadoInscripcion.EN_ESPERA,
  ...ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD,
];

export const ESTADOS_REINSCRIBIBLES: EstadoInscripcion[] = [
  EstadoInscripcion.CANCELADA,
  EstadoInscripcion.LIBERADA,
];

export const HORAS_APERTURA_CONFIRMACION = 48;
export const HORAS_CIERRE_CONFIRMACION = 24;
export const MINUTOS_REVISION_PLAZOS = 15;
export const MAX_CUPOS_ACTIVIDAD = 500;
export const LARGO_MAXIMO_TITULO_ACTIVIDAD = 120;
export const LARGO_MAXIMO_DESCRIPCION_ACTIVIDAD = 2000;
export const LARGO_MAXIMO_MOTIVO_RECHAZO = 500;
