import { Request, Response } from "express";
import { EstadoInscripcion, Prisma } from "../generated/prisma/client";
import * as actividadService from "../services/actividad.service";
import { ActividadInvalidaError } from "../services/actividad.service";
import * as organismoService from "../services/organismo.service";
import { leerTexto } from "../utils/validaciones";
import { avisarInscripcion, avisarPromovidas } from "../utils/avisosInscripcion";
import { inscripcionesAbiertas } from "../utils/actividades";
import {
  LARGO_MAXIMO_DESCRIPCION_ACTIVIDAD,
  LARGO_MAXIMO_MOTIVO_RECHAZO,
  LARGO_MAXIMO_TITULO_ACTIVIDAD,
  MAX_CUPOS_ACTIVIDAD,
} from "../constants/actividades";

function puedeGestionarOrganismo(usuario: Request["usuario"], organismoId: string) {
  return usuario?.rol === "ADMINISTRADOR" || usuario?.organismoId === organismoId;
}

function responderError(error: unknown, res: Response) {
  if (error instanceof ActividadInvalidaError) {
    res.status(409).json({ message: error.message });
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    res.status(409).json({ message: "Otra persona está modificando esta actividad, intenta de nuevo" });
    return true;
  }
  return false;
}

function leerDatosActividad(body: Request["body"], exigirFutura: boolean) {
  const titulo = leerTexto(body?.titulo);
  const descripcion = leerTexto(body?.descripcion);
  const lugar = leerTexto(body?.lugar) || null;
  const inicio = typeof body?.inicio === "string" ? new Date(body.inicio) : null;
  const cupos = typeof body?.cupos === "string" ? Number(body.cupos) : body?.cupos;

  if (!titulo) return { error: "Escribe el título de la actividad" };
  if (titulo.length > LARGO_MAXIMO_TITULO_ACTIVIDAD) return { error: "El título es demasiado largo" };
  if (!descripcion) return { error: "Escribe una descripción de la actividad" };
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION_ACTIVIDAD) return { error: "La descripción es demasiado larga" };
  if (lugar && lugar.length > LARGO_MAXIMO_TITULO_ACTIVIDAD) return { error: "El lugar es demasiado largo" };
  if (!inicio || Number.isNaN(inicio.getTime())) return { error: "Indica la fecha y hora de la actividad" };
  if (exigirFutura && !inscripcionesAbiertas(inicio)) {
    return { error: "La actividad debe ser al menos 24 horas después de ahora, para alcanzar a inscribirse" };
  }
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > MAX_CUPOS_ACTIVIDAD) {
    return { error: `Los cupos deben ser un número entero entre 1 y ${MAX_CUPOS_ACTIVIDAD}` };
  }
  return { datos: { titulo, descripcion, lugar, inicio, cupos: cupos as number } };
}

export async function listarPublicas(_req: Request, res: Response) {
  res.json(await actividadService.listarActividadesPublicas());
}

export async function listarGestion(req: Request, res: Response) {
  const usuario = req.usuario!;
  if (usuario.rol !== "ADMINISTRADOR" && !usuario.organismoId) {
    res.json([]);
    return;
  }
  res.json(await actividadService.listarActividadesGestion(usuario.rol === "ADMINISTRADOR" ? null : usuario.organismoId));
}

export async function crear(req: Request, res: Response) {
  const { datos, error } = leerDatosActividad(req.body, true);
  if (!datos) {
    res.status(400).json({ message: error });
    return;
  }
  const organismoId = String(req.body?.organismoId ?? "");
  if (!puedeGestionarOrganismo(req.usuario, organismoId)) {
    res.status(403).json({ message: "Solo puedes publicar actividades de tu organismo" });
    return;
  }
  const organismo = await organismoService.obtenerOrganismo(organismoId);
  if (!organismo || !organismo.activo) {
    res.status(400).json({ message: "Selecciona un organismo activo" });
    return;
  }
  res.status(201).json(await actividadService.crearActividad({ ...datos, organismoId, creadorId: req.usuario!.id }));
}

async function actividadGestionable(req: Request, res: Response) {
  const actividad = await actividadService.obtenerActividad(req.params.id as string);
  if (!actividad || !puedeGestionarOrganismo(req.usuario, actividad.organismoId)) {
    res.status(404).json({ message: "Actividad no encontrada" });
    return null;
  }
  return actividad;
}

