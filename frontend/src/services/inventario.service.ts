import { peticion } from "./api";
import type {
  EstadoStock,
  MotivoMovimiento,
  TipoMovimiento,
  UnidadMedida,
} from "../constants/inventario";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  stockMinimo: number;
  activo: boolean;
  stock: number;
  estado: EstadoStock;
  proximoVencimiento: string | null;
  tieneMovimientos: boolean;
}

export interface DatosInsumo {
  nombre: string;
  categoria: string;
  unidad: UnidadMedida;
  stockMinimo: number;
}

export interface Donante {
  id: string;
  nombre: string;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  observacion: string | null;
  createdAt: string;
  insumo: { id: string; nombre: string; unidad: UnidadMedida; categoria: string };
  usuario: { id: string; nombre: string };
  lote: { fechaVencimiento: string | null; donante: Donante | null } | null;
}

export interface LotePorVencer {
  id: string;
  cantidadDisponible: number;
  fechaVencimiento: string;
  diasParaVencer: number;
  insumo: { id: string; nombre: string; unidad: UnidadMedida };
}

export interface Alertas {
  bajoMinimo: Insumo[];
  porVencer: LotePorVencer[];
}

export interface Reporte {
  resumen: {
    insumosActivos: number;
    sinStock: number;
    bajoMinimo: number;
    porVencer: number;
    vencidos: number;
  };
  movimientosPorMes: { mes: string; entradas: number; salidas: number }[];
  salidasPorMotivo: Partial<Record<MotivoMovimiento, number>>;
  consumoPorInsumo: { nombre: string; unidad: UnidadMedida; cantidad: number }[];
  donacionesPorDonante: { nombre: string; entregas: number }[];
}

export interface FiltrosMovimientos {
  insumoId?: string;
  tipo?: TipoMovimiento;
  desde?: string;
  hasta?: string;
}

const BASE = "/api/inventario";

export function listarInsumos(): Promise<Insumo[]> {
  return peticion(`${BASE}/insumos`, "No se pudieron cargar los insumos", { auth: true });
}

export function crearInsumo(datos: DatosInsumo): Promise<Insumo> {
  return peticion(`${BASE}/insumos`, "No se pudo crear el insumo", { method: "POST", auth: true, json: datos });
}

export function actualizarInsumo(id: string, datos: DatosInsumo): Promise<Insumo> {
  return peticion(`${BASE}/insumos/${id}`, "No se pudo actualizar el insumo", {
    method: "PUT",
    auth: true,
    json: datos,
  });
}

export function cambiarEstadoInsumo(id: string, activo: boolean): Promise<Insumo> {
  return peticion(`${BASE}/insumos/${id}/${activo ? "activar" : "desactivar"}`, "No se pudo actualizar el insumo", {
    method: "PATCH",
    auth: true,
  });
}

export function eliminarInsumo(id: string): Promise<void> {
  return peticion(`${BASE}/insumos/${id}`, "No se pudo eliminar el insumo", { method: "DELETE", auth: true });
}

export function listarDonantes(): Promise<Donante[]> {
  return peticion(`${BASE}/donantes`, "No se pudieron cargar los donantes", { auth: true });
}

export function registrarEntrada(datos: {
  insumoId: string;
  cantidad: number;
  motivo: MotivoMovimiento;
  fechaVencimiento: string;
  donante: string;
  observacion: string;
}): Promise<Movimiento> {
  return peticion(`${BASE}/movimientos/entrada`, "No se pudo registrar la entrada", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function registrarSalida(datos: {
  insumoId: string;
  cantidad: number;
  motivo: MotivoMovimiento;
  observacion: string;
}): Promise<Movimiento> {
  return peticion(`${BASE}/movimientos/salida`, "No se pudo registrar la salida", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function registrarConteo(datos: {
  insumoId: string;
  cantidadReal: number;
  observacion: string;
}): Promise<Movimiento> {
  return peticion(`${BASE}/movimientos/conteo`, "No se pudo registrar el conteo", {
    method: "POST",
    auth: true,
    json: datos,
  });
}

export function listarMovimientos(filtros: FiltrosMovimientos): Promise<Movimiento[]> {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) parametros.set(clave, valor);
  }
  const consulta = parametros.toString();
  return peticion(`${BASE}/movimientos${consulta ? `?${consulta}` : ""}`, "No se pudo cargar el historial", {
    auth: true,
  });
}

export function obtenerAlertas(): Promise<Alertas> {
  return peticion(`${BASE}/alertas`, "No se pudieron cargar las alertas", { auth: true });
}

export function obtenerReporte(): Promise<Reporte> {
  return peticion(`${BASE}/reporte`, "No se pudo cargar el reporte", { auth: true });
}
