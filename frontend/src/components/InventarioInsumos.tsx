import { useState } from "react";
import type { FormEvent } from "react";
import {
  actualizarInsumo,
  cambiarEstadoInsumo,
  crearInsumo,
  eliminarInsumo,
  listarInsumos,
  obtenerAlertas,
} from "../services/inventario.service";
import type { Alertas, Insumo } from "../services/inventario.service";
import {
  CATEGORIAS_INSUMO,
  ETIQUETAS_ESTADO_STOCK,
  ETIQUETAS_UNIDAD,
  MAX_CANTIDAD_INVENTARIO,
  UNIDADES,
} from "../constants/inventario";
import type { UnidadMedida } from "../constants/inventario";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/toast";
import { formatearCantidad, formatearFechaCorta, pasoCantidad, textoDiasParaVencer } from "../utils/inventario";
import ConfirmarAccion from "./ConfirmarAccion";

const SIN_INSUMOS: Insumo[] = [];
const SIN_ALERTAS: Alertas = { bajoMinimo: [], porVencer: [] };

type FiltroEstado = "activos" | "alerta" | "inactivos" | "todos";

const CLASE_ESTADO = {
  SIN_STOCK: "estado-rechazada",
  BAJO_MINIMO: "estado-pendiente",
  SUFICIENTE: "estado-aprobada",
};

