import { Router } from "express";
import * as organismoController from "../controllers/organismo.controller";

const router = Router();

router.get("/", organismoController.listar);
router.get("/:id", organismoController.obtener);
router.post("/", organismoController.crear);
router.put("/:id", organismoController.actualizar);
router.patch("/:id/desactivar", organismoController.desactivar);
router.patch("/:id/activar", organismoController.activar);
router.delete("/:id", organismoController.eliminar);

export default router;
