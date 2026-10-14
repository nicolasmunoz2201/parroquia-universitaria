import { Request, Response } from "express";
import { EstadoSolicitud, Prisma, TipoSacramento } from "../generated/prisma/client";
import * as sacramentoService from "../services/sacramento.service";
import { SolicitudInvalidaError } from "../services/sacramento.service";
import { correoConfigurado, enviarCorreoEstadoSolicitud } from "../utils/correo";
import { leerTexto } from "../utils/validaciones";
import {
  ESTADOS_CANCELABLES,
  ESTADOS_CON_OBSERVACION,
  LARGO_MAXIMO_TEXTO,
  MAX_CUPOS_POR_HORARIO,
  TRANSICIONES_ESTADO,
} from "../constants/sacramentos";

const TIPOS_SACRAMENTO = Object.values(TipoSacramento);
const ESTADOS_SOLICITUD = Object.values(EstadoSolicitud);

function esTipoSacramento(valor: unknown): valor is TipoSacramento {
  return TIPOS_SACRAMENTO.includes(valor as TipoSacramento);
}

function esEstadoSolicitud(valor: unknown): valor is EstadoSolicitud {
  return ESTADOS_SOLICITUD.includes(valor as EstadoSolicitud);
}

function leerTextoOpcional(valor: unknown) {
  const texto = leerTexto(valor);
  return texto ? texto : null;
}

function notificar(solicitud: Parameters<typeof enviarCorreoEstadoSolicitud>[0]) {
  if (!correoConfigurado()) return;
  enviarCorreoEstadoSolicitud(solicitud).catch((error) => console.error(error));
}

export async function horariosDisponibles(req: Request, res: Response) {
  const tipo = req.query.tipo;
  if (tipo !== undefined && !esTipoSacramento(tipo)) {
    res.status(400).json({ message: "El sacramento indicado no existe" });
    return;
  }
  res.json(await sacramentoService.listarHorariosDisponibles(tipo));
}

export async function listarHorarios(_req: Request, res: Response) {
  res.json(await sacramentoService.listarHorarios());
}

export async function crearHorario(req: Request, res: Response) {
  const { tipo, inicio, cupos } = req.body ?? {};
  const lugar = leerTextoOpcional(req.body?.lugar);
  const fecha = typeof inicio === "string" ? new Date(inicio) : null;

  if (!esTipoSacramento(tipo)) {
    res.status(400).json({ message: "Selecciona un sacramento valido" });
    return;
  }
  if (!fecha || Number.isNaN(fecha.getTime()) || fecha <= new Date()) {
    res.status(400).json({ message: "La fecha y hora deben ser futuras" });
    return;
  }
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > MAX_CUPOS_POR_HORARIO) {
    res.status(400).json({ message: `Los cupos deben ser entre 1 y ${MAX_CUPOS_POR_HORARIO}` });
    return;
  }
  if (lugar && lugar.length > LARGO_MAXIMO_TEXTO) {
    res.status(400).json({ message: "El lugar es demasiado largo" });
    return;
  }

  const horario = await sacramentoService.crearHorario({ tipo, inicio: fecha, cupos, lugar });
  res.status(201).json(horario);
}

async function cambiarEstadoHorario(req: Request, res: Response, activo: boolean) {
  const horario = await sacramentoService.obtenerHorario(req.params.id as string);
  if (!horario) {
    res.status(404).json({ message: "Horario no encontrado" });
    return;
  }
  res.json(await sacramentoService.cambiarEstadoHorario(horario.id, activo));
}

export function activarHorario(req: Request, res: Response) {
  return cambiarEstadoHorario(req, res, true);
}

export function desactivarHorario(req: Request, res: Response) {
  return cambiarEstadoHorario(req, res, false);
}

export async function eliminarHorario(req: Request, res: Response) {
  const horario = await sacramentoService.obtenerHorario(req.params.id as string);
  if (!horario) {
    res.status(404).json({ message: "Horario no encontrado" });
    return;
  }
  const eliminado = await sacramentoService.eliminarHorario(horario.id);
  if (!eliminado) {
    res.status(409).json({
      message: "No se puede eliminar: el horario tiene solicitudes. Desactivalo para que no se reserve mas.",
    });
    return;
  }
  res.status(204).send();
}