function AlertasInventario({ alertas }: { alertas: Alertas }) {
  if (alertas.bajoMinimo.length === 0 && alertas.porVencer.length === 0) return null;
  return (
    <section className="alertas-inventario" aria-label="Alertas del inventario">
      {alertas.bajoMinimo.length > 0 && (
        <div className="alerta-inventario alerta-stock">
          <strong>
            {alertas.bajoMinimo.length === 1
              ? "1 insumo bajo el stock mínimo"
              : `${alertas.bajoMinimo.length} insumos bajo el stock mínimo`}
          </strong>
          <ul>
            {alertas.bajoMinimo.map((insumo) => (
              <li key={insumo.id}>
                {insumo.nombre}: quedan {formatearCantidad(insumo.stock, insumo.unidad)} de un mínimo de{" "}
                {formatearCantidad(insumo.stockMinimo, insumo.unidad)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {alertas.porVencer.length > 0 && (
        <div className="alerta-inventario alerta-vencimiento">
          <strong>
            {alertas.porVencer.length === 1
              ? "1 lote vencido o por vencer"
              : `${alertas.porVencer.length} lotes vencidos o por vencer`}
          </strong>
          <ul>
            {alertas.porVencer.map((lote) => (
              <li key={lote.id}>
                {lote.insumo.nombre}: {formatearCantidad(lote.cantidadDisponible, lote.insumo.unidad)},{" "}
                {textoDiasParaVencer(lote.diasParaVencer)} ({formatearFechaCorta(lote.fechaVencimiento)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function InventarioInsumos() {
  const { mostrarToast } = useToast();
  const { datos: insumos, cargando, error: errorCarga, recargar } = useCarga(
    listarInsumos,
    SIN_INSUMOS,
    "No se pudieron cargar los insumos"
  );
  const { datos: alertas, recargar: recargarAlertas } = useCarga(
    obtenerAlertas,
    SIN_ALERTAS,
    "No se pudieron cargar las alertas"
  );

  const [editando, setEditando] = useState<Insumo | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_INSUMO[0] ?? "");
  const [unidad, setUnidad] = useState<UnidadMedida>("KILOGRAMO");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("activos");
  const [porEliminar, setPorEliminar] = useState<Insumo | null>(null);

  const texto = busqueda.trim().toLowerCase();
  const insumosFiltrados = insumos.filter((insumo) => {
    if (texto && !insumo.nombre.toLowerCase().includes(texto)) return false;
    if (filtroCategoria && insumo.categoria !== filtroCategoria) return false;
    if (filtroEstado === "activos") return insumo.activo;
    if (filtroEstado === "inactivos") return !insumo.activo;
    if (filtroEstado === "alerta") return insumo.activo && insumo.estado !== "SUFICIENTE";
    return true;
  });

  function limpiarFormulario() {
    setEditando(null);
    setNombre("");
    setCategoria(CATEGORIAS_INSUMO[0] ?? "");
    setUnidad("KILOGRAMO");
    setStockMinimo("0");
    setError("");
  }

  function handleEditar(insumo: Insumo) {
    setEditando(insumo);
    setNombre(insumo.nombre);
    setCategoria(insumo.categoria);
    setUnidad(insumo.unidad);
    setStockMinimo(String(insumo.stockMinimo));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function recargarTodo() {
    await Promise.all([recargar(), recargarAlertas()]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("Escribe el nombre del insumo");
      return;
    }
    const minimo = Number(stockMinimo);
    if (!Number.isFinite(minimo) || minimo < 0) {
      setError("El stock mínimo debe ser un número igual o mayor que cero");
      return;
    }

    setGuardando(true);
    const datos = { nombre: nombre.trim(), categoria, unidad, stockMinimo: minimo };
    try {
      if (editando) {
        await actualizarInsumo(editando.id, datos);
        mostrarToast("Insumo actualizado");
      } else {
        await crearInsumo(datos);
        mostrarToast("Insumo creado. Ya puedes registrar sus entradas.");
      }
      limpiarFormulario();
      await recargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el insumo");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstado(insumo: Insumo) {
    try {
      await cambiarEstadoInsumo(insumo.id, !insumo.activo);
      mostrarToast(insumo.activo ? "Insumo desactivado" : "Insumo activado");
      await recargarTodo();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo actualizar el insumo", "error");
    }
  }

  async function handleEliminar() {
    if (!porEliminar) return;
    const insumo = porEliminar;
    setPorEliminar(null);
    try {
      await eliminarInsumo(insumo.id);
      mostrarToast("Insumo eliminado");
      if (editando?.id === insumo.id) limpiarFormulario();
      await recargarTodo();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar el insumo", "error");
    }
  }

  return (
    <>
      <AlertasInventario alertas={alertas} />

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>{editando ? "Editar insumo" : "Nuevo insumo"}</h2>

        <label htmlFor="nombreInsumo">Nombre</label>
        <input
          id="nombreInsumo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Arroz grado 2"
          required
        />

        <div className="campos-fecha-hora">
          <div className="campo-fecha-hora">
            <label htmlFor="categoriaInsumo">Categoría</label>
            <select id="categoriaInsumo" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_INSUMO.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>
          <div className="campo-fecha-hora">
            <label htmlFor="unidadInsumo">Unidad de medida</label>
            <select
              id="unidadInsumo"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as UnidadMedida)}
            >
              {UNIDADES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {ETIQUETAS_UNIDAD[opcion]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="minimoInsumo">Stock mínimo</label>
        <input
          id="minimoInsumo"
          type="number"
          min={0}
          max={MAX_CANTIDAD_INVENTARIO}
          step={pasoCantidad(unidad)}
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
        />
        <p className="dialogo-ayuda">Cuando el stock baje de esta cantidad, el insumo aparecerá en las alertas.</p>

        {error && <p className="login-error">{error}</p>}

        <div className="acciones-formulario">
          <button type="submit" className="boton boton-principal boton-formulario" disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear insumo"}
          </button>
          {editando && (
            <button type="button" className="boton boton-secundario boton-formulario" onClick={limpiarFormulario}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="buscador">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Buscar insumo por nombre"
          aria-label="Buscar insumos"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="filtros-inventario">
        <label>
          Categoría
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS_INSUMO.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mostrar
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}>
            <option value="activos">Insumos activos</option>
            <option value="alerta">Bajo el mínimo o sin stock</option>
            <option value="inactivos">Insumos desactivados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
      </div>

      {errorCarga && <p className="login-error">{errorCarga}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          insumosFiltrados.map((insumo) => (
            <li key={insumo.id} className="fila-solicitud">
              <div className="fila-solicitud-info">
                <strong>{insumo.nombre}</strong>
                <span>
                  {insumo.categoria} · Stock: {formatearCantidad(insumo.stock, insumo.unidad)} · Mínimo:{" "}
                  {formatearCantidad(insumo.stockMinimo, insumo.unidad)}
                </span>
                {insumo.proximoVencimiento && (
                  <span>Próximo vencimiento: {formatearFechaCorta(insumo.proximoVencimiento)}</span>
                )}
              </div>
              <div className="fila-solicitud-acciones">
                <span
                  className={`estado-solicitud ${insumo.activo ? CLASE_ESTADO[insumo.estado] : "estado-cancelada"}`}
                >
                  {insumo.activo ? ETIQUETAS_ESTADO_STOCK[insumo.estado] : "Desactivado"}
                </span>
                <button type="button" className="boton boton-secundario boton-chico" onClick={() => handleEditar(insumo)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="boton boton-secundario boton-chico"
                  onClick={() => handleCambiarEstado(insumo)}
                >
                  {insumo.activo ? "Desactivar" : "Activar"}
                </button>
                {!insumo.tieneMovimientos && (
                  <button
                    type="button"
                    className="boton boton-peligro-borde boton-chico"
                    onClick={() => setPorEliminar(insumo)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        {!cargando && insumosFiltrados.length === 0 && (
          <li>
            {insumos.length === 0
              ? "Todavía no hay insumos. Crea el primero con el formulario de arriba."
              : "No hay insumos que coincidan con los filtros."}
          </li>
        )}
      </ul>

      {porEliminar && (
        <ConfirmarAccion
          titulo="Eliminar insumo"
          mensaje={`¿Eliminar "${porEliminar.nombre}"? Todavía no tiene movimientos, así que se borrará por completo.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={handleEliminar}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </>
  );
}
