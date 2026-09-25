import { Router } from "express";
import * as usuarioController from "../controllers/usuario.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";

const router = Router();

const soloAdmin = [requiereAutenticacion, requiereRol("ADMINISTRADOR")];

router.get("/", ...soloAdmin, usuarioController.listar);
router.post("/", ...soloAdmin, usuarioController.crear);
router.patch("/:id/rol", ...soloAdmin, usuarioController.actualizarRol);
router.patch("/:id/password", ...soloAdmin, usuarioController.cambiarPassword);

export default router;
