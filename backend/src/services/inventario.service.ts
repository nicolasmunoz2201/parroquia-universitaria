import prisma from "../config/prisma";
import {
  MotivoMovimiento,
  Prisma,
  TipoMovimiento,
  UnidadMedida,
} from "../generated/prisma/client";
import { DIAS_AVISO_VENCIMIENTO, ETIQUETAS_UNIDAD, MESES_REPORTE } from "../constants/inventario";
import {
  calcularEstadoStock,
  diasParaVencer,
  planificarSalida,
  redondearCantidad,
} from "../utils/inventario";

export class InventarioInvalidoError extends Error {}

type Transaccion = Prisma.TransactionClient;

const SERIALIZABLE = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

const LOTES_CON_STOCK = {
  lotes: {
    where: { cantidadDisponible: { gt: 0 } },
    select: { id: true, cantidadDisponible: true, fechaVencimiento: true, createdAt: true },
  },
} as const;

const INCLUIR_MOVIMIENTO = {
  insumo: { select: { id: true, nombre: true, unidad: true, categoria: true } },
  usuario: { select: { id: true, nombre: true } },
  lote: { select: { fechaVencimiento: true, donante: { select: { id: true, nombre: true } } } },
} as const;

type InsumoConLotes = Prisma.InsumoGetPayload<{ include: typeof LOTES_CON_STOCK }>;

function conStock({ lotes, ...insumo }: InsumoConLotes) {
  const stock = redondearCantidad(lotes.reduce((total, lote) => total + lote.cantidadDisponible, 0));
  const vencimientos = lotes
    .map((lote) => lote.fechaVencimiento)
    .filter((fecha): fecha is Date => fecha !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    ...insumo,
    stock,
    estado: calcularEstadoStock(stock, insumo.stockMinimo),
    proximoVencimiento: vencimientos[0] ?? null,
  };
}

export async function listarInsumos() {
  const insumos = await prisma.insumo.findMany({ include: LOTES_CON_STOCK, orderBy: { nombre: "asc" } });
  return insumos.map(conStock);
}

export function obtenerInsumo(id: string) {
  return prisma.insumo.findUnique({ where: { id } });
}

export function buscarInsumoPorNombre(nombre: string) {
  return prisma.insumo.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
}

export function crearInsumo(data: {
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  stockMinimo: number;
}) {
  return prisma.insumo.create({ data });
}

export function actualizarInsumo(
  id: string,
  data: { nombre: string; categoria: string; unidad: UnidadMedida; stockMinimo: number }
) {
  return prisma.insumo.update({ where: { id }, data });
}

export function cambiarEstadoInsumo(id: string, activo: boolean) {
  return prisma.insumo.update({ where: { id }, data: { activo } });
}

export function contarMovimientos(insumoId: string) {
  return prisma.movimientoInventario.count({ where: { insumoId } });
}

export async function eliminarInsumo(id: string) {
  if ((await contarMovimientos(id)) > 0) {
    return false;
  }
  await prisma.insumo.delete({ where: { id } });
  return true;
}

export function listarDonantes() {
  return prisma.donante.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { lotes: true } } },
  });
}

async function insumoActivo(tx: Transaccion, insumoId: string) {
  const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
  if (!insumo || !insumo.activo) {
    throw new InventarioInvalidoError("El insumo no existe o está desactivado");
  }
  return insumo;
}

async function descontarStock(
  tx: Transaccion,
  insumo: { id: string; unidad: UnidadMedida },
  cantidad: number
) {
  const lotes = await tx.lote.findMany({ where: { insumoId: insumo.id, cantidadDisponible: { gt: 0 } } });
  const { descuentos, faltante } = planificarSalida(lotes, cantidad);
  if (faltante > 0) {
    const stock = redondearCantidad(lotes.reduce((total, lote) => total + lote.cantidadDisponible, 0));
    throw new InventarioInvalidoError(
      `No hay stock suficiente: quedan ${stock} ${ETIQUETAS_UNIDAD[insumo.unidad]}`
    );
  }
  for (const descuento of descuentos) {
    const lote = lotes.find((item) => item.id === descuento.loteId)!;
    await tx.lote.update({
      where: { id: lote.id },
      data: { cantidadDisponible: redondearCantidad(lote.cantidadDisponible - descuento.cantidad) },
    });
  }
}

