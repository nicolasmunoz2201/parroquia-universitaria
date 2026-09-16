import { Router } from "express";
import * as publicacionController from "../controllers/publicacion.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { uploadImagen } from "../middlewares/upload.middleware";

const router = Router();

const puedeGestionar = [
  requiereAutenticacion,
  requiereRol("ADMINISTRADOR", "ENCARGADO_ORGANISMO"),
];

router.get("/", publicacionController.listar);
router.post("/", ...puedeGestionar, uploadImagen.array("imagenes", 3), publicacionController.crear);
router.put(
  "/:id",
  ...puedeGestionar,
  uploadImagen.array("imagenes", 3),
  publicacionController.actualizar
);
router.delete("/:id", ...puedeGestionar, publicacionController.eliminar);

export default router;
