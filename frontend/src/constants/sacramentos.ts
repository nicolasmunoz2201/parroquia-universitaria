import type { Rol } from "../services/usuario.service";

export type TipoSacramento =
  | "BAUTISMO"
  | "PRIMERA_COMUNION"
  | "CONFIRMACION"
  | "MATRIMONIO"
  | "UNCION_ENFERMOS";

export type EstadoSolicitud =
  | "PENDIENTE"
  | "OBSERVADA"
  | "APROBADA"
  | "RECHAZADA"
  | "CANCELADA"
  | "REALIZADA";

export const TIPOS_SACRAMENTO: TipoSacramento[] = [
  "BAUTISMO",
  "PRIMERA_COMUNION",
  "CONFIRMACION",
  "MATRIMONIO",
  "UNCION_ENFERMOS",
];

export const ETIQUETAS_SACRAMENTO: Record<TipoSacramento, string> = {
  BAUTISMO: "Bautismo",
  PRIMERA_COMUNION: "Primera Comunión",
  CONFIRMACION: "Confirmación",
  MATRIMONIO: "Matrimonio",
  UNCION_ENFERMOS: "Unción de los enfermos",
};

export const ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  "PENDIENTE",
  "OBSERVADA",
  "APROBADA",
  "REALIZADA",
  "RECHAZADA",
  "CANCELADA",
];

export const ETIQUETAS_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  OBSERVADA: "Con observaciones",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  REALIZADA: "Realizada",
};

export const TRANSICIONES_ESTADO: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  PENDIENTE: ["APROBADA", "OBSERVADA", "RECHAZADA"],
  OBSERVADA: ["APROBADA", "RECHAZADA"],
  APROBADA: ["REALIZADA", "RECHAZADA"],
  RECHAZADA: [],
  CANCELADA: [],
  REALIZADA: [],
};

export const ESTADOS_CON_OBSERVACION: EstadoSolicitud[] = ["OBSERVADA", "RECHAZADA"];
export const ESTADOS_CANCELABLES: EstadoSolicitud[] = ["PENDIENTE", "OBSERVADA", "APROBADA"];
export const ROLES_GESTION_SACRAMENTOS: Rol[] = ["ADMINISTRADOR", "SECRETARIA"];
export const MAX_CUPOS_POR_HORARIO = 50;
export const ZONA_HORARIA = "America/Santiago";
export const HORA_INICIO_AGENDA = 8;
export const HORA_FIN_AGENDA = 21;
export const MINUTOS_ENTRE_HORAS = 15;
export const OPCION_OTRA_HORA = "otra";
