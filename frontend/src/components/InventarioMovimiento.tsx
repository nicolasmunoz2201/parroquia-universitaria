import { useState } from "react";
import type { FormEvent } from "react";
import {
  listarDonantes,
  listarInsumos,
  registrarConteo,
  registrarEntrada,
  registrarSalida,
} from "../services/inventario.service";
import type { Donante, Insumo } from "../services/inventario.service";
import {
  ETIQUETAS_MOTIVO,
  ETIQUETAS_TIPO_REGISTRO,
  MAX_CANTIDAD_INVENTARIO,
  MOTIVOS_CON_OBSERVACION,
  MOTIVOS_ENTRADA,
  MOTIVOS_SALIDA,
  SIMBOLO_UNIDAD,
} from "../constants/inventario";
import type { MotivoMovimiento, TipoRegistro } from "../constants/inventario";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/toast";
import { hoyParaInput } from "../utils/fechas";
import { formatearCantidad, pasoCantidad, redondearCantidad } from "../utils/inventario";
import ConfirmarAccion from "./ConfirmarAccion";

const SIN_INSUMOS: Insumo[] = [];
const SIN_DONANTES: Donante[] = [];
const TIPOS_REGISTRO: TipoRegistro[] = ["ENTRADA", "SALIDA", "CONTEO"];

function motivosDe(tipo: TipoRegistro) {
  return tipo === "ENTRADA" ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;
}

