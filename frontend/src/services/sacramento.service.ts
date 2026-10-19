import { peticion, peticionArchivo } from "./api";
import type { EstadoSolicitud, TipoSacramento } from "../constants/sacramentos";

export type DocumentosRequeridos = Partial<Record<TipoSacramento, string[]>>;

export interface DocumentoSolicitud {
  id: string;
  tipoDocumento: string;
  nombreOriginal: string;
  createdAt: string;
}

export interface DocumentoElegido {
  tipoDocumento: string;
  archivo: File;
}

export interface Horario {
  id: string;
  tipo: TipoSacramento;
  inicio: string;
  cupos: number;
  lugar: string | null;
  activo: boolean;
}

export interface HorarioConCupos extends Horario {
  ocupados: number;
  cuposDisponibles: number;
}

export interface SolicitudSacramento {
  id: string;
  estado: EstadoSolicitud;
  nombreBeneficiario: string;
  comentario: string | null;
  observacion: string | null;
  createdAt: string;
  horario: Horario;
  solicitante: { id: string; nombre: string; email: string };
  documentos: DocumentoSolicitud[];
}

function formularioConDocumentos(campos: Record<string, string>, documentos: DocumentoElegido[]) {
  const formData = new FormData();
  for (const [campo, valor] of Object.entries(campos)) {
    formData.append(campo, valor);
  }
  formData.append("tiposDocumento", JSON.stringify(documentos.map((documento) => documento.tipoDocumento)));
  for (const documento of documentos) {
    formData.append("documentos", documento.archivo);
  }
  return formData;
}

export function listarDocumentosRequeridos(): Promise<DocumentosRequeridos> {
  return peticion("/api/sacramentos/documentos-requeridos", "No se pudieron cargar los documentos requeridos", {
    auth: true,
  });
}

export function obtenerDocumento(id: string): Promise<Blob> {
  return peticionArchivo(`/api/sacramentos/documentos/${id}`, "No se pudo abrir el documento");
}

export function listarHorariosDisponibles(tipo: TipoSacramento): Promise<HorarioConCupos[]> {
  return peticion(`/api/sacramentos/horarios/disponibles?tipo=${tipo}`, "No se pudieron cargar los horarios", {
    auth: true,
  });
}

export function listarHorarios(): Promise<HorarioConCupos[]> {
  return peticion("/api/sacramentos/horarios", "No se pudieron cargar los horarios", { auth: true });
}

export function crearHorario(datos: {
  tipo: TipoSacramento;
  inicio: string;
  cupos: number;
  lugar: string;
}): Promise<Horario> {
  return peticion("/api/sacramentos/horarios", "No se pudo crear el horario", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function cambiarEstadoHorario(id: string, activo: boolean): Promise<Horario> {
  return peticion(
    `/api/sacramentos/horarios/${id}/${activo ? "activar" : "desactivar"}`,
    "No se pudo actualizar el horario",
    { method: "PATCH", auth: true }
  );
}

export function eliminarHorario(id: string): Promise<void> {
  return peticion(`/api/sacramentos/horarios/${id}`, "No se pudo eliminar el horario", {
    method: "DELETE",
    auth: true,
  });
}

export function crearSolicitud({
  documentos,
  ...campos
}: {
  horarioId: string;
  nombreBeneficiario: string;
  comentario: string;
  documentos: DocumentoElegido[];
}): Promise<SolicitudSacramento> {
  return peticion("/api/sacramentos/solicitudes", "No se pudo enviar la solicitud", {
    method: "POST",
    auth: true,
    formData: formularioConDocumentos(campos, documentos),
  });
}

export function corregirDocumentos(id: string, documentos: DocumentoElegido[]): Promise<SolicitudSacramento> {
  return peticion(`/api/sacramentos/solicitudes/${id}/documentos`, "No se pudieron enviar los documentos", {
    method: "PATCH",
    auth: true,
    formData: formularioConDocumentos({}, documentos),
  });
}

export function listarMisSolicitudes(): Promise<SolicitudSacramento[]> {
  return peticion("/api/sacramentos/solicitudes/mias", "No se pudieron cargar tus solicitudes", {
    auth: true,
  });
}

export function listarSolicitudes(estado?: EstadoSolicitud): Promise<SolicitudSacramento[]> {
  return peticion(
    `/api/sacramentos/solicitudes${estado ? `?estado=${estado}` : ""}`,
    "No se pudieron cargar las solicitudes",
    { auth: true }
  );
}

export function cambiarEstadoSolicitud(
  id: string,
  estado: EstadoSolicitud,
  observacion?: string
): Promise<SolicitudSacramento> {
  return peticion(`/api/sacramentos/solicitudes/${id}/estado`, "No se pudo cambiar el estado", {
    method: "PATCH",
    auth: true,
    json: { estado, observacion },
  });
}

export function cancelarSolicitud(id: string): Promise<SolicitudSacramento> {
  return peticion(`/api/sacramentos/solicitudes/${id}/cancelar`, "No se pudo cancelar la solicitud", {
    method: "PATCH",
    auth: true,
  });
}
