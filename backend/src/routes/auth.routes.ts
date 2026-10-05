import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import {
  limiteCambioPassword,
  limiteLogin,
  limiteRegistro,
} from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/login", limiteLogin, authController.login);
router.post("/registro", limiteRegistro, authController.registro);
router.get("/me", requiereAutenticacion, authController.me);
router.patch(
  "/password",
  requiereAutenticacion,
  requiereRol("ADMINISTRADOR"),
  limiteCambioPassword,
  authController.cambiarPassword
);

export default router;
