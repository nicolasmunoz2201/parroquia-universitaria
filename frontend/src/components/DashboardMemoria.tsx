import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  actualizarHito,
  agregarTestimonio,
  crearHito,
  eliminarHito,
  eliminarTestimonio,
  listarHitos,
} from "../services/memoria.service";
import type { Hito, Testimonio } from "../services/memoria.service";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/toast";
import { formatearFecha, hoyParaInput } from "../utils/fechas";
import { MAX_FOTOS_POR_HITO } from "../constants/archivos";
import {
  FECHA_MINIMA_HITO,
  LARGO_MAXIMO_AUTOR_TESTIMONIO,
  LARGO_MAXIMO_DESCRIPCION_HITO,
  LARGO_MAXIMO_TESTIMONIO,
  LARGO_MAXIMO_TITULO_HITO,
} from "../constants/memoria";
import ConfirmarAccion from "./ConfirmarAccion";
import SelectorFotos from "./SelectorFotos";
import type { FotoActual, FotoNueva } from "./SelectorFotos";

const SIN_HITOS: Hito[] = [];

function PanelTestimonios({ hito, onCambio }: { hito: Hito; onCambio: () => Promise<void> }) {
  const { mostrarToast } = useToast();
  const [autorNombre, setAutorNombre] = useState("");
  const [contenido, setContenido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Testimonio | null>(null);

  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await agregarTestimonio(hito.id, { autorNombre: autorNombre.trim(), contenido: contenido.trim() });
      setAutorNombre("");
      setContenido("");
      mostrarToast("Testimonio agregado");
      await onCambio();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo guardar el testimonio", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(testimonio: Testimonio) {
    try {
      await eliminarTestimonio(testimonio.id);
      mostrarToast("Testimonio eliminado");
      await onCambio();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar el testimonio", "error");
    }
  }

  return (
    <div className="panel-inscritos panel-testimonios">
      {hito.testimonios.length === 0 && <p className="dialogo-ayuda">Este hito todavía no tiene testimonios.</p>}
      <ul className="lista-inscritos">
        {hito.testimonios.map((testimonio) => (
          <li key={testimonio.id}>
            <div className="fila-solicitud-info">
              <strong>{testimonio.autorNombre}</strong>
              <span>{testimonio.contenido}</span>
            </div>
            <button type="button" className="boton boton-peligro-borde boton-chico" onClick={() => setPorEliminar(testimonio)}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      <form className="formulario-testimonio" onSubmit={handleAgregar}>
        <label htmlFor={`autor-${hito.id}`}>Quién da el testimonio</label>
        <input
          id={`autor-${hito.id}`}
          value={autorNombre}
          maxLength={LARGO_MAXIMO_AUTOR_TESTIMONIO}
          onChange={(e) => setAutorNombre(e.target.value)}
          placeholder="Ej: María González, catequista desde 1980"
          required
        />
        <label htmlFor={`testimonio-${hito.id}`}>Testimonio</label>
        <textarea
          id={`testimonio-${hito.id}`}
          value={contenido}
          maxLength={LARGO_MAXIMO_TESTIMONIO}
          onChange={(e) => setContenido(e.target.value)}
          required
        />
        <button type="submit" className="boton boton-principal boton-chico" disabled={guardando}>
          {guardando ? "Guardando..." : "Agregar testimonio"}
        </button>
      </form>

      {porEliminar && (
        <ConfirmarAccion
          titulo="Eliminar testimonio"
          mensaje={`¿Eliminar el testimonio de ${porEliminar.autorNombre}?`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => {
            const testimonio = porEliminar;
            setPorEliminar(null);
            handleEliminar(testimonio);
          }}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </div>
  );
}

export default function DashboardMemoria() {
  const { mostrarToast } = useToast();
  const { datos: hitos, cargando, error: errorCarga, recargar } = useCarga(listarHitos, SIN_HITOS, "No se pudo cargar la memoria histórica");

  const [editando, setEditando] = useState<Hito | null>(null);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotosActuales, setFotosActuales] = useState<FotoActual[]>([]);
  const [fotosNuevas, setFotosNuevas] = useState<FotoNueva[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState("");
  const [porEliminar, setPorEliminar] = useState<Hito | null>(null);
  const fotosNuevasRef = useRef<FotoNueva[]>([]);

  useEffect(() => {
    fotosNuevasRef.current = fotosNuevas;
  }, [fotosNuevas]);

  useEffect(() => () => fotosNuevasRef.current.forEach((foto) => URL.revokeObjectURL(foto.vistaPrevia)), []);

  function limpiar() {
    fotosNuevas.forEach((foto) => URL.revokeObjectURL(foto.vistaPrevia));
    setFotosNuevas([]);
    setFotosActuales([]);
    setEditando(null);
    setTitulo("");
    setFecha("");
    setDescripcion("");
    setError("");
  }

  function handleEditar(hito: Hito) {
    limpiar();
    setEditando(hito);
    setTitulo(hito.titulo);
    setFecha(hito.fecha.slice(0, 10));
    setDescripcion(hito.descripcion);
    setFotosActuales(hito.fotos);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (fecha > hoyParaInput()) {
      setError("Un hito histórico no puede tener una fecha futura");
      return;
    }

    const datos = new FormData();
    datos.append("titulo", titulo.trim());
    datos.append("fecha", fecha);
    datos.append("descripcion", descripcion.trim());
    if (editando) {
      datos.append("fotosConservar", JSON.stringify(fotosActuales.map((foto) => foto.id)));
    }
    fotosNuevas.forEach((foto) => datos.append("fotos", foto.archivo));

    setGuardando(true);
    try {
      if (editando) {
        await actualizarHito(editando.id, datos);
        mostrarToast("Hito actualizado");
      } else {
        await crearHito(datos);
        mostrarToast("Hito agregado a la línea de tiempo");
      }
      limpiar();
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el hito");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(hito: Hito) {
    try {
      await eliminarHito(hito.id);
      if (editando?.id === hito.id) limpiar();
      mostrarToast("Hito eliminado");
      await recargar();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar el hito", "error");
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Gestionar memoria histórica</h1>

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>{editando ? "Editar hito" : "Nuevo hito"}</h2>

        <label htmlFor="tituloHito">Título</label>
        <input
          id="tituloHito"
          value={titulo}
          maxLength={LARGO_MAXIMO_TITULO_HITO}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Inauguración del templo parroquial"
          required
        />

        <label htmlFor="fechaHito">Fecha</label>
        <input
          id="fechaHito"
          type="date"
          value={fecha}
          min={FECHA_MINIMA_HITO}
          max={hoyParaInput()}
          onChange={(e) => setFecha(e.target.value)}
          required
        />

        <label htmlFor="descripcionHito">Descripción</label>
        <textarea
          id="descripcionHito"
          value={descripcion}
          maxLength={LARGO_MAXIMO_DESCRIPCION_HITO}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />

        <label htmlFor="fotosHito">Fotos</label>
        {editando && (
          <p className="imagenes-actuales-hint">
            Quita con la × las fotos que no quieras y agrega las nuevas. Se guarda exactamente lo que ves aquí.
          </p>
        )}
        <SelectorFotos
          id="fotosHito"
          maximo={MAX_FOTOS_POR_HITO}
          actuales={fotosActuales}
          nuevas={fotosNuevas}
          onQuitarActual={(id) => setFotosActuales(fotosActuales.filter((foto) => foto.id !== id))}
          onCambiarNuevas={setFotosNuevas}
          onError={setError}
        />

        {error && <p className="login-error">{error}</p>}

        <div className="acciones-formulario">
          <button type="submit" className="boton boton-principal boton-formulario" disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Agregar hito"}
          </button>
          {editando && (
            <button type="button" className="boton boton-secundario boton-formulario" onClick={limpiar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {errorCarga && <p className="login-error">{errorCarga}</p>}

      <ul className="publicaciones-lista">
        {cargando && hitos.length === 0 && <li>Cargando hitos...</li>}
        {hitos.map((hito) => (
          <li key={hito.id} className="fila-actividad fila-hito">
            <div className="fila-solicitud-info">
              <strong>{hito.titulo}</strong>
              <span>
                {formatearFecha(hito.fecha)} · {hito.fotos.length} foto(s) · {hito.testimonios.length} testimonio(s)
              </span>
            </div>
            <span className="acciones-organismo">
              <button
                type="button"
                className="boton boton-secundario boton-chico"
                aria-expanded={abierto === hito.id}
                onClick={() => setAbierto(abierto === hito.id ? "" : hito.id)}
              >
                Testimonios
              </button>
              <button type="button" className="boton boton-secundario boton-chico" onClick={() => handleEditar(hito)}>
                Editar
              </button>
              <button type="button" className="boton boton-peligro-borde boton-chico" onClick={() => setPorEliminar(hito)}>
                Eliminar
              </button>
            </span>
            {abierto === hito.id && <PanelTestimonios hito={hito} onCambio={recargar} />}
          </li>
        ))}
        {!cargando && hitos.length === 0 && <li>Todavía no hay hitos. Agrega el primero con el formulario.</li>}
      </ul>

      {porEliminar && (
        <ConfirmarAccion
          titulo="Eliminar hito"
          mensaje={`¿Eliminar "${porEliminar.titulo}" junto con sus fotos y testimonios? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => {
            const hito = porEliminar;
            setPorEliminar(null);
            handleEliminar(hito);
          }}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </div>
  );
}
