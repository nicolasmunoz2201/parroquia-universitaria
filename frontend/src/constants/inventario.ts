import type { Rol } from "../services/usuario.service";

export type UnidadMedida = "KILOGRAMO" | "LITRO" | "UNIDAD" | "PAQUETE";
export type TipoMovimiento = "ENTRADA" | "SALIDA";
export type MotivoMovimiento = "DONACION" | "COMPRA" | "CONSUMO" | "MERMA" | "VENCIMIENTO" | "CONTEO_FISICO";
export type EstadoStock = "SIN_STOCK" | "BAJO_MINIMO" | "SUFICIENTE";
export type TipoRegistro = "ENTRADA" | "SALIDA" | "CONTEO";

export const ROLES_INVENTARIO: Rol[] = ["ADMINISTRADOR", "ENCARGADO_COMEDOR"];

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

export const UNIDADES: UnidadMedida[] = ["KILOGRAMO", "LITRO", "UNIDAD", "PAQUETE"];

export const ETIQUETAS_UNIDAD: Record<UnidadMedida, string> = {
  KILOGRAMO: "Kilogramos (kg)",
  LITRO: "Litros (L)",
  UNIDAD: "Unidades",
  PAQUETE: "Paquetes",
};

export const SIMBOLO_UNIDAD: Record<UnidadMedida, string> = {
  KILOGRAMO: "kg",
  LITRO: "L",
  UNIDAD: "u.",
  PAQUETE: "paq.",
};

export const UNIDADES_ENTERAS: UnidadMedida[] = ["UNIDAD", "PAQUETE"];

export const ETIQUETAS_MOTIVO: Record<MotivoMovimiento, string> = {
  DONACION: "Donación",
  COMPRA: "Compra",
  CONSUMO: "Consumo",
  MERMA: "Merma",
  VENCIMIENTO: "Vencimiento",
  CONTEO_FISICO: "Conteo físico",
};

export const MOTIVOS_ENTRADA: MotivoMovimiento[] = ["DONACION", "COMPRA"];
export const MOTIVOS_SALIDA: MotivoMovimiento[] = ["CONSUMO", "MERMA", "VENCIMIENTO"];
export const MOTIVOS_CON_OBSERVACION: MotivoMovimiento[] = ["MERMA", "VENCIMIENTO"];

export const ETIQUETAS_ESTADO_STOCK: Record<EstadoStock, string> = {
  SIN_STOCK: "Sin stock",
  BAJO_MINIMO: "Bajo el mínimo",
  SUFICIENTE: "Suficiente",
};

export const ETIQUETAS_TIPO_REGISTRO: Record<TipoRegistro, { titulo: string; detalle: string }> = {
  ENTRADA: { titulo: "Entrada", detalle: "Donación o compra" },
  SALIDA: { titulo: "Salida", detalle: "Consumo, merma o vencimiento" },
  CONTEO: { titulo: "Conteo físico", detalle: "Ajustar al stock real" },
};

export const DIAS_AVISO_VENCIMIENTO = 7;
export const MAX_CANTIDAD_INVENTARIO = 100000;
