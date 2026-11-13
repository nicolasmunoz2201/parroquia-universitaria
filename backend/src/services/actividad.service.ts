import prisma from "../config/prisma";
import { EstadoInscripcion, Prisma } from "../generated/prisma/client";
import {
  ESTADOS_INSCRIPCION_VIGENTE,
  ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD,
  ESTADOS_REINSCRIBIBLES,
} from "../constants/actividades";
import {
  aperturaConfirmacion,
  calcularCuposLibres,
  cierreInscripciones,
  inscripcionesAbiertas,
  puedeConfirmarAsistencia,
} from "../utils/actividades";

export class ActividadInvalidaError extends Error {}

type Transaccion = Prisma.TransactionClient;

const SERIALIZABLE = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

const INCLUIR_ACTIVIDAD = {
  organismo: { select: { id: true, nombre: true } },
  creador: { select: { id: true, nombre: true } },
  inscripciones: { select: { estado: true } },
} as const;

export const INCLUIR_INSCRIPCION = {
  usuario: { select: { id: true, nombre: true, email: true } },
  actividad: { include: { organismo: { select: { id: true, nombre: true } } } },
} as const;

export type InscripcionCompleta = Prisma.InscripcionGetPayload<{ include: typeof INCLUIR_INSCRIPCION }>;
type ActividadConInscripciones = Prisma.ActividadGetPayload<{ include: typeof INCLUIR_ACTIVIDAD }>;

function conCupos({ inscripciones, ...actividad }: ActividadConInscripciones) {
  const ocupados = inscripciones.filter((i) => ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD.includes(i.estado)).length;
  const enEspera = inscripciones.filter((i) => i.estado === EstadoInscripcion.EN_ESPERA).length;
  return {
    ...actividad,
    ocupados,
    enEspera,
    cuposDisponibles: calcularCuposLibres(actividad.cupos, ocupados),
    cierreInscripciones: cierreInscripciones(actividad.inicio),
    aperturaConfirmacion: aperturaConfirmacion(actividad.inicio),
  };
}

export async function listarActividadesPublicas() {
  const actividades = await prisma.actividad.findMany({
    where: { inicio: { gt: new Date() }, cancelada: false, organismo: { activo: true } },
    include: INCLUIR_ACTIVIDAD,
    orderBy: { inicio: "asc" },
  });
  return actividades.map(conCupos);
}

export async function listarActividadesGestion(organismoId: string | null) {
  const actividades = await prisma.actividad.findMany({
    where: organismoId ? { organismoId } : {},
    include: INCLUIR_ACTIVIDAD,
    orderBy: { inicio: "desc" },
  });
  return actividades.map(conCupos);
}

export function obtenerActividad(id: string) {
  return prisma.actividad.findUnique({ where: { id } });
}

export async function crearActividad(data: {
  titulo: string;
  descripcion: string;
  inicio: Date;
  lugar: string | null;
  cupos: number;
  organismoId: string;
  creadorId: string;
}) {
  const actividad = await prisma.actividad.create({ data, include: INCLUIR_ACTIVIDAD });
  return conCupos(actividad);
}

async function contarOcupados(tx: Transaccion, actividadId: string) {
  return tx.inscripcion.count({
    where: { actividadId, estado: { in: ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD } },
  });
}

async function promoverListaEspera(tx: Transaccion, actividadId: string, ahora = new Date()) {
  const actividad = await tx.actividad.findUnique({ where: { id: actividadId } });
  if (!actividad || actividad.cancelada || !inscripcionesAbiertas(actividad.inicio, ahora)) {
    return [];
  }
  const libres = calcularCuposLibres(actividad.cupos, await contarOcupados(tx, actividadId));
  if (libres === 0) return [];

  const enEspera = await tx.inscripcion.findMany({
    where: { actividadId, estado: EstadoInscripcion.EN_ESPERA },
    orderBy: { fechaSolicitud: "asc" },
    take: libres,
  });
  const promovidas: InscripcionCompleta[] = [];
  for (const inscripcion of enEspera) {
    promovidas.push(
      await tx.inscripcion.update({
        where: { id: inscripcion.id },
        data: { estado: EstadoInscripcion.PENDIENTE },
        include: INCLUIR_INSCRIPCION,
      })
    );
  }
  return promovidas;
}

