import type { CorsOptions } from "cors";

function normalizarOrigen(origen: string) {
  return origen.trim().replace(/\/+$/, "");
}

export function origenesPermitidos() {
  return [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGENES ?? "").split(",")]
    .filter((origen): origen is string => Boolean(origen?.trim()))
    .map(normalizarOrigen);
}

export const opcionesCors: CorsOptions = {
  origin(origen, responder) {
    if (!origen || origenesPermitidos().includes(normalizarOrigen(origen))) {
      responder(null, true);
      return;
    }
    responder(null, false);
  },
};
