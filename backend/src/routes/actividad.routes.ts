import { Router } from "express";
import * as actividadController from "../controllers/actividad.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { ROLES_GESTION_ACTIVIDADES } from "../constants/actividades";

const router = Router();

const puedeGestionar = [requiereAutenticacion, requiereRol(...ROLES_GESTION_ACTIVIDADES)];

router.get("/", actividadController.listarPublicas);
router.get("/gestion", ...puedeGestionar, actividadController.listarGestion);
router.post("/", ...puedeGestionar, actividadController.crear);
router.put("/:id", ...puedeGestionar, actividadController.actualizar);
router.patch("/:id/cancelar", ...puedeGestionar, actividadController.cancelar);
router.get("/:id/inscritos", ...puedeGestionar, actividadController.listarInscritos);

router.post("/:id/inscripciones", requiereAutenticacion, actividadController.inscribirse);
router.get("/inscripciones/mias", requiereAutenticacion, actividadController.misInscripciones);
router.patch("/inscripciones/:id/confirmar", requiereAutenticacion, actividadController.confirmar);
router.patch("/inscripciones/:id/cancelar", requiereAutenticacion, actividadController.cancelarInscripcion);
router.patch("/inscripciones/:id/decision", ...puedeGestionar, actividadController.decidir);
router.patch("/inscripciones/:id/asistencia", ...puedeGestionar, actividadController.asistencia);

export default router;
