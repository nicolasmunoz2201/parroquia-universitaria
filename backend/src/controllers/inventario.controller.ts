import { Request, Response } from "express";
import { MotivoMovimiento, Prisma, TipoMovimiento, UnidadMedida } from "../generated/prisma/client";
import * as inventarioService from "../services/inventario.service";
import { InventarioInvalidoError } from "../services/inventario.service";
import { leerTexto } from "../utils/validaciones";
import { fechaSinHora, hoyEnChile } from "../utils/inventario";
import {
  CATEGORIAS_INSUMO,
  LARGO_MAXIMO_NOMBRE_INSUMO,
  LARGO_MAXIMO_OBSERVACION,
  MAX_CANTIDAD_INVENTARIO,
  MOTIVOS_ENTRADA,
  MOTIVOS_SALIDA,
  UNIDADES_ENTERAS,
} from "../constants/inventario";

const UNIDADES = Object.values(UnidadMedida);
const TIPOS_MOVIMIENTO = Object.values(TipoMovimiento);
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function esUnidad(valor: unknown): valor is UnidadMedida {
  return UNIDADES.includes(valor as UnidadMedida);
}

function esTipoMovimiento(valor: unknown): valor is TipoMovimiento {
  return TIPOS_MOVIMIENTO.includes(valor as TipoMovimiento);
}

function leerTextoOpcional(valor: unknown) {
  const texto = leerTexto(valor);
  return texto ? texto : null;
}