export function registrarEntrada(data: {
  insumoId: string;
  cantidad: number;
  motivo: MotivoMovimiento;
  fechaVencimiento: Date | null;
  donante: string | null;
  observacion: string | null;
  usuarioId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await insumoActivo(tx, data.insumoId);
    const lote = await tx.lote.create({
      data: {
        insumo: { connect: { id: data.insumoId } },
        cantidadInicial: data.cantidad,
        cantidadDisponible: data.cantidad,
        fechaVencimiento: data.fechaVencimiento,
        ...(data.donante
          ? {
              donante: {
                connectOrCreate: { where: { nombre: data.donante }, create: { nombre: data.donante } },
              },
            }
          : {}),
      },
    });
    return tx.movimientoInventario.create({
      data: {
        tipo: TipoMovimiento.ENTRADA,
        motivo: data.motivo,
        cantidad: data.cantidad,
        observacion: data.observacion,
        insumoId: data.insumoId,
        loteId: lote.id,
        usuarioId: data.usuarioId,
      },
      include: INCLUIR_MOVIMIENTO,
    });
  });
}

export function registrarSalida(data: {
  insumoId: string;
  cantidad: number;
  motivo: MotivoMovimiento;
  observacion: string | null;
  usuarioId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const insumo = await insumoActivo(tx, data.insumoId);
    await descontarStock(tx, insumo, data.cantidad);
    return tx.movimientoInventario.create({
      data: {
        tipo: TipoMovimiento.SALIDA,
        motivo: data.motivo,
        cantidad: data.cantidad,
        observacion: data.observacion,
        insumoId: data.insumoId,
        usuarioId: data.usuarioId,
      },
      include: INCLUIR_MOVIMIENTO,
    });
  }, SERIALIZABLE);
}

export function registrarConteo(data: {
  insumoId: string;
  cantidadReal: number;
  observacion: string | null;
  usuarioId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const insumo = await insumoActivo(tx, data.insumoId);
    const lotes = await tx.lote.findMany({ where: { insumoId: insumo.id, cantidadDisponible: { gt: 0 } } });
    const stock = redondearCantidad(lotes.reduce((total, lote) => total + lote.cantidadDisponible, 0));
    const diferencia = redondearCantidad(data.cantidadReal - stock);
    if (diferencia === 0) {
      throw new InventarioInvalidoError("El conteo coincide con el stock registrado, no hay nada que ajustar");
    }

    let loteId: string | null = null;
    if (diferencia > 0) {
      const lote = await tx.lote.create({
        data: { insumoId: insumo.id, cantidadInicial: diferencia, cantidadDisponible: diferencia },
      });
      loteId = lote.id;
    } else {
      await descontarStock(tx, insumo, -diferencia);
    }

    return tx.movimientoInventario.create({
      data: {
        tipo: diferencia > 0 ? TipoMovimiento.ENTRADA : TipoMovimiento.SALIDA,
        motivo: MotivoMovimiento.CONTEO_FISICO,
        cantidad: Math.abs(diferencia),
        observacion: data.observacion,
        insumoId: insumo.id,
        loteId,
        usuarioId: data.usuarioId,
      },
      include: INCLUIR_MOVIMIENTO,
    });
  }, SERIALIZABLE);
}

