import type { Rol } from "../services/usuario.service";

export type EstadoInscripcion =
  | "EN_ESPERA"
  | "PENDIENTE"
  | "ACEPTADA"
  | "CONFIRMADA"
  | "RECHAZADA"
  | "CANCELADA"
  | "LIBERADA";

export const ROLES_GESTION_ACTIVIDADES: Rol[] = ["ADMINISTRADOR", "ENCARGADO_ORGANISMO"];

export const ETIQUETAS_INSCRIPCION: Record<EstadoInscripcion, string> = {
  EN_ESPERA: "En lista de espera",
  PENDIENTE: "Pendiente de aprobación",
  ACEPTADA: "Aceptada, falta confirmar",
  CONFIRMADA: "Asistencia confirmada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  LIBERADA: "Cupo liberado",
};

export const CLASE_INSCRIPCION: Record<EstadoInscripcion, string> = {
  EN_ESPERA: "estado-cancelada",
  PENDIENTE: "estado-pendiente",
  ACEPTADA: "estado-observada",
  CONFIRMADA: "estado-aprobada",
  RECHAZADA: "estado-rechazada",
  CANCELADA: "estado-cancelada",
  LIBERADA: "estado-rechazada",
};

export const ESTADOS_INSCRIPCION_VIGENTE: EstadoInscripcion[] = ["EN_ESPERA", "PENDIENTE", "ACEPTADA", "CONFIRMADA"];
export const ESTADOS_REINSCRIBIBLES: EstadoInscripcion[] = ["CANCELADA", "LIBERADA"];
export const MAX_CUPOS_ACTIVIDAD = 500;
export const HORAS_MINIMAS_ANTICIPACION = 24;
export const HORAS_APERTURA_CONFIRMACION = 48;
export const HORAS_CIERRE_CONFIRMACION = 24;
