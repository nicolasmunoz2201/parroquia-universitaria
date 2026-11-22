import { Router } from "express";
import * as memoriaController from "../controllers/memoria.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { uploadImagen, verificarImagenes } from "../middlewares/upload.middleware";
import { MAX_FOTOS_POR_HITO } from "../constants/archivos";

const router = Router();

const soloAdmin = [requiereAutenticacion, requiereRol("ADMINISTRADOR")];
const subirFotos = [uploadImagen.array("fotos", MAX_FOTOS_POR_HITO), verificarImagenes];

router.get("/hitos", memoriaController.listar);
router.post("/hitos", ...soloAdmin, ...subirFotos, memoriaController.crear);
router.put("/hitos/:id", ...soloAdmin, ...subirFotos, memoriaController.actualizar);
router.delete("/hitos/:id", ...soloAdmin, memoriaController.eliminar);
router.post("/hitos/:id/testimonios", ...soloAdmin, memoriaController.agregarTestimonio);
router.delete("/testimonios/:id", ...soloAdmin, memoriaController.eliminarTestimonio);

export default router;
