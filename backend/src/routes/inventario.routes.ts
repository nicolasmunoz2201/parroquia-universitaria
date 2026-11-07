import { Router } from "express";
import * as inventarioController from "../controllers/inventario.controller";
import { requiereAutenticacion, requiereRol } from "../middlewares/auth.middleware";
import { ROLES_INVENTARIO } from "../constants/inventario";

const router = Router();

router.use(requiereAutenticacion, requiereRol(...ROLES_INVENTARIO));

router.get("/insumos", inventarioController.listarInsumos);
router.post("/insumos", inventarioController.crearInsumo);
router.put("/insumos/:id", inventarioController.actualizarInsumo);
router.patch("/insumos/:id/activar", inventarioController.activarInsumo);
router.patch("/insumos/:id/desactivar", inventarioController.desactivarInsumo);
router.delete("/insumos/:id", inventarioController.eliminarInsumo);

router.get("/donantes", inventarioController.listarDonantes);

router.get("/movimientos", inventarioController.listarMovimientos);
router.post("/movimientos/entrada", inventarioController.registrarEntrada);
router.post("/movimientos/salida", inventarioController.registrarSalida);
router.post("/movimientos/conteo", inventarioController.registrarConteo);

router.get("/alertas", inventarioController.listarAlertas);
router.get("/reporte", inventarioController.obtenerReporte);

export default router;
