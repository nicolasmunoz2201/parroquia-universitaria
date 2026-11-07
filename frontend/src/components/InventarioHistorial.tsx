import { useCallback, useState } from "react";
import { listarInsumos, listarMovimientos } from "../services/inventario.service";
import type { FiltrosMovimientos, Insumo, Movimiento } from "../services/inventario.service";
import { ETIQUETAS_MOTIVO, SIMBOLO_UNIDAD } from "../constants/inventario";
import type { TipoMovimiento } from "../constants/inventario";
import { useCarga } from "../hooks/useCarga";
import { hoyParaInput } from "../utils/fechas";
import {
  descargarCsv,
  formatearCantidad,
  formatearFechaCorta,
  formatearFechaMovimiento,
} from "../utils/inventario";

const SIN_INSUMOS: Insumo[] = [];
const SIN_MOVIMIENTOS: Movimiento[] = [];

export default function InventarioHistorial() {
  const [filtros, setFiltros] = useState<FiltrosMovimientos>({});
  const { datos: insumos } = useCarga(listarInsumos, SIN_INSUMOS, "No se pudieron cargar los insumos");
  const cargar = useCallback(() => listarMovimientos(filtros), [filtros]);
  const { datos: movimientos, cargando, error } = useCarga(cargar, SIN_MOVIMIENTOS, "No se pudo cargar el historial");

  function cambiarFiltro(campo: keyof FiltrosMovimientos, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor || undefined }));
  }

  function exportar() {
    descargarCsv(`movimientos-inventario-${hoyParaInput()}.csv`, [
      ["Fecha", "Insumo", "Categoría", "Tipo", "Motivo", "Cantidad", "Unidad", "Donante", "Vencimiento", "Registrado por", "Observación"],
      ...movimientos.map((movimiento) => [
        formatearFechaMovimiento(movimiento.createdAt),
        movimiento.insumo.nombre,
        movimiento.insumo.categoria,
        movimiento.tipo === "ENTRADA" ? "Entrada" : "Salida",
        ETIQUETAS_MOTIVO[movimiento.motivo],
        String(movimiento.cantidad).replace(".", ","),
        SIMBOLO_UNIDAD[movimiento.insumo.unidad],
        movimiento.lote?.donante?.nombre ?? "",
        movimiento.lote?.fechaVencimiento ? formatearFechaCorta(movimiento.lote.fechaVencimiento) : "",
        movimiento.usuario.nombre,
        movimiento.observacion ?? "",
      ]),
    ]);
  }

  return (
    <>
      <div className="filtros-inventario filtros-historial">
        <label>
          Insumo
          <select value={filtros.insumoId ?? ""} onChange={(e) => cambiarFiltro("insumoId", e.target.value)}>
            <option value="">Todos</option>
            {insumos.map((insumo) => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            value={filtros.tipo ?? ""}
            onChange={(e) => cambiarFiltro("tipo", e.target.value as TipoMovimiento | "")}
          >
            <option value="">Entradas y salidas</option>
            <option value="ENTRADA">Solo entradas</option>
            <option value="SALIDA">Solo salidas</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filtros.desde ?? ""} max={filtros.hasta} onChange={(e) => cambiarFiltro("desde", e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filtros.hasta ?? ""} min={filtros.desde} onChange={(e) => cambiarFiltro("hasta", e.target.value)} />
        </label>
      </div>

      <div className="barra-historial">
        <span>
          {cargando ? "Cargando..." : `${movimientos.length} ${movimientos.length === 1 ? "movimiento" : "movimientos"}`}
        </span>
        <button
          type="button"
          className="boton boton-secundario boton-chico"
          onClick={exportar}
          disabled={cargando || movimientos.length === 0}
        >
          Exportar a Excel (CSV)
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          movimientos.map((movimiento) => (
            <li key={movimiento.id} className="fila-solicitud">
              <div className="fila-solicitud-info">
                <strong>
                  {movimiento.tipo === "ENTRADA" ? "+" : "−"}
                  {formatearCantidad(movimiento.cantidad, movimiento.insumo.unidad)} · {movimiento.insumo.nombre}
                </strong>
                <span>
                  {formatearFechaMovimiento(movimiento.createdAt)} · Registrado por {movimiento.usuario.nombre}
                </span>
                {(movimiento.lote?.donante || movimiento.lote?.fechaVencimiento) && (
                  <span>
                    {movimiento.lote.donante ? `Donante: ${movimiento.lote.donante.nombre}` : ""}
                    {movimiento.lote.donante && movimiento.lote.fechaVencimiento ? " · " : ""}
                    {movimiento.lote.fechaVencimiento
                      ? `Vence: ${formatearFechaCorta(movimiento.lote.fechaVencimiento)}`
                      : ""}
                  </span>
                )}
                {movimiento.observacion && <span>{movimiento.observacion}</span>}
              </div>
              <div className="fila-solicitud-acciones">
                <span
                  className={`estado-solicitud ${movimiento.tipo === "ENTRADA" ? "estado-aprobada" : "estado-observada"}`}
                >
                  {ETIQUETAS_MOTIVO[movimiento.motivo]}
                </span>
              </div>
            </li>
          ))}
        {!cargando && movimientos.length === 0 && <li>No hay movimientos con estos filtros.</li>}
      </ul>
    </>
  );
}
