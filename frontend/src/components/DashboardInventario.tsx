import { useState } from "react";
import InventarioInsumos from "./InventarioInsumos";
import InventarioMovimiento from "./InventarioMovimiento";
import InventarioHistorial from "./InventarioHistorial";
import InventarioReporte from "./InventarioReporte";

type Pestana = "insumos" | "movimiento" | "historial" | "reporte";

const PESTANAS: { id: Pestana; titulo: string; detalle: string }[] = [
  { id: "insumos", titulo: "Insumos", detalle: "Stock, alertas y productos" },
  { id: "movimiento", titulo: "Registrar", detalle: "Entradas, salidas y conteos" },
  { id: "historial", titulo: "Historial", detalle: "Movimientos y exportación" },
  { id: "reporte", titulo: "Reportes", detalle: "Resumen y gráficos" },
];

export default function DashboardInventario() {
  const [pestana, setPestana] = useState<Pestana>("insumos");

  return (
    <div className="gestion-publicaciones gestion-ancha">
      <h1>Inventario del comedor</h1>
      <div className="pestanas pestanas-cuatro" role="tablist">
        {PESTANAS.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            role="tab"
            aria-selected={pestana === opcion.id}
            className={`pestana ${pestana === opcion.id ? "pestana-activa" : ""}`}
            onClick={() => setPestana(opcion.id)}
          >
            <span className="pestana-titulo">{opcion.titulo}</span>
            <span className="pestana-detalle">{opcion.detalle}</span>
          </button>
        ))}
      </div>

      {pestana === "insumos" && <InventarioInsumos />}
      {pestana === "movimiento" && <InventarioMovimiento />}
      {pestana === "historial" && <InventarioHistorial />}
      {pestana === "reporte" && <InventarioReporte />}
    </div>
  );
}