export async function actualizar(req: Request, res: Response) {
  const actividad = await actividadGestionable(req, res);
  if (!actividad) return;
  if (actividad.cancelada) {
    res.status(409).json({ message: "La actividad está cancelada" });
    return;
  }
  if (actividad.inicio <= new Date()) {
    res.status(409).json({ message: "No se puede editar una actividad que ya comenzó" });
    return;
  }
  const cambiaFecha = typeof req.body?.inicio === "string" && new Date(req.body.inicio).getTime() !== actividad.inicio.getTime();
  const { datos, error } = leerDatosActividad(req.body, cambiaFecha);
  if (!datos) {
    res.status(400).json({ message: error });
    return;
  }
  try {
    const { actividad: actualizada, promovidas, afectadas } = await actividadService.actualizarActividad(actividad.id, datos);
    for (const inscripcion of afectadas) {
      avisarInscripcion("ACTIVIDAD_MODIFICADA", inscripcion);
    }
    avisarPromovidas(promovidas);
    res.json(actualizada);
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}

export async function cancelar(req: Request, res: Response) {
  const actividad = await actividadGestionable(req, res);
  if (!actividad) return;
  if (actividad.cancelada) {
    res.status(409).json({ message: "La actividad ya estaba cancelada" });
    return;
  }
  if (actividad.inicio <= new Date()) {
    res.status(409).json({ message: "No se puede cancelar una actividad que ya comenzó" });
    return;
  }
  const afectadas = await actividadService.cancelarActividad(actividad.id);
  for (const inscripcion of afectadas) {
    avisarInscripcion("ACTIVIDAD_CANCELADA", inscripcion);
  }
  res.json({ avisados: afectadas.length });
}

export async function listarInscritos(req: Request, res: Response) {
  const actividad = await actividadGestionable(req, res);
  if (!actividad) return;
  res.json(await actividadService.listarInscritos(actividad.id));
}

export async function inscribirse(req: Request, res: Response) {
  try {
    const inscripcion = await actividadService.inscribirse(req.params.id as string, req.usuario!.id);
    avisarInscripcion(inscripcion.estado === EstadoInscripcion.EN_ESPERA ? "EN_ESPERA" : "RECIBIDA", inscripcion);
    res.status(201).json(inscripcion);
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}

export async function misInscripciones(req: Request, res: Response) {
  res.json(await actividadService.listarInscripcionesDe(req.usuario!.id));
}

async function inscripcionPropia(req: Request, res: Response) {
  const inscripcion = await actividadService.obtenerInscripcion(req.params.id as string);
  if (!inscripcion || inscripcion.usuarioId !== req.usuario!.id) {
    res.status(404).json({ message: "Inscripción no encontrada" });
    return null;
  }
  return inscripcion;
}

async function inscripcionGestionable(req: Request, res: Response) {
  const inscripcion = await actividadService.obtenerInscripcion(req.params.id as string);
  if (!inscripcion || !puedeGestionarOrganismo(req.usuario, inscripcion.actividad.organismoId)) {
    res.status(404).json({ message: "Inscripción no encontrada" });
    return null;
  }
  return inscripcion;
}

export async function confirmar(req: Request, res: Response) {
  const inscripcion = await inscripcionPropia(req, res);
  if (!inscripcion) return;
  try {
    res.json(await actividadService.confirmarAsistencia(inscripcion.id));
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}

export async function cancelarInscripcion(req: Request, res: Response) {
  const inscripcion = await inscripcionPropia(req, res);
  if (!inscripcion) return;
  try {
    const { inscripcion: cancelada, promovidas } = await actividadService.cancelarInscripcion(inscripcion.id);
    avisarPromovidas(promovidas);
    res.json(cancelada);
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}

export async function decidir(req: Request, res: Response) {
  const inscripcion = await inscripcionGestionable(req, res);
  if (!inscripcion) return;
  const aceptar = req.body?.aceptar;
  if (typeof aceptar !== "boolean") {
    res.status(400).json({ message: "Indica si aceptas o rechazas la inscripción" });
    return;
  }
  const motivo = leerTexto(req.body?.motivo) || null;
  if (!aceptar && !motivo) {
    res.status(400).json({ message: "Escribe el motivo del rechazo" });
    return;
  }
  if (motivo && motivo.length > LARGO_MAXIMO_MOTIVO_RECHAZO) {
    res.status(400).json({ message: "El motivo es demasiado largo" });
    return;
  }
  try {
    const { inscripcion: decidida, promovidas } = await actividadService.decidirInscripcion(inscripcion.id, aceptar, motivo);
    avisarInscripcion(aceptar ? "ACEPTADA" : "RECHAZADA", decidida);
    avisarPromovidas(promovidas);
    res.json(decidida);
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}

export async function asistencia(req: Request, res: Response) {
  const inscripcion = await inscripcionGestionable(req, res);
  if (!inscripcion) return;
  if (typeof req.body?.asistio !== "boolean") {
    res.status(400).json({ message: "Indica si la persona asistió o no" });
    return;
  }
  try {
    res.json(await actividadService.marcarAsistencia(inscripcion.id, req.body.asistio));
  } catch (err) {
    if (!responderError(err, res)) throw err;
  }
}