export function listarMovimientos(filtros: {
  insumoId?: string;
  tipo?: TipoMovimiento;
  desde?: Date;
  hasta?: Date;
}) {
  return prisma.movimientoInventario.findMany({
    where: {
      ...(filtros.insumoId ? { insumoId: filtros.insumoId } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.desde || filtros.hasta
        ? {
            createdAt: {
              ...(filtros.desde ? { gte: filtros.desde } : {}),
              ...(filtros.hasta ? { lt: filtros.hasta } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: INCLUIR_MOVIMIENTO,
  });
}

export async function listarAlertas() {
  const insumos = (await listarInsumos()).filter((insumo) => insumo.activo);
  const bajoMinimo = insumos.filter((insumo) => insumo.stockMinimo > 0 && insumo.stock < insumo.stockMinimo);

  const lotes = await prisma.lote.findMany({
    where: {
      cantidadDisponible: { gt: 0 },
      fechaVencimiento: { not: null },
      insumo: { activo: true },
    },
    include: { insumo: { select: { id: true, nombre: true, unidad: true } } },
    orderBy: { fechaVencimiento: "asc" },
  });
  const porVencer = lotes
    .map((lote) => ({ ...lote, diasParaVencer: diasParaVencer(lote.fechaVencimiento!) }))
    .filter((lote) => lote.diasParaVencer <= DIAS_AVISO_VENCIMIENTO);

  return { bajoMinimo, porVencer };
}

function claveMes(fecha: Date) {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function obtenerReporte(ahora = new Date()) {
  const inicio = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - (MESES_REPORTE - 1), 1));
  const [insumos, alertas, movimientos] = await Promise.all([
    listarInsumos(),
    listarAlertas(),
    prisma.movimientoInventario.findMany({
      where: { createdAt: { gte: inicio } },
      include: {
        insumo: { select: { id: true, nombre: true, unidad: true } },
        lote: { select: { donante: { select: { nombre: true } } } },
      },
    }),
  ]);

  const meses = Array.from({ length: MESES_REPORTE }, (_, i) =>
    claveMes(new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1)))
  );
  const movimientosPorMes = meses.map((mes) => ({ mes, entradas: 0, salidas: 0 }));
  const salidasPorMotivo: Record<string, number> = {};
  const consumoPorInsumo = new Map<string, { nombre: string; unidad: UnidadMedida; cantidad: number }>();
  const donacionesPorDonante = new Map<string, number>();

  for (const movimiento of movimientos) {
    const fila = movimientosPorMes.find((item) => item.mes === claveMes(movimiento.createdAt));
    if (fila) {
      if (movimiento.tipo === TipoMovimiento.ENTRADA) fila.entradas += 1;
      else fila.salidas += 1;
    }
    if (movimiento.tipo === TipoMovimiento.SALIDA) {
      salidasPorMotivo[movimiento.motivo] = (salidasPorMotivo[movimiento.motivo] ?? 0) + 1;
    }
    if (movimiento.motivo === MotivoMovimiento.CONSUMO) {
      const actual = consumoPorInsumo.get(movimiento.insumo.id) ?? {
        nombre: movimiento.insumo.nombre,
        unidad: movimiento.insumo.unidad,
        cantidad: 0,
      };
      actual.cantidad = redondearCantidad(actual.cantidad + movimiento.cantidad);
      consumoPorInsumo.set(movimiento.insumo.id, actual);
    }
    const donante = movimiento.lote?.donante?.nombre;
    if (movimiento.motivo === MotivoMovimiento.DONACION && donante) {
      donacionesPorDonante.set(donante, (donacionesPorDonante.get(donante) ?? 0) + 1);
    }
  }

  const activos = insumos.filter((insumo) => insumo.activo);
  return {
    resumen: {
      insumosActivos: activos.length,
      sinStock: activos.filter((insumo) => insumo.estado === "SIN_STOCK").length,
      bajoMinimo: alertas.bajoMinimo.length,
      porVencer: alertas.porVencer.filter((lote) => lote.diasParaVencer >= 0).length,
      vencidos: alertas.porVencer.filter((lote) => lote.diasParaVencer < 0).length,
    },
    movimientosPorMes,
    salidasPorMotivo,
    consumoPorInsumo: [...consumoPorInsumo.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
    donacionesPorDonante: [...donacionesPorDonante.entries()]
      .map(([nombre, entregas]) => ({ nombre, entregas }))
      .sort((a, b) => b.entregas - a.entregas)
      .slice(0, 5),
  };
}