export function actualizarActividad(
  id: string,
  data: { titulo: string; descripcion: string; inicio: Date; lugar: string | null; cupos: number }
) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.actividad.findUniqueOrThrow({ where: { id } });
    const ocupados = await contarOcupados(tx, id);
    if (data.cupos < ocupados) {
      throw new ActividadInvalidaError(
        `No puedes dejar menos cupos que las ${ocupados} inscripciones que ya ocupan un lugar`
      );
    }
    await tx.actividad.update({ where: { id }, data });

    const cambiaFecha = anterior.inicio.getTime() !== data.inicio.getTime();
    if (cambiaFecha) {
      await tx.inscripcion.updateMany({
        where: { actividadId: id, estado: { in: [EstadoInscripcion.ACEPTADA, EstadoInscripcion.CONFIRMADA] } },
        data: { estado: EstadoInscripcion.ACEPTADA, recordatorioEnviado: false },
      });
    }
    const avisarCambio = cambiaFecha || anterior.lugar !== data.lugar;
    const afectadas = avisarCambio
      ? await tx.inscripcion.findMany({
          where: { actividadId: id, estado: { in: ESTADOS_INSCRIPCION_VIGENTE } },
          include: INCLUIR_INSCRIPCION,
        })
      : [];

    const promovidas = await promoverListaEspera(tx, id);
    const actividad = await tx.actividad.findUniqueOrThrow({ where: { id }, include: INCLUIR_ACTIVIDAD });
    return { actividad: conCupos(actividad), promovidas, afectadas };
  }, SERIALIZABLE);
}

export function cancelarActividad(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.actividad.update({ where: { id }, data: { cancelada: true } });
    return tx.inscripcion.findMany({
      where: { actividadId: id, estado: { in: ESTADOS_INSCRIPCION_VIGENTE } },
      include: INCLUIR_INSCRIPCION,
    });
  });
}

export function inscribirse(actividadId: string, usuarioId: string, ahora = new Date()) {
  return prisma.$transaction(async (tx) => {
    const actividad = await tx.actividad.findUnique({
      where: { id: actividadId },
      include: { organismo: { select: { activo: true } } },
    });
    if (!actividad || actividad.cancelada || !actividad.organismo.activo) {
      throw new ActividadInvalidaError("La actividad no está disponible");
    }
    if (!inscripcionesAbiertas(actividad.inicio, ahora)) {
      throw new ActividadInvalidaError("Las inscripciones cerraron 24 horas antes de la actividad");
    }

    const existente = await tx.inscripcion.findUnique({
      where: { actividadId_usuarioId: { actividadId, usuarioId } },
    });
    if (existente?.estado === EstadoInscripcion.RECHAZADA) {
      throw new ActividadInvalidaError("Tu inscripción a esta actividad fue rechazada");
    }
    if (existente && !ESTADOS_REINSCRIBIBLES.includes(existente.estado)) {
      throw new ActividadInvalidaError("Ya estás inscrito en esta actividad");
    }

    const ocupados = await contarOcupados(tx, actividadId);
    const estado = ocupados < actividad.cupos ? EstadoInscripcion.PENDIENTE : EstadoInscripcion.EN_ESPERA;
    const datos = {
      estado,
      fechaSolicitud: ahora,
      motivoRechazo: null,
      asistio: null,
      recordatorioEnviado: false,
    };
    return tx.inscripcion.upsert({
      where: { actividadId_usuarioId: { actividadId, usuarioId } },
      create: { ...datos, actividadId, usuarioId },
      update: datos,
      include: INCLUIR_INSCRIPCION,
    });
  }, SERIALIZABLE);
}

export function listarInscripcionesDe(usuarioId: string) {
  return prisma.inscripcion.findMany({
    where: { usuarioId },
    include: INCLUIR_INSCRIPCION,
    orderBy: { actividad: { inicio: "desc" } },
  });
}

export function listarInscritos(actividadId: string) {
  return prisma.inscripcion.findMany({
    where: { actividadId },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
    orderBy: { fechaSolicitud: "asc" },
  });
}

export function obtenerInscripcion(id: string) {
  return prisma.inscripcion.findUnique({ where: { id }, include: INCLUIR_INSCRIPCION });
}

export function decidirInscripcion(id: string, aceptar: boolean, motivo: string | null) {
  return prisma.$transaction(async (tx) => {
    const inscripcion = await tx.inscripcion.findUnique({ where: { id }, include: { actividad: true } });
    if (!inscripcion || inscripcion.estado !== EstadoInscripcion.PENDIENTE) {
      throw new ActividadInvalidaError("Solo se pueden aceptar o rechazar inscripciones pendientes");
    }
    if (inscripcion.actividad.cancelada || !inscripcionesAbiertas(inscripcion.actividad.inicio)) {
      throw new ActividadInvalidaError("Las inscripciones de esta actividad ya cerraron");
    }
    const actualizada = await tx.inscripcion.update({
      where: { id },
      data: aceptar
        ? { estado: EstadoInscripcion.ACEPTADA }
        : { estado: EstadoInscripcion.RECHAZADA, motivoRechazo: motivo },
      include: INCLUIR_INSCRIPCION,
    });
    const promovidas = aceptar ? [] : await promoverListaEspera(tx, inscripcion.actividadId);
    return { inscripcion: actualizada, promovidas };
  }, SERIALIZABLE);
}

