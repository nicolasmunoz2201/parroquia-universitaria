import { MotivoMovimiento, UnidadMedida } from "../generated/prisma/client";

export const ROLES_INVENTARIO = ["ADMINISTRADOR", "ENCARGADO_COMEDOR"];

export const CATEGORIAS_INSUMO = [
  "Abarrotes",
  "Lácteos",
  "Carnes y proteínas",
  "Frutas y verduras",
  "Panadería",
  "Bebidas",
  "Aseo e higiene",
  "Otros",
];

export const MOTIVOS_ENTRADA: MotivoMovimiento[] = [MotivoMovimiento.DONACION, MotivoMovimiento.COMPRA];

export const MOTIVOS_SALIDA: MotivoMovimiento[] = [
  MotivoMovimiento.CONSUMO,
  MotivoMovimiento.MERMA,
  MotivoMovimiento.VENCIMIENTO,
];

export const UNIDADES_ENTERAS: UnidadMedida[] = [UnidadMedida.UNIDAD, UnidadMedida.PAQUETE];

export const ETIQUETAS_UNIDAD: Record<UnidadMedida, string> = {
  KILOGRAMO: "kg",
  LITRO: "L",
  UNIDAD: "unidades",
  PAQUETE: "paquetes",
};

export const DIAS_AVISO_VENCIMIENTO = 7;
export const MAX_CANTIDAD_INVENTARIO = 100000;
export const LARGO_MAXIMO_NOMBRE_INSUMO = 100;
export const LARGO_MAXIMO_OBSERVACION = 500;
export const MESES_REPORTE = 6;
