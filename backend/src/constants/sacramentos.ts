import { EstadoSolicitud, TipoSacramento } from "../generated/prisma/client";

export const ROLES_GESTION_SACRAMENTOS = ["ADMINISTRADOR", "SECRETARIA"];

export const DOCUMENTOS_REQUERIDOS: Record<TipoSacramento, string[]> = {
  BAUTISMO: ["Certificado de nacimiento", "Cédula de identidad de padrinos"],
  PRIMERA_COMUNION: ["Certificado de bautismo"],
  CONFIRMACION: ["Certificado de bautismo"],
  MATRIMONIO: ["Certificado de bautismo de ambos novios", "Certificado de confirmación de ambos novios"],
  UNCION_ENFERMOS: [],
};

export const ETIQUETAS_SACRAMENTO: Record<TipoSacramento, string> = {
  BAUTISMO: "Bautismo",
  PRIMERA_COMUNION: "Primera Comunión",
  CONFIRMACION: "Confirmación",
  MATRIMONIO: "Matrimonio",
  UNCION_ENFERMOS: "Unción de los enfermos",
};

export const ESTADOS_QUE_OCUPAN_CUPO: EstadoSolicitud[] = [
  EstadoSolicitud.PENDIENTE,
  EstadoSolicitud.OBSERVADA,
  EstadoSolicitud.APROBADA,
  EstadoSolicitud.REALIZADA,
];

export const ESTADOS_CANCELABLES: EstadoSolicitud[] = [
  EstadoSolicitud.PENDIENTE,
  EstadoSolicitud.OBSERVADA,
  EstadoSolicitud.APROBADA,
];

export const TRANSICIONES_ESTADO: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  PENDIENTE: [EstadoSolicitud.APROBADA, EstadoSolicitud.OBSERVADA, EstadoSolicitud.RECHAZADA],
  OBSERVADA: [EstadoSolicitud.APROBADA, EstadoSolicitud.RECHAZADA],
  APROBADA: [EstadoSolicitud.REALIZADA, EstadoSolicitud.RECHAZADA],
  RECHAZADA: [],
  CANCELADA: [],
  REALIZADA: [],
};

export const ESTADOS_CON_OBSERVACION: EstadoSolicitud[] = [
  EstadoSolicitud.OBSERVADA,
  EstadoSolicitud.RECHAZADA,
];

export const MAX_CUPOS_POR_HORARIO = 50;
export const MAX_SOLICITUDES_POR_PERSONA_POR_HORARIO = 1;
export const LARGO_MAXIMO_TEXTO = 500;
export const ZONA_HORARIA = "America/Santiago";
