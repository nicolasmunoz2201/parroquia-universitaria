import {
  HORA_FIN_AGENDA,
  HORA_INICIO_AGENDA,
  MINUTOS_ENTRE_HORAS,
  ZONA_HORARIA,
} from "../constants/sacramentos";

export function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hoyParaInput() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 10);
}

export function horasDelDia() {
  const horas: string[] = [];
  for (let minutos = HORA_INICIO_AGENDA * 60; minutos <= HORA_FIN_AGENDA * 60; minutos += MINUTOS_ENTRE_HORAS) {
    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");
    horas.push(`${hora}:${minuto}`);
  }
  return horas;
}

export function unirFechaYHora(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}`);
}

export function esFechaPasada(iso: string) {
  return new Date(iso) <= new Date();
}
