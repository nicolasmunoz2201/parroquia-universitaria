import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { leerEmail } from "../utils/validaciones";
import {
  LIMITE_CAMBIO_PASSWORD,
  LIMITE_LOGIN,
  LIMITE_RECUPERAR,
  LIMITE_REGISTRO,
  LIMITE_RESTABLECER,
} from "../constants/limites";

const MS_POR_MINUTO = 60 * 1000;

export const limiteLogin = rateLimit({
  windowMs: LIMITE_LOGIN.minutos * MS_POR_MINUTO,
  limit: LIMITE_LOGIN.intentos,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => leerEmail(req.body?.email) ?? ipKeyGenerator(req.ip ?? ""),
  message: {
    message: `Demasiados intentos de inicio de sesion. Espera ${LIMITE_LOGIN.minutos} minutos e intenta de nuevo.`,
  },
});

export const limiteCambioPassword = rateLimit({
  windowMs: LIMITE_CAMBIO_PASSWORD.minutos * MS_POR_MINUTO,
  limit: LIMITE_CAMBIO_PASSWORD.intentos,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.usuario?.id ?? ipKeyGenerator(req.ip ?? ""),
  message: {
    message: `Demasiados intentos de cambiar la contraseña. Espera ${LIMITE_CAMBIO_PASSWORD.minutos} minutos e intenta de nuevo.`,
  },
});

export const limiteRestablecer = rateLimit({
  windowMs: LIMITE_RESTABLECER.minutos * MS_POR_MINUTO,
  limit: LIMITE_RESTABLECER.intentos,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: `Demasiados intentos de restablecer la contraseña. Espera ${LIMITE_RESTABLECER.minutos} minutos e intenta de nuevo.`,
  },
});

export const limiteRecuperar = rateLimit({
  windowMs: LIMITE_RECUPERAR.minutos * MS_POR_MINUTO,
  limit: LIMITE_RECUPERAR.intentos,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => leerEmail(req.body?.email) ?? ipKeyGenerator(req.ip ?? ""),
  message: {
    message: `Ya pediste varios enlaces de recuperación. Espera ${LIMITE_RECUPERAR.minutos} minutos e intenta de nuevo.`,
  },
});

export const limiteRegistro = rateLimit({
  windowMs: LIMITE_REGISTRO.minutos * MS_POR_MINUTO,
  limit: LIMITE_REGISTRO.intentos,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Se crearon demasiadas cuentas en poco tiempo. Intenta de nuevo mas tarde." },
});
