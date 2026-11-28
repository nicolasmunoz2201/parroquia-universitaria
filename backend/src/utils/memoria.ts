import { ANIO_MINIMO_HITO } from "../constants/memoria";

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function separarFotos(
  idsActuales: string[],
  valorConservar: unknown
): { idsConservar: string[]; idsQuitar: string[] } | { error: string } {
  if (valorConservar === undefined) {
    return { idsConservar: idsActuales, idsQuitar: [] };
  }

  let lista: unknown;
  try {
    lista = typeof valorConservar === "string" ? JSON.parse(valorConservar) : null;
  } catch {
    lista = null;
  }
  if (!Array.isArray(lista) || !lista.every((id) => typeof id === "string")) {
    return { error: "La lista de fotos a conservar no es válida" };
  }

  const pedidas = new Set(lista);
  return {
    idsConservar: idsActuales.filter((id) => pedidas.has(id)),
    idsQuitar: idsActuales.filter((id) => !pedidas.has(id)),
  };
}

export function leerFechaHito(valor: unknown, ahora = new Date()): { fecha: Date } | { error: string } {
  const coincidencia = typeof valor === "string" ? FORMATO_FECHA.exec(valor.trim()) : null;
  if (!coincidencia) {
    return { error: "Indica la fecha del hito" };
  }

  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(`${anio}-${mes}-${dia}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== `${anio}-${mes}-${dia}`) {
    return { error: "La fecha del hito no es válida" };
  }
  if (Number(anio) < ANIO_MINIMO_HITO) {
    return { error: `La fecha debe ser desde el año ${ANIO_MINIMO_HITO}` };
  }
  if (fecha.getTime() > ahora.getTime()) {
    return { error: "Un hito histórico no puede tener una fecha futura" };
  }
  return { fecha };
}
