import { MINUTOS_REVISION_PLAZOS } from "../constants/actividades";
import { procesarPlazos } from "../services/actividad.service";
import { avisarInscripcion } from "../utils/avisosInscripcion";

const MS_POR_MINUTO = 60 * 1000;

async function revisarPlazos() {
  try {
    const { recordatorios, liberadas, noAprobadas } = await procesarPlazos();
    for (const inscripcion of recordatorios) avisarInscripcion("RECORDATORIO", inscripcion);
    for (const inscripcion of liberadas) avisarInscripcion("LIBERADA", inscripcion);
    for (const inscripcion of noAprobadas) avisarInscripcion("NO_APROBADA", inscripcion);
  } catch (error) {
    console.error("No se pudieron revisar los plazos de inscripción", error);
  }
}

export function iniciarRevisionPlazos() {
  revisarPlazos();
  setInterval(revisarPlazos, MINUTOS_REVISION_PLAZOS * MS_POR_MINUTO);
}
