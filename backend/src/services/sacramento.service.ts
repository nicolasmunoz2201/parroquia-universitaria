import prisma from "../config/prisma";
import { EstadoSolicitud, Prisma, TipoSacramento } from "../generated/prisma/client";
import {
  ESTADOS_QUE_OCUPAN_CUPO,
  MAX_SOLICITUDES_POR_PERSONA_POR_HORARIO,
} from "../constants/sacramentos";

export class SolicitudInvalidaError extends Error {}

const CONTAR_OCUPADOS = {
  _count: { select: { solicitudes: { where: { estado: { in: ESTADOS_QUE_OCUPAN_CUPO } } } } },
} as const;

const INCLUIR_SOLICITUD = {
  horario: true,
  solicitante: { select: { id: true, nombre: true, email: true } },
} as const;

type HorarioConConteo = Prisma.HorarioSacramentoGetPayload<{ include: typeof CONTAR_OCUPADOS }>;

function conCupos({ _count, ...horario }: HorarioConConteo) {
  return {
    ...horario,
    ocupados: _count.solicitudes,
    cuposDisponibles: Math.max(horario.cupos - _count.solicitudes, 0),
  };
}

export async function listarHorariosDisponibles(tipo?: TipoSacramento) {
  const horarios = await prisma.horarioSacramento.findMany({
    where: { activo: true, inicio: { gt: new Date() }, ...(tipo ? { tipo } : {}) },
    orderBy: { inicio: "asc" },
    include: CONTAR_OCUPADOS,
  });
  return horarios.map(conCupos).filter((horario) => horario.cuposDisponibles > 0);
}

export async function listarHorarios() {
  const horarios = await prisma.horarioSacramento.findMany({
    orderBy: { inicio: "desc" },
    include: CONTAR_OCUPADOS,
  });
  return horarios.map(conCupos);
}

export function obtenerHorario(id: string) {
  return prisma.horarioSacramento.findUnique({ where: { id } });
}

export function crearHorario(data: {
  tipo: TipoSacramento;
  inicio: Date;
  cupos: number;
  lugar: string | null;
}) {
  return prisma.horarioSacramento.create({ data });
}

export function cambiarEstadoHorario(id: string, activo: boolean) {
  return prisma.horarioSacramento.update({ where: { id }, data: { activo } });
}

export async function eliminarHorario(id: string) {
  const solicitudes = await prisma.solicitudSacramento.count({ where: { horarioId: id } });
  if (solicitudes > 0) {
    return false;
  }
  await prisma.horarioSacramento.delete({ where: { id } });
  return true;
}

export function crearSolicitud(data: {
  horarioId: string;
  solicitanteId: string;
  nombreBeneficiario: string;
  comentario: string | null;
}) {
  return prisma.$transaction(
    async (tx) => {
      const horario = await tx.horarioSacramento.findUnique({ where: { id: data.horarioId } });
      if (!horario || !horario.activo || horario.inicio <= new Date()) {
        throw new SolicitudInvalidaError("El horario seleccionado no esta disponible");
      }

      const ocupados = await tx.solicitudSacramento.count({
        where: { horarioId: horario.id, estado: { in: ESTADOS_QUE_OCUPAN_CUPO } },
      });
      if (ocupados >= horario.cupos) {
        throw new SolicitudInvalidaError("El horario ya no tiene cupos disponibles");
      }

      const propias = await tx.solicitudSacramento.count({
        where: {
          horarioId: horario.id,
          solicitanteId: data.solicitanteId,
          estado: { in: ESTADOS_QUE_OCUPAN_CUPO },
        },
      });
      if (propias >= MAX_SOLICITUDES_POR_PERSONA_POR_HORARIO) {
        throw new SolicitudInvalidaError("Ya tienes una solicitud en este horario");
      }

      return tx.solicitudSacramento.create({ data, include: INCLUIR_SOLICITUD });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export function listarSolicitudesDe(solicitanteId: string) {
  return prisma.solicitudSacramento.findMany({
    where: { solicitanteId },
    orderBy: { createdAt: "desc" },
    include: INCLUIR_SOLICITUD,
  });
}

export function listarSolicitudes(estado?: EstadoSolicitud) {
  return prisma.solicitudSacramento.findMany({
    where: estado ? { estado } : {},
    orderBy: { createdAt: "desc" },
    include: INCLUIR_SOLICITUD,
  });
}

export function obtenerSolicitud(id: string) {
  return prisma.solicitudSacramento.findUnique({ where: { id }, include: INCLUIR_SOLICITUD });
}

export function actualizarEstadoSolicitud(
  id: string,
  estado: EstadoSolicitud,
  observacion: string | null
) {
  return prisma.solicitudSacramento.update({
    where: { id },
    data: { estado, observacion },
    include: INCLUIR_SOLICITUD,
  });
}