export async function crearSolicitud(req: Request, res: Response) {
  const horarioId = req.body?.horarioId;
  const nombreBeneficiario = leerTexto(req.body?.nombreBeneficiario);
  const comentario = leerTextoOpcional(req.body?.comentario);

  if (typeof horarioId !== "string" || !horarioId) {
    res.status(400).json({ message: "Selecciona un horario" });
    return;
  }
  if (!nombreBeneficiario) {
    res.status(400).json({ message: "Indica el nombre de quien recibira el sacramento" });
    return;
  }
  if (nombreBeneficiario.length > LARGO_MAXIMO_TEXTO || (comentario && comentario.length > LARGO_MAXIMO_TEXTO)) {
    res.status(400).json({ message: "El texto es demasiado largo" });
    return;
  }

  try {
    const solicitud = await sacramentoService.crearSolicitud({
      horarioId,
      solicitanteId: req.usuario!.id,
      nombreBeneficiario,
      comentario,
    });
    notificar(solicitud);
    res.status(201).json(solicitud);
  } catch (error) {
    if (error instanceof SolicitudInvalidaError) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      res.status(409).json({ message: "Otra persona esta reservando ese horario, intenta de nuevo" });
      return;
    }
    throw error;
  }
}

export async function misSolicitudes(req: Request, res: Response) {
  res.json(await sacramentoService.listarSolicitudesDe(req.usuario!.id));
}

export async function listarSolicitudes(req: Request, res: Response) {
  const estado = req.query.estado;
  if (estado !== undefined && !esEstadoSolicitud(estado)) {
    res.status(400).json({ message: "El estado indicado no existe" });
    return;
  }
  res.json(await sacramentoService.listarSolicitudes(estado));
}

export async function cambiarEstadoSolicitud(req: Request, res: Response) {
  const estado = req.body?.estado;
  const observacion = leerTextoOpcional(req.body?.observacion);

  if (!esEstadoSolicitud(estado)) {
    res.status(400).json({ message: "El estado indicado no existe" });
    return;
  }

  const solicitud = await sacramentoService.obtenerSolicitud(req.params.id as string);
  if (!solicitud) {
    res.status(404).json({ message: "Solicitud no encontrada" });
    return;
  }
  if (!TRANSICIONES_ESTADO[solicitud.estado].includes(estado)) {
    res.status(409).json({ message: "La solicitud no puede pasar a ese estado" });
    return;
  }
  if (ESTADOS_CON_OBSERVACION.includes(estado) && !observacion) {
    res.status(400).json({ message: "Escribe el motivo para el feligrés" });
    return;
  }
  if (observacion && observacion.length > LARGO_MAXIMO_TEXTO) {
    res.status(400).json({ message: "La observacion es demasiado larga" });
    return;
  }

  const actualizada = await sacramentoService.actualizarEstadoSolicitud(
    solicitud.id,
    estado,
    ESTADOS_CON_OBSERVACION.includes(estado) ? observacion : solicitud.observacion
  );
  notificar(actualizada);
  res.json(actualizada);
}

export async function cancelarSolicitud(req: Request, res: Response) {
  const solicitud = await sacramentoService.obtenerSolicitud(req.params.id as string);
  if (!solicitud || solicitud.solicitanteId !== req.usuario!.id) {
    res.status(404).json({ message: "Solicitud no encontrada" });
    return;
  }
  if (!ESTADOS_CANCELABLES.includes(solicitud.estado)) {
    res.status(409).json({ message: "Esta solicitud ya no se puede cancelar" });
    return;
  }

  const cancelada = await sacramentoService.actualizarEstadoSolicitud(
    solicitud.id,
    EstadoSolicitud.CANCELADA,
    solicitud.observacion
  );
  res.json(cancelada);
}
