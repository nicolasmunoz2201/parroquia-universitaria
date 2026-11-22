import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requiereAutenticacion } from "../middlewares/auth.middleware";
import {
  limiteCambioPassword,
  limiteLogin,
  limiteRecuperar,
  limiteRegistro,
  limiteRestablecer,
} from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/login", limiteLogin, authController.login);
router.post("/registro", limiteRegistro, authController.registro);
router.post("/recuperar", limiteRecuperar, authController.solicitarRecuperacion);
router.post("/restablecer", limiteRestablecer, authController.restablecerPassword);
router.get("/me", requiereAutenticacion, authController.me);
router.patch("/password", requiereAutenticacion, limiteCambioPassword, authController.cambiarPassword);

export default router;
