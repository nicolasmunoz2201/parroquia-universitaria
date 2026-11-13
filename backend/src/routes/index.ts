import { Router } from "express";
import healthRoutes from "./health.routes";
import organismoRoutes from "./organismo.routes";
import authRoutes from "./auth.routes";
import publicacionRoutes from "./publicacion.routes";
import usuarioRoutes from "./usuario.routes";
import sacramentoRoutes from "./sacramento.routes";
import inventarioRoutes from "./inventario.routes";
import actividadRoutes from "./actividad.routes";

const router = Router();

router.use("/api", healthRoutes);
router.use("/api/organismos", organismoRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/publicaciones", publicacionRoutes);
router.use("/api/usuarios", usuarioRoutes);
router.use("/api/sacramentos", sacramentoRoutes);
router.use("/api/inventario", inventarioRoutes);
router.use("/api/actividades", actividadRoutes);

export default router;
