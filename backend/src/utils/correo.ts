import nodemailer from "nodemailer";
import { EstadoSolicitud, TipoSacramento } from "../generated/prisma/client";
import { HORAS_VALIDEZ_RECUPERACION } from "../constants/autenticacion";
import { NOMBRE_REMITENTE, SMTP_HOST, SMTP_PUERTO } from "../constants/correo";
import { ETIQUETAS_SACRAMENTO, ZONA_HORARIA } from "../constants/sacramentos";

export function correoConfigurado() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.FRONTEND_URL);
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function crearTransporte() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PUERTO,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s/g, "") },
  });
}

async function enviarCorreo(destino: string, asunto: string, parrafos: string[]) {
  await crearTransporte().sendMail({
    from: `"${NOMBRE_REMITENTE}" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: asunto,
    text: parrafos.join("\n\n"),
    html: parrafos.map((parrafo) => `<p>${escaparHtml(parrafo)}</p>`).join(""),
  });
}

export async function enviarCorreoRecuperacion(destino: { nombre: string; email: string }, codigo: string) {
  const enlace = `${process.env.FRONTEND_URL}/?restablecer=${codigo}`;
  const validez = `${HORAS_VALIDEZ_RECUPERACION} hora`;

  await crearTransporte().sendMail({
    from: `"${NOMBRE_REMITENTE}" <${process.env.SMTP_USER}>`,
    to: destino.email,
    subject: "Recupera tu contraseña",
    text:
      `Hola ${destino.nombre}:\n\n` +
      `El administrador de la Parroquia Universitaria UdeC te envió este enlace para crear una nueva contraseña:\n\n` +
      `${enlace}\n\n` +
      `El enlace sirve una sola vez y vence en ${validez}. Si no pediste este cambio, puedes ignorar este correo.`,
    html:
      `<p>Hola ${escaparHtml(destino.nombre)}:</p>` +
      `<p>El administrador de la Parroquia Universitaria UdeC te envió este enlace para crear una nueva contraseña:</p>` +
      `<p><a href="${enlace}">Crear nueva contraseña</a></p>` +
      `<p>El enlace sirve una sola vez y vence en ${validez}. Si no pediste este cambio, puedes ignorar este correo.</p>`,
  });
}

export function formatearFecha(fecha: Date) {
  return fecha.toLocaleString("es-CL", {
    timeZone: ZONA_HORARIA,
    dateStyle: "full",
    timeStyle: "short",
  });
}

const DETALLE_ESTADO: Record<EstadoSolicitud, (observacion: string) => string> = {
  PENDIENTE: () => "Recibimos tu solicitud. La secretaría la revisará y te avisaremos por este medio.",
  APROBADA: () => "Tu solicitud fue aprobada. Te esperamos en la fecha y el lugar indicados.",
  OBSERVADA: (observacion) =>
    `Tu solicitud tiene una observación: ${observacion}. Revisa "Agendar sacramentos" en la plataforma.`,
  RECHAZADA: (observacion) => `Tu solicitud fue rechazada. Motivo: ${observacion}.`,
  CANCELADA: () => "Tu solicitud fue cancelada.",
  REALIZADA: () => "El sacramento quedó registrado como realizado. ¡Gracias por acompañarnos!",
};

const ASUNTO_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Recibimos tu solicitud",
  APROBADA: "Tu solicitud fue aprobada",
  OBSERVADA: "Tu solicitud tiene observaciones",
  RECHAZADA: "Tu solicitud fue rechazada",
  CANCELADA: "Tu solicitud fue cancelada",
  REALIZADA: "Sacramento realizado",
};

export async function enviarCorreoEstadoSolicitud(solicitud: {
  estado: EstadoSolicitud;
  nombreBeneficiario: string;
  observacion: string | null;
  solicitante: { nombre: string; email: string };
  horario: { tipo: TipoSacramento; inicio: Date; lugar: string | null };
}) {
  const sacramento = ETIQUETAS_SACRAMENTO[solicitud.horario.tipo];
  await enviarCorreo(solicitud.solicitante.email, `${ASUNTO_ESTADO[solicitud.estado]}: ${sacramento}`, [
    `Hola ${solicitud.solicitante.nombre}:`,
    DETALLE_ESTADO[solicitud.estado](solicitud.observacion ?? ""),
    `Sacramento: ${sacramento}`,
    `Para: ${solicitud.nombreBeneficiario}`,
    `Fecha: ${formatearFecha(solicitud.horario.inicio)}`,
    `Lugar: ${solicitud.horario.lugar ?? "Parroquia Universitaria UdeC"}`,
    "Puedes revisar tus solicitudes en la plataforma de la parroquia, en la sección Agendar sacramentos.",
  ]);
}

export type EventoInscripcion =
  | "RECIBIDA"
  | "EN_ESPERA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "PROMOVIDA"
  | "RECORDATORIO"
  | "LIBERADA"
  | "NO_APROBADA"
  | "ACTIVIDAD_MODIFICADA"
  | "ACTIVIDAD_CANCELADA";

interface DatosCorreoInscripcion {
  motivoRechazo: string | null;
  usuario: { nombre: string; email: string };
  actividad: { titulo: string; inicio: Date; lugar: string | null; organismo: { nombre: string } };
}

const ASUNTO_INSCRIPCION: Record<EventoInscripcion, string> = {
  RECIBIDA: "Recibimos tu inscripción",
  EN_ESPERA: "Quedaste en lista de espera",
  ACEPTADA: "Tu inscripción fue aceptada",
  RECHAZADA: "Tu inscripción fue rechazada",
  PROMOVIDA: "Se liberó un cupo para ti",
  RECORDATORIO: "Confirma tu asistencia",
  LIBERADA: "Perdiste tu cupo",
  NO_APROBADA: "Tu inscripción no alcanzó a ser aprobada",
  ACTIVIDAD_MODIFICADA: "La actividad cambió",
  ACTIVIDAD_CANCELADA: "La actividad fue cancelada",
};

function detalleInscripcion(evento: EventoInscripcion, datos: DatosCorreoInscripcion, cierre: string, apertura: string) {
  switch (evento) {
    case "RECIBIDA":
      return "Recibimos tu inscripción. El encargado la revisará y te avisaremos por este medio.";
    case "EN_ESPERA":
      return "La actividad no tiene cupos por ahora, así que quedaste en lista de espera. Si se libera un cupo, te avisaremos.";
    case "ACEPTADA":
      return `Tu inscripción fue aceptada. Recuerda confirmar tu asistencia en la plataforma entre el ${apertura} y el ${cierre}; si no confirmas, el cupo pasará a otra persona.`;
    case "RECHAZADA":
      return `Tu inscripción fue rechazada. Motivo: ${datos.motivoRechazo ?? "no se indicó"}.`;
    case "PROMOVIDA":
      return "Se liberó un cupo y subiste desde la lista de espera. Tu inscripción quedó pendiente de aprobación.";
    case "RECORDATORIO":
      return `Confirma tu asistencia en la plataforma antes del ${cierre}. Si no puedes ir, usa "No podré asistir" para dejar el cupo a otra persona.`;
    case "LIBERADA":
      return "No se confirmó tu asistencia a tiempo, por lo que el cupo quedó libre.";
    case "NO_APROBADA":
      return "Las inscripciones cerraron antes de que el encargado revisara tu solicitud. Lamentamos las molestias.";
    case "ACTIVIDAD_MODIFICADA":
      return `La fecha o el lugar de la actividad cambiaron. Revisa los datos nuevos abajo. Si ya estabas aceptado, deberás confirmar tu asistencia entre el ${apertura} y el ${cierre}.`;
    case "ACTIVIDAD_CANCELADA":
      return "Lamentamos informarte que la actividad fue cancelada.";
  }
}

export async function enviarCorreoInscripcion(
  evento: EventoInscripcion,
  datos: DatosCorreoInscripcion,
  plazos: { apertura: Date; cierre: Date }
) {
  const { actividad } = datos;
  await enviarCorreo(datos.usuario.email, `${ASUNTO_INSCRIPCION[evento]}: ${actividad.titulo}`, [
    `Hola ${datos.usuario.nombre}:`,
    detalleInscripcion(evento, datos, formatearFecha(plazos.cierre), formatearFecha(plazos.apertura)),
    `Actividad: ${actividad.titulo}`,
    `Organismo: ${actividad.organismo.nombre}`,
    `Fecha: ${formatearFecha(actividad.inicio)}`,
    `Lugar: ${actividad.lugar ?? "Parroquia Universitaria UdeC"}`,
    "Puedes revisar tus inscripciones en la plataforma de la parroquia, en la sección Actividades.",
  ]);
}

export async function enviarAvisoCancelacion(
  solicitud: {
    nombreBeneficiario: string;
    solicitante: { nombre: string; email: string };
    horario: { tipo: TipoSacramento; inicio: Date; lugar: string | null };
  },
  destinatarios: { nombre: string; email: string }[]
) {
  const sacramento = ETIQUETAS_SACRAMENTO[solicitud.horario.tipo];
  for (const destinatario of destinatarios) {
    await enviarCorreo(destinatario.email, `Solicitud cancelada: ${sacramento}`, [
      `Hola ${destinatario.nombre}:`,
      `${solicitud.solicitante.nombre} (${solicitud.solicitante.email}) canceló su solicitud. El cupo quedó libre para otra persona.`,
      `Sacramento: ${sacramento}`,
      `Para: ${solicitud.nombreBeneficiario}`,
      `Fecha: ${formatearFecha(solicitud.horario.inicio)}`,
      `Lugar: ${solicitud.horario.lugar ?? "Parroquia Universitaria UdeC"}`,
      "Puedes revisar las solicitudes en la plataforma de la parroquia, en la sección Agendamientos.",
    ]);
  }
}
