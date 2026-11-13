import type { InscripcionCompleta } from "../services/actividad.service";
import { correoConfigurado, enviarCorreoInscripcion } from "./correo";
import type { EventoInscripcion } from "./correo";
import { aperturaConfirmacion, cierreInscripciones } from "./actividades";

export function avisarInscripcion(evento: EventoInscripcion, inscripcion: InscripcionCompleta) {
  if (!correoConfigurado()) return;
  const inicio = inscripcion.actividad.inicio;
  enviarCorreoInscripcion(evento, inscripcion, {
    apertura: aperturaConfirmacion(inicio),
    cierre: cierreInscripciones(inicio),
  }).catch((error) => console.error(error));
}

export function avisarPromovidas(promovidas: InscripcionCompleta[]) {
  for (const inscripcion of promovidas) {
    avisarInscripcion("PROMOVIDA", inscripcion);
  }
}