export async function confirmarAsistencia(id: string, ahora = new Date()) {
  const inscripcion = await prisma.inscripcion.findUnique({ where: { id }, include: { actividad: true } });
  if (!inscripcion || inscripcion.estado !== EstadoInscripcion.ACEPTADA || inscripcion.actividad.cancelada) {
    throw new ActividadInvalidaError("Solo puedes confirmar una inscripción aceptada");
  }
  if (!puedeConfirmarAsistencia(inscripcion.actividad.inicio, ahora)) {
    throw new ActividadInvalidaError(
      "La confirmación se abre 48 horas antes de la actividad y cierra 24 horas antes"
    );
  }
  return prisma.inscripcion.update({
    where: { id },
    data: { estado: EstadoInscripcion.CONFIRMADA },
    include: INCLUIR_INSCRIPCION,
  });
}

export function cancelarInscripcion(id: string, ahora = new Date()) {
  return prisma.$transaction(async (tx) => {
    const inscripcion = await tx.inscripcion.findUnique({ where: { id }, include: { actividad: true } });
    if (!inscripcion || !ESTADOS_INSCRIPCION_VIGENTE.includes(inscripcion.estado)) {
      throw new ActividadInvalidaError("Esta inscripción ya no se puede cancelar");
    }
    if (inscripcion.actividad.inicio <= ahora) {
      throw new ActividadInvalidaError("La actividad ya comenzó");
    }
    const cancelada = await tx.inscripcion.update({
      where: { id },
      data: { estado: EstadoInscripcion.CANCELADA },
      include: INCLUIR_INSCRIPCION,
    });
    const liberaCupo = ESTADOS_QUE_OCUPAN_CUPO_ACTIVIDAD.includes(inscripcion.estado);
    const promovidas = liberaCupo ? await promoverListaEspera(tx, inscripcion.actividadId, ahora) : [];
    return { inscripcion: cancelada, promovidas };
  }, SERIALIZABLE);
}

export async function marcarAsistencia(id: string, asistio: boolean, ahora = new Date()) {
  const inscripcion = await prisma.inscripcion.findUnique({ where: { id }, include: { actividad: true } });
  if (!inscripcion || inscripcion.estado !== EstadoInscripcion.CONFIRMADA) {
    throw new ActividadInvalidaError("Solo se marca asistencia a las inscripciones confirmadas");
  }
  if (inscripcion.actividad.cancelada) {
    throw new ActividadInvalidaError("La actividad fue cancelada");
  }
  if (inscripcion.actividad.inicio > ahora) {
    throw new ActividadInvalidaError("La asistencia se marca desde el inicio de la actividad");
  }
  return prisma.inscripcion.update({ where: { id }, data: { asistio }, include: INCLUIR_INSCRIPCION });
}

export async function procesarPlazos(ahora = new Date()) {
  const aceptadas = await prisma.inscripcion.findMany({
    where: {
      estado: EstadoInscripcion.ACEPTADA,
      recordatorioEnviado: false,
      actividad: { cancelada: false, inicio: { gt: ahora } },
    },
    include: INCLUIR_INSCRIPCION,
  });
  const recordatorios = aceptadas.filter((inscripcion) =>
    puedeConfirmarAsistencia(inscripcion.actividad.inicio, ahora)
  );
  if (recordatorios.length > 0) {
    await prisma.inscripcion.updateMany({
      where: { id: { in: recordatorios.map((inscripcion) => inscripcion.id) } },
      data: { recordatorioEnviado: true },
    });
  }

  const porLiberar = (
    await prisma.inscripcion.findMany({
      where: {
        estado: { in: [EstadoInscripcion.PENDIENTE, EstadoInscripcion.ACEPTADA] },
        actividad: { cancelada: false },
      },
      include: INCLUIR_INSCRIPCION,
    })
  ).filter((inscripcion) => !inscripcionesAbiertas(inscripcion.actividad.inicio, ahora));
  if (porLiberar.length > 0) {
    await prisma.inscripcion.updateMany({
      where: { id: { in: porLiberar.map((inscripcion) => inscripcion.id) } },
      data: { estado: EstadoInscripcion.LIBERADA },
    });
  }

  return {
    recordatorios,
    liberadas: porLiberar.filter((inscripcion) => inscripcion.estado === EstadoInscripcion.ACEPTADA),
    noAprobadas: porLiberar.filter((inscripcion) => inscripcion.estado === EstadoInscripcion.PENDIENTE),
  };
}
