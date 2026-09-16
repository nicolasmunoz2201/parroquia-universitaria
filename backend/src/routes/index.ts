import { Router } from "express";
import healthRoutes from "./health.routes";
import organismoRoutes from "./organismo.routes";
import authRoutes from "./auth.routes";
import publicacionRoutes from "./publicacion.routes";

const router = Router();

router.use("/api", healthRoutes);
router.use("/api/organismos", organismoRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/publicaciones", publicacionRoutes);

export default router;
