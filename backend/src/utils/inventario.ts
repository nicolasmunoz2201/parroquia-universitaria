import { ZONA_HORARIA } from "../constants/sacramentos";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type EstadoStock = "SIN_STOCK" | "BAJO_MINIMO" | "SUFICIENTE";

interface LoteDisponible {
  id: string;
  cantidadDisponible: number;
  fechaVencimiento: Date | null;
  createdAt: Date;
}

export function redondearCantidad(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function ordenarLotesFEFO<T extends LoteDisponible>(lotes: T[]) {
  return [...lotes].sort((a, b) => {
    if (a.fechaVencimiento && b.fechaVencimiento) {
      const diferencia = a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime();
      if (diferencia !== 0) return diferencia;
    } else if (a.fechaVencimiento) {
      return -1;
    } else if (b.fechaVencimiento) {
      return 1;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function planificarSalida(lotes: LoteDisponible[], cantidad: number) {
  const descuentos: { loteId: string; cantidad: number }[] = [];
  let pendiente = redondearCantidad(cantidad);
  for (const lote of ordenarLotesFEFO(lotes)) {
    if (pendiente <= 0) break;
    const descuento = redondearCantidad(Math.min(lote.cantidadDisponible, pendiente));
    if (descuento <= 0) continue;
    descuentos.push({ loteId: lote.id, cantidad: descuento });
    pendiente = redondearCantidad(pendiente - descuento);
  }
  return { descuentos, faltante: pendiente };
}

export function calcularEstadoStock(stock: number, stockMinimo: number): EstadoStock {
  if (stock <= 0) return "SIN_STOCK";
  if (stock < stockMinimo) return "BAJO_MINIMO";
  return "SUFICIENTE";
}

export function hoyEnChile(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(ahora);
}

export function fechaSinHora(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function diasParaVencer(fechaVencimiento: Date, ahora = new Date()) {
  return Math.round((fechaVencimiento.getTime() - fechaSinHora(hoyEnChile(ahora)).getTime()) / MS_POR_DIA);
}
