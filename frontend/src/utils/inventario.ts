import { SIMBOLO_UNIDAD, UNIDADES_ENTERAS } from "../constants/inventario";
import type { UnidadMedida } from "../constants/inventario";

const FORMATO_NUMERO = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export function formatearCantidad(cantidad: number, unidad: UnidadMedida) {
  return `${FORMATO_NUMERO.format(cantidad)} ${SIMBOLO_UNIDAD[unidad]}`;
}

export function formatearFechaCorta(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatearFechaMovimiento(fecha: string) {
  return new Date(fecha).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pasoCantidad(unidad: UnidadMedida) {
  return UNIDADES_ENTERAS.includes(unidad) ? "1" : "0.01";
}

export function redondearCantidad(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function textoDiasParaVencer(dias: number) {
  if (dias < 0) return `venció hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  return `vence en ${dias} días`;
}

function celdaCsv(valor: string | number) {
  const texto = String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function descargarCsv(nombreArchivo: string, filas: (string | number)[][]) {
  const contenido = "﻿" + filas.map((fila) => fila.map(celdaCsv).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
