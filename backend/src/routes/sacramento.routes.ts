import { Router } from "express";
import * as sacramentoController from "../controllers/sacramento.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { subirDocumentos, verificarDocumentos } from "../middlewares/documento.middleware";
import { ROLES_GESTION_SACRAMENTOS } from "../constants/sacramentos";

const router = Router();

const puedeGestionar = [requiereAutenticacion, requiereRol(...ROLES_GESTION_SACRAMENTOS)];

router.get("/documentos-requeridos", requiereAutenticacion, sacramentoController.documentosRequeridos);
router.get("/documentos/:id", requiereAutenticacion, sacramentoController.verDocumento);

router.get("/horarios/disponibles", requiereAutenticacion, sacramentoController.horariosDisponibles);
router.get("/horarios", ...puedeGestionar, sacramentoController.listarHorarios);
router.post("/horarios", ...puedeGestionar, sacramentoController.crearHorario);
router.patch("/horarios/:id/activar", ...puedeGestionar, sacramentoController.activarHorario);
router.patch("/horarios/:id/desactivar", ...puedeGestionar, sacramentoController.desactivarHorario);
router.delete("/horarios/:id", ...puedeGestionar, sacramentoController.eliminarHorario);

router.post(
  "/solicitudes",
  requiereAutenticacion,
  subirDocumentos,
  verificarDocumentos,
  sacramentoController.crearSolicitud
);
router.get("/solicitudes/mias", requiereAutenticacion, sacramentoController.misSolicitudes);
router.get("/solicitudes", ...puedeGestionar, sacramentoController.listarSolicitudes);
router.patch("/solicitudes/:id/estado", ...puedeGestionar, sacramentoController.cambiarEstadoSolicitud);
router.patch(
  "/solicitudes/:id/documentos",
  requiereAutenticacion,
  subirDocumentos,
  verificarDocumentos,
  sacramentoController.corregirDocumentos
);
router.patch("/solicitudes/:id/cancelar", requiereAutenticacion, sacramentoController.cancelarSolicitud);

export default router;