export default function InventarioMovimiento() {
  const { mostrarToast } = useToast();
  const { datos: insumos, cargando, recargar } = useCarga(listarInsumos, SIN_INSUMOS, "No se pudieron cargar los insumos");
  const { datos: donantes, recargar: recargarDonantes } = useCarga(
    listarDonantes,
    SIN_DONANTES,
    "No se pudieron cargar los donantes"
  );

  const [tipo, setTipo] = useState<TipoRegistro>("ENTRADA");
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState<MotivoMovimiento>("DONACION");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [donante, setDonante] = useState("");
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const activos = insumos.filter((insumo) => insumo.activo);
  const insumo = activos.find((item) => item.id === insumoId);
  const valor = Number(cantidad);
  const cantidadValida = cantidad !== "" && Number.isFinite(valor) && (tipo === "CONTEO" ? valor >= 0 : valor > 0);
  const stockResultante =
    insumo && cantidadValida
      ? tipo === "ENTRADA"
        ? redondearCantidad(insumo.stock + valor)
        : tipo === "SALIDA"
          ? redondearCantidad(insumo.stock - valor)
          : valor
      : null;
  const pideObservacion = tipo !== "CONTEO" && MOTIVOS_CON_OBSERVACION.includes(motivo);

  function cambiarTipo(nuevoTipo: TipoRegistro) {
    setTipo(nuevoTipo);
    setMotivo(motivosDe(nuevoTipo)[0] ?? "CONSUMO");
    setError("");
  }

  function limpiar() {
    setCantidad("");
    setFechaVencimiento("");
    setDonante("");
    setObservacion("");
    setError("");
  }

  function textoConfirmacion() {
    if (!insumo) return "";
    const cantidadTexto = formatearCantidad(valor, insumo.unidad);
    if (tipo === "CONTEO") {
      return `¿Ajustar el stock de "${insumo.nombre}" a ${cantidadTexto}? Hoy el sistema registra ${formatearCantidad(insumo.stock, insumo.unidad)}.`;
    }
    const accion = tipo === "ENTRADA" ? "Registrar la entrada" : "Registrar la salida";
    return `¿${accion} de ${cantidadTexto} de "${insumo.nombre}" por ${ETIQUETAS_MOTIVO[motivo].toLowerCase()}?`;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!insumo) {
      setError("Selecciona un insumo");
      return;
    }
    if (!cantidadValida) {
      setError(tipo === "CONTEO" ? "Ingresa la cantidad que contaste" : "Ingresa una cantidad mayor que cero");
      return;
    }
    if (tipo === "SALIDA" && valor > insumo.stock) {
      setError(`No hay stock suficiente: quedan ${formatearCantidad(insumo.stock, insumo.unidad)}`);
      return;
    }
    if (tipo === "CONTEO" && redondearCantidad(valor) === insumo.stock) {
      setError("El conteo coincide con el stock registrado, no hay nada que ajustar");
      return;
    }
    if (pideObservacion && !observacion.trim()) {
      setError("Explica en la observación por qué se perdió el insumo");
      return;
    }
    setConfirmando(true);
  }

  async function enviar() {
    if (!insumo) return;
    setConfirmando(false);
    setEnviando(true);
    try {
      if (tipo === "ENTRADA") {
        await registrarEntrada({
          insumoId: insumo.id,
          cantidad: valor,
          motivo,
          fechaVencimiento,
          donante: motivo === "DONACION" ? donante.trim() : "",
          observacion: observacion.trim(),
        });
        mostrarToast("Entrada registrada");
      } else if (tipo === "SALIDA") {
        await registrarSalida({ insumoId: insumo.id, cantidad: valor, motivo, observacion: observacion.trim() });
        mostrarToast("Salida registrada");
      } else {
        await registrarConteo({ insumoId: insumo.id, cantidadReal: valor, observacion: observacion.trim() });
        mostrarToast("Stock ajustado según el conteo");
      }
      limpiar();
      await Promise.all([recargar(), recargarDonantes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setEnviando(false);
    }
  }

  if (!cargando && activos.length === 0) {
    return (
      <p className="aviso-vacio">
        Todavía no hay insumos activos. Créalos primero en la pestaña <strong>Insumos</strong>.
      </p>
    );
  }

  return (
    <>
      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>Registrar movimiento</h2>

        <fieldset className="tipos-movimiento">
          <legend>Tipo de movimiento</legend>
          {TIPOS_REGISTRO.map((opcion) => (
            <label
              key={opcion}
              className={`opcion-tipo-movimiento ${tipo === opcion ? "opcion-tipo-elegida" : ""}`}
            >
              <input
                type="radio"
                name="tipoMovimiento"
                value={opcion}
                checked={tipo === opcion}
                onChange={() => cambiarTipo(opcion)}
              />
              <span className="opcion-tipo-titulo">{ETIQUETAS_TIPO_REGISTRO[opcion].titulo}</span>
              <span className="opcion-tipo-detalle">{ETIQUETAS_TIPO_REGISTRO[opcion].detalle}</span>
            </label>
          ))}
        </fieldset>

        <label htmlFor="insumoMovimiento">Insumo</label>
        <select id="insumoMovimiento" value={insumoId} onChange={(e) => setInsumoId(e.target.value)} required>
          <option value="">Selecciona un insumo</option>
          {activos.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre} (stock: {formatearCantidad(opcion.stock, opcion.unidad)})
            </option>
          ))}
        </select>

        <div className="campos-fecha-hora">
          <div className="campo-fecha-hora">
            <label htmlFor="cantidadMovimiento">
              {tipo === "CONTEO" ? "Cantidad contada" : "Cantidad"}
              {insumo ? ` en ${SIMBOLO_UNIDAD[insumo.unidad]}` : ""}
            </label>
            <input
              id="cantidadMovimiento"
              type="number"
              min={tipo === "CONTEO" ? 0 : 0.01}
              max={MAX_CANTIDAD_INVENTARIO}
              step={insumo ? pasoCantidad(insumo.unidad) : "0.01"}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>
          {tipo !== "CONTEO" && (
            <div className="campo-fecha-hora">
              <label htmlFor="motivoMovimiento">Motivo</label>
              <select
                id="motivoMovimiento"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoMovimiento)}
              >
                {motivosDe(tipo).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {ETIQUETAS_MOTIVO[opcion]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {stockResultante !== null && insumo && (
          <p className={`vista-previa-horario ${stockResultante < 0 ? "vista-previa-error" : ""}`}>
            Stock actual: {formatearCantidad(insumo.stock, insumo.unidad)} → quedará en{" "}
            {formatearCantidad(Math.max(stockResultante, 0), insumo.unidad)}
            {stockResultante < 0 ? " (no alcanza)" : ""}
          </p>
        )}

        {tipo === "ENTRADA" && (
          <>
            <label htmlFor="vencimientoMovimiento">Fecha de vencimiento (opcional)</label>
            <input
              id="vencimientoMovimiento"
              type="date"
              min={hoyParaInput()}
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
            <p className="dialogo-ayuda">Déjala vacía si el producto no vence, como los artículos de aseo.</p>

            {motivo === "DONACION" && (
              <>
                <label htmlFor="donanteMovimiento">Donante (opcional)</label>
                <input
                  id="donanteMovimiento"
                  list="lista-donantes"
                  value={donante}
                  onChange={(e) => setDonante(e.target.value)}
                  placeholder="Ej: Supermercado del barrio"
                />
                <datalist id="lista-donantes">
                  {donantes.map((item) => (
                    <option key={item.id} value={item.nombre} />
                  ))}
                </datalist>
              </>
            )}
          </>
        )}

        <label htmlFor="observacionMovimiento">
          Observación {pideObservacion ? "(obligatoria)" : "(opcional)"}
        </label>
        <textarea
          id="observacionMovimiento"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder={
            pideObservacion
              ? "Ej: se rompió el envase al descargar"
              : tipo === "CONTEO"
                ? "Ej: conteo semanal del viernes"
                : "Ej: almuerzo del martes"
          }
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="boton boton-principal boton-formulario" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar"}
        </button>
      </form>

      {confirmando && (
        <ConfirmarAccion
          titulo={`Confirmar ${ETIQUETAS_TIPO_REGISTRO[tipo].titulo.toLowerCase()}`}
          mensaje={textoConfirmacion()}
          textoConfirmar="Registrar"
          onConfirmar={enviar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </>
  );
}