function leerFecha(valor: unknown) {
  if (typeof valor !== "string" || !FECHA_VALIDA.test(valor)) return null;
  const fecha = fechaSinHora(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function problemaConCantidad(valor: unknown, unidad: UnidadMedida, permitirCero: boolean) {
  const cantidad = typeof valor === "string" ? Number(valor) : valor;
  if (typeof cantidad !== "number" || !Number.isFinite(cantidad)) {
    return "Ingresa una cantidad válida";
  }
  if (permitirCero ? cantidad < 0 : cantidad <= 0) {
    return permitirCero ? "La cantidad no puede ser negativa" : "La cantidad debe ser mayor que cero";
  }
  if (cantidad > MAX_CANTIDAD_INVENTARIO) {
    return `La cantidad no puede superar ${MAX_CANTIDAD_INVENTARIO}`;
  }
  if (UNIDADES_ENTERAS.includes(unidad) && !Number.isInteger(cantidad)) {
    return "Este insumo se cuenta en números enteros";
  }
  if (Math.round(cantidad * 100) !== cantidad * 100) {
    return "Usa como máximo dos decimales";
  }
  return null;
}

function responderErrorInventario(error: unknown, res: Response) {
  if (error instanceof InventarioInvalidoError) {
    res.status(409).json({ message: error.message });
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    res.status(409).json({ message: "Otra persona está modificando este insumo, intenta de nuevo" });
    return true;
  }
  return false;
}

function leerDatosInsumo(body: Request["body"]) {
  const nombre = leerTexto(body?.nombre);
  const categoria = body?.categoria;
  const unidad = body?.unidad;
  const stockMinimo = typeof body?.stockMinimo === "string" ? Number(body.stockMinimo) : (body?.stockMinimo ?? 0);

  if (!nombre) return { error: "Escribe el nombre del insumo" };
  if (nombre.length > LARGO_MAXIMO_NOMBRE_INSUMO) return { error: "El nombre es demasiado largo" };
  if (!CATEGORIAS_INSUMO.includes(categoria)) return { error: "Selecciona una categoría válida" };
  if (!esUnidad(unidad)) return { error: "Selecciona una unidad de medida válida" };
  const problema = problemaConCantidad(stockMinimo, unidad, true);
  if (problema) return { error: `Stock mínimo: ${problema.toLowerCase()}` };

  return { datos: { nombre, categoria: categoria as string, unidad, stockMinimo: Number(stockMinimo) } };
}

export async function listarInsumos(_req: Request, res: Response) {
  res.json(await inventarioService.listarInsumos());
}

export async function crearInsumo(req: Request, res: Response) {
  const { datos, error } = leerDatosInsumo(req.body);
  if (!datos) {
    res.status(400).json({ message: error });
    return;
  }
  if (await inventarioService.buscarInsumoPorNombre(datos.nombre)) {
    res.status(409).json({ message: "Ya existe un insumo con ese nombre" });
    return;
  }
  res.status(201).json(await inventarioService.crearInsumo(datos));
}

export async function actualizarInsumo(req: Request, res: Response) {
  const insumo = await inventarioService.obtenerInsumo(req.params.id as string);
  if (!insumo) {
    res.status(404).json({ message: "Insumo no encontrado" });
    return;
  }
  const { datos, error } = leerDatosInsumo(req.body);
  if (!datos) {
    res.status(400).json({ message: error });
    return;
  }
  const mismoNombre = await inventarioService.buscarInsumoPorNombre(datos.nombre);
  if (mismoNombre && mismoNombre.id !== insumo.id) {
    res.status(409).json({ message: "Ya existe un insumo con ese nombre" });
    return;
  }
  if (datos.unidad !== insumo.unidad && (await inventarioService.contarMovimientos(insumo.id)) > 0) {
    res.status(409).json({ message: "No se puede cambiar la unidad de un insumo que ya tiene movimientos" });
    return;
  }
  res.json(await inventarioService.actualizarInsumo(insumo.id, datos));
}

async function cambiarEstadoInsumo(req: Request, res: Response, activo: boolean) {
  const insumo = await inventarioService.obtenerInsumo(req.params.id as string);
  if (!insumo) {
    res.status(404).json({ message: "Insumo no encontrado" });
    return;
  }
  res.json(await inventarioService.cambiarEstadoInsumo(insumo.id, activo));
}

export function activarInsumo(req: Request, res: Response) {
  return cambiarEstadoInsumo(req, res, true);
}

export function desactivarInsumo(req: Request, res: Response) {
  return cambiarEstadoInsumo(req, res, false);
}

export async function eliminarInsumo(req: Request, res: Response) {
  const insumo = await inventarioService.obtenerInsumo(req.params.id as string);
  if (!insumo) {
    res.status(404).json({ message: "Insumo no encontrado" });
    return;
  }
  if (!(await inventarioService.eliminarInsumo(insumo.id))) {
    res.status(409).json({
      message: "No se puede eliminar: el insumo tiene movimientos registrados. Desactívalo en su lugar.",
    });
    return;
  }
  res.status(204).send();
}

export async function listarDonantes(_req: Request, res: Response) {
  res.json(await inventarioService.listarDonantes());
}

async function leerMovimientoBase(req: Request, res: Response) {
  const insumo = await inventarioService.obtenerInsumo(String(req.body?.insumoId ?? ""));
  if (!insumo) {
    res.status(404).json({ message: "Selecciona un insumo válido" });
    return null;
  }
  const observacion = leerTextoOpcional(req.body?.observacion);
  if (observacion && observacion.length > LARGO_MAXIMO_OBSERVACION) {
    res.status(400).json({ message: "La observación es demasiado larga" });
    return null;
  }
  return { insumo, observacion };
}

export async function registrarEntrada(req: Request, res: Response) {
  const base = await leerMovimientoBase(req, res);
  if (!base) return;
  const { insumo, observacion } = base;

  const motivo = req.body?.motivo;
  if (!MOTIVOS_ENTRADA.includes(motivo)) {
    res.status(400).json({ message: "El motivo de una entrada debe ser donación o compra" });
    return;
  }
  const problema = problemaConCantidad(req.body?.cantidad, insumo.unidad, false);
  if (problema) {
    res.status(400).json({ message: problema });
    return;
  }

  let fechaVencimiento: Date | null = null;
  if (req.body?.fechaVencimiento) {
    fechaVencimiento = leerFecha(req.body.fechaVencimiento);
    if (!fechaVencimiento) {
      res.status(400).json({ message: "La fecha de vencimiento no es válida" });
      return;
    }
    if (fechaVencimiento < fechaSinHora(hoyEnChile())) {
      res.status(400).json({ message: "No se puede ingresar un producto ya vencido" });
      return;
    }
  }

  const donante = motivo === MotivoMovimiento.DONACION ? leerTextoOpcional(req.body?.donante) : null;
  if (donante && donante.length > LARGO_MAXIMO_NOMBRE_INSUMO) {
    res.status(400).json({ message: "El nombre del donante es demasiado largo" });
    return;
  }

  try {
    const movimiento = await inventarioService.registrarEntrada({
      insumoId: insumo.id,
      cantidad: Number(req.body.cantidad),
      motivo,
      fechaVencimiento,
      donante,
      observacion,
      usuarioId: req.usuario!.id,
    });
    res.status(201).json(movimiento);
  } catch (error) {
    if (!responderErrorInventario(error, res)) throw error;
  }
}

export async function registrarSalida(req: Request, res: Response) {
  const base = await leerMovimientoBase(req, res);
  if (!base) return;
  const { insumo, observacion } = base;

  const motivo = req.body?.motivo;
  if (!MOTIVOS_SALIDA.includes(motivo)) {
    res.status(400).json({ message: "El motivo de una salida debe ser consumo, merma o vencimiento" });
    return;
  }
  const problema = problemaConCantidad(req.body?.cantidad, insumo.unidad, false);
  if (problema) {
    res.status(400).json({ message: problema });
    return;
  }
  if (motivo !== MotivoMovimiento.CONSUMO && !observacion) {
    res.status(400).json({ message: "Explica en la observación por qué se perdió el insumo" });
    return;
  }

  try {
    const movimiento = await inventarioService.registrarSalida({
      insumoId: insumo.id,
      cantidad: Number(req.body.cantidad),
      motivo,
      observacion,
      usuarioId: req.usuario!.id,
    });
    res.status(201).json(movimiento);
  } catch (error) {
    if (!responderErrorInventario(error, res)) throw error;
  }
}

export async function registrarConteo(req: Request, res: Response) {
  const base = await leerMovimientoBase(req, res);
  if (!base) return;
  const { insumo, observacion } = base;

  const problema = problemaConCantidad(req.body?.cantidadReal, insumo.unidad, true);
  if (problema) {
    res.status(400).json({ message: problema });
    return;
  }

  try {
    const movimiento = await inventarioService.registrarConteo({
      insumoId: insumo.id,
      cantidadReal: Number(req.body.cantidadReal),
      observacion,
      usuarioId: req.usuario!.id,
    });
    res.status(201).json(movimiento);
  } catch (error) {
    if (!responderErrorInventario(error, res)) throw error;
  }
}

export async function listarMovimientos(req: Request, res: Response) {
  const { insumoId, tipo, desde, hasta } = req.query;
  if (tipo !== undefined && !esTipoMovimiento(tipo)) {
    res.status(400).json({ message: "El tipo de movimiento no es válido" });
    return;
  }
  const fechaDesde = desde !== undefined ? leerFecha(desde) : undefined;
  const fechaHasta = hasta !== undefined ? leerFecha(hasta) : undefined;
  if (fechaDesde === null || fechaHasta === null) {
    res.status(400).json({ message: "Las fechas del filtro no son válidas" });
    return;
  }

  res.json(
    await inventarioService.listarMovimientos({
      ...(typeof insumoId === "string" && insumoId ? { insumoId } : {}),
      ...(tipo ? { tipo } : {}),
      ...(fechaDesde ? { desde: fechaDesde } : {}),
      ...(fechaHasta ? { hasta: new Date(fechaHasta.getTime() + MS_POR_DIA) } : {}),
    })
  );
}

export async function listarAlertas(_req: Request, res: Response) {
  res.json(await inventarioService.listarAlertas());
}

export async function obtenerReporte(_req: Request, res: Response) {
  res.json(await inventarioService.obtenerReporte());
}
