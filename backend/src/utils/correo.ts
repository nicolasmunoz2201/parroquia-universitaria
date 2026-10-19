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
    `Puedes revisar tus solicitudes en ${process.env.FRONTEND_URL}`,
  ]);
}
