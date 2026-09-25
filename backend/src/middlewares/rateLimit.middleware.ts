import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { leerEmail } from "../utils/validaciones";

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UNA_HORA = 60 * 60 * 1000;

export const limiteLogin = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => leerEmail(req.body?.email) ?? ipKeyGenerator(req.ip ?? ""),
  message: { message: "Demasiados intentos de inicio de sesion. Espera 15 minutos e intenta de nuevo." },
});

export const limiteRegistro = rateLimit({
  windowMs: UNA_HORA,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Se crearon demasiadas cuentas en poco tiempo. Intenta de nuevo mas tarde." },
});
