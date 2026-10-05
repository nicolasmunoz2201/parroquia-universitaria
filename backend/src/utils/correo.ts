import nodemailer from "nodemailer";

export const HORAS_VALIDEZ_RECUPERACION = 1;

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

export async function enviarCorreoRecuperacion(destino: { nombre: string; email: string }, codigo: string) {
  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s/g, "") },
  });

  const enlace = `${process.env.FRONTEND_URL}/?restablecer=${codigo}`;
  const validez = `${HORAS_VALIDEZ_RECUPERACION} hora`;

  await transporte.sendMail({
    from: `"Parroquia Universitaria UdeC" <${process.env.SMTP_USER}>`,
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
