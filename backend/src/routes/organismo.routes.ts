import { Router } from "express";
import * as organismoController from "../controllers/organismo.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";

const router = Router();

const soloAdmin = [requiereAutenticacion, requiereRol("ADMINISTRADOR")];

router.get("/", organismoController.listar);
router.get("/:id", organismoController.obtener);
router.post("/", ...soloAdmin, organismoController.crear);
router.put("/:id", ...soloAdmin, organismoController.actualizar);
router.patch("/:id/desactivar", ...soloAdmin, organismoController.desactivar);
router.patch("/:id/activar", ...soloAdmin, organismoController.activar);
router.delete("/:id", ...soloAdmin, organismoController.eliminar);

export default router;
