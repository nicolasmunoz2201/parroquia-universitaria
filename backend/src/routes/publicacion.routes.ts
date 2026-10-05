import { Router } from "express";
import * as publicacionController from "../controllers/publicacion.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { uploadImagen, verificarImagenes } from "../middlewares/upload.middleware";
import { MAX_FOTOS_POR_PUBLICACION } from "../constants/archivos";

const router = Router();

const puedeGestionar = [
  requiereAutenticacion,
  requiereRol("ADMINISTRADOR", "ENCARGADO_ORGANISMO"),
];

router.get("/", publicacionController.listar);
router.post(
  "/",
  ...puedeGestionar,
  uploadImagen.array("imagenes", MAX_FOTOS_POR_PUBLICACION),
  verificarImagenes,
  publicacionController.crear
);
router.put(
  "/:id",
  ...puedeGestionar,
  uploadImagen.array("imagenes", MAX_FOTOS_POR_PUBLICACION),
  verificarImagenes,
  publicacionController.actualizar
);
router.delete("/:id", ...puedeGestionar, publicacionController.eliminar);

export default router;
