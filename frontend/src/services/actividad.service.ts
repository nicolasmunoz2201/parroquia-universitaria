import { peticion } from "./api";
import type { EstadoInscripcion } from "../constants/actividades";

export interface Actividad {
  id: string;
  titulo: string;
  descripcion: string;
  inicio: string;
  lugar: string | null;
  cupos: number;
  cancelada: boolean;
  organismoId: string;
  organismo: { id: string; nombre: string };
  creador: { id: string; nombre: string };
  ocupados: number;
  enEspera: number;
  cuposDisponibles: number;
  cierreInscripciones: string;
  aperturaConfirmacion: string;
}

export interface DatosActividad {
  titulo: string;
  descripcion: string;
  inicio: string;
  lugar: string;
  cupos: number;
  organismoId: string;
}

export interface MiInscripcion {
  id: string;
  estado: EstadoInscripcion;
  motivoRechazo: string | null;
  asistio: boolean | null;
  fechaSolicitud: string;
  actividad: Omit<Actividad, "creador" | "ocupados" | "enEspera" | "cuposDisponibles" | "cierreInscripciones" | "aperturaConfirmacion">;
}

export interface Inscrito {
  id: string;
  estado: EstadoInscripcion;
  motivoRechazo: string | null;
  asistio: boolean | null;
  fechaSolicitud: string;
  usuario: { id: string; nombre: string; email: string };
}

const BASE = "/api/actividades";

export function listarActividades(): Promise<Actividad[]> {
  return peticion(BASE, "No se pudieron cargar las actividades");
}

export function listarActividadesGestion(): Promise<Actividad[]> {
  return peticion(`${BASE}/gestion`, "No se pudieron cargar las actividades", { auth: true });
}

export function crearActividad(datos: DatosActividad): Promise<Actividad> {
  return peticion(BASE, "No se pudo publicar la actividad", { method: "POST", auth: true, json: datos });
}

export function actualizarActividad(id: string, datos: DatosActividad): Promise<Actividad> {
  return peticion(`${BASE}/${id}`, "No se pudo actualizar la actividad", { method: "PUT", auth: true, json: datos });
}

export function cancelarActividad(id: string): Promise<{ avisados: number }> {
  return peticion(`${BASE}/${id}/cancelar`, "No se pudo cancelar la actividad", { method: "PATCH", auth: true });
}

export function listarInscritos(id: string): Promise<Inscrito[]> {
  return peticion(`${BASE}/${id}/inscritos`, "No se pudieron cargar los inscritos", { auth: true });
}

export function inscribirse(actividadId: string): Promise<MiInscripcion> {
  return peticion(`${BASE}/${actividadId}/inscripciones`, "No se pudo completar la inscripción", {
    method: "POST",
    auth: true,
  });
}

export function listarMisInscripciones(): Promise<MiInscripcion[]> {
  return peticion(`${BASE}/inscripciones/mias`, "No se pudieron cargar tus inscripciones", { auth: true });
}

export function confirmarAsistencia(id: string): Promise<MiInscripcion> {
  return peticion(`${BASE}/inscripciones/${id}/confirmar`, "No se pudo confirmar tu asistencia", {
    method: "PATCH",
    auth: true,
  });
}

export function cancelarInscripcion(id: string): Promise<MiInscripcion> {
  return peticion(`${BASE}/inscripciones/${id}/cancelar`, "No se pudo cancelar la inscripción", {
    method: "PATCH",
    auth: true,
  });
}

export function decidirInscripcion(id: string, aceptar: boolean, motivo?: string): Promise<Inscrito> {
  return peticion(`${BASE}/inscripciones/${id}/decision`, "No se pudo guardar la decisión", {
    method: "PATCH",
    auth: true,
    json: { aceptar, motivo },
  });
}

export function marcarAsistencia(id: string, asistio: boolean): Promise<Inscrito> {
  return peticion(`${BASE}/inscripciones/${id}/asistencia`, "No se pudo registrar la asistencia", {
    method: "PATCH",
    auth: true,
    json: { asistio },
  });
}
