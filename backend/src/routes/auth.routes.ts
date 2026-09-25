import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requiereAutenticacion } from "../middlewares/auth.middleware";
import { limiteLogin, limiteRegistro } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/login", limiteLogin, authController.login);
router.post("/registro", limiteRegistro, authController.registro);
router.get("/me", requiereAutenticacion, authController.me);

export default router;
