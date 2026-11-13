import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  actualizarActividad,
  cancelarActividad,
  crearActividad,
  decidirInscripcion,
  listarActividadesGestion,
  listarInscritos,
  marcarAsistencia,
} from "../services/actividad.service";
import type { Actividad, Inscrito } from "../services/actividad.service";
import type { Usuario } from "../services/auth.service";
import { CLASE_INSCRIPCION, ETIQUETAS_INSCRIPCION, HORAS_MINIMAS_ANTICIPACION, MAX_CUPOS_ACTIVIDAD } from "../constants/actividades";
import { useCarga } from "../hooks/useCarga";
import { useOrganismos } from "../hooks/useOrganismos";
import { useToast } from "../context/toast";
import { esFechaPasada, formatearFechaHora, horasDelDia, hoyParaInput, unirFechaYHora } from "../utils/fechas";
import { inscripcionesAbiertas } from "../utils/actividades";
import ConfirmarAccion from "./ConfirmarAccion";

const SIN_ACTIVIDADES: Actividad[] = [];
const SIN_INSCRITOS: Inscrito[] = [];
const MS_POR_HORA = 60 * 60 * 1000;

type Filtro = "proximas" | "pasadas" | "todas";

function partesFecha(iso: string) {
  const fecha = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, "0");
  return {
    fecha: `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`,
    hora: `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`,
  };
}

function DialogoRechazo({ inscrito, onConfirmar, onCancelar }: { inscrito: Inscrito; onConfirmar: (motivo: string) => void; onCancelar: () => void }) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Escribe el motivo del rechazo");
      return;
    }
    onConfirmar(motivo.trim());
  }

  return (
    <dialog ref={dialogoRef} className="dialogo-confirmacion" onCancel={onCancelar}>
      <h2>Rechazar inscripción</h2>
      <p>{inscrito.usuario.nombre} recibirá este motivo por correo. Su cupo pasará al primero de la lista de espera.</p>
      <form className="dialogo-form" onSubmit={handleSubmit}>
        <label htmlFor="motivoRechazoActividad">Motivo del rechazo</label>
        <textarea
          id="motivoRechazoActividad"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: la actividad es solo para jóvenes en preparación de Confirmación"
        />
        {error && <p className="login-error">{error}</p>}
        <div className="dialogo-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Volver
          </button>
          <button type="submit" className="boton boton-peligro">
            Rechazar
          </button>
        </div>
      </form>
    </dialog>
  );
}

function PanelInscritos({ actividad, onCambio }: { actividad: Actividad; onCambio: () => void }) {
  const { mostrarToast } = useToast();
  const cargar = useCallback(() => listarInscritos(actividad.id), [actividad.id]);
  const { datos: inscritos, cargando, error, recargar } = useCarga(cargar, SIN_INSCRITOS, "No se pudieron cargar los inscritos");
  const [porRechazar, setPorRechazar] = useState<Inscrito | null>(null);
  const comenzo = esFechaPasada(actividad.inicio);

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    try {
      await accion();
      mostrarToast(mensaje);
      await recargar();
      onCambio();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo guardar el cambio", "error");
    }
  }

  const grupos = [
    { titulo: "Pendientes de aprobación", lista: inscritos.filter((i) => i.estado === "PENDIENTE") },
    { titulo: "Aceptadas y confirmadas", lista: inscritos.filter((i) => i.estado === "ACEPTADA" || i.estado === "CONFIRMADA") },
    { titulo: "Lista de espera (por orden de llegada)", lista: inscritos.filter((i) => i.estado === "EN_ESPERA") },
    { titulo: "Rechazadas, canceladas o liberadas", lista: inscritos.filter((i) => ["RECHAZADA", "CANCELADA", "LIBERADA"].includes(i.estado)) },
  ];
  const confirmadas = inscritos.filter((i) => i.estado === "CONFIRMADA");
  const asistieron = confirmadas.filter((i) => i.asistio === true).length;

  if (cargando) return <p className="dialogo-ayuda">Cargando inscritos...</p>;
  if (error) return <p className="login-error">{error}</p>;

  return (
    <div className="panel-inscritos">
      {comenzo && confirmadas.length > 0 && (
        <p className="vista-previa-horario">
          Asistieron {asistieron} de {confirmadas.length} personas confirmadas
          {confirmadas.length > 0 ? ` (${Math.round((asistieron / confirmadas.length) * 100)} %)` : ""}
        </p>
      )}
      {inscritos.length === 0 && <p className="dialogo-ayuda">Todavía no hay inscritos.</p>}
      {grupos
        .filter((grupo) => grupo.lista.length > 0)
        .map((grupo) => (
          <section key={grupo.titulo}>
            <h3 className="titulo-grupo-inscritos">
              {grupo.titulo} ({grupo.lista.length})
            </h3>
            <ul className="lista-inscritos">
              {grupo.lista.map((inscrito, indice) => (
                <li key={inscrito.id}>
                  <div className="fila-solicitud-info">
                    <strong>
                      {inscrito.estado === "EN_ESPERA" ? `${indice + 1}. ` : ""}
                      {inscrito.usuario.nombre}
                    </strong>
                    <span>{inscrito.usuario.email}</span>
                    {inscrito.motivoRechazo && inscrito.estado === "RECHAZADA" && (
                      <span className="fila-solicitud-observacion">Motivo: {inscrito.motivoRechazo}</span>
                    )}
                  </div>
                  <div className="fila-solicitud-acciones">
                    <span className={`estado-solicitud ${CLASE_INSCRIPCION[inscrito.estado]}`}>
                      {ETIQUETAS_INSCRIPCION[inscrito.estado]}
                    </span>
                    {inscrito.estado === "PENDIENTE" && !actividad.cancelada && inscripcionesAbiertas(actividad.inicio) && (
                      <>
                        <button
                          type="button"
                          className="boton boton-principal boton-chico"
                          onClick={() => ejecutar(() => decidirInscripcion(inscrito.id, true), "Inscripción aceptada. Se avisó por correo.")}
                        >
                          Aceptar
                        </button>
                        <button type="button" className="boton boton-peligro-borde boton-chico" onClick={() => setPorRechazar(inscrito)}>
                          Rechazar
                        </button>
                      </>
                    )}
                    {inscrito.estado === "CONFIRMADA" && comenzo && (
                      <>
                        <button
                          type="button"
                          className={`boton boton-chico ${inscrito.asistio === true ? "boton-principal" : "boton-secundario"}`}
                          aria-pressed={inscrito.asistio === true}
                          onClick={() => ejecutar(() => marcarAsistencia(inscrito.id, true), "Asistencia registrada")}
                        >
                          Asistió
                        </button>
                        <button
                          type="button"
                          className={`boton boton-chico ${inscrito.asistio === false ? "boton-peligro" : "boton-secundario"}`}
                          aria-pressed={inscrito.asistio === false}
                          onClick={() => ejecutar(() => marcarAsistencia(inscrito.id, false), "Inasistencia registrada")}
                        >
                          No asistió
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {porRechazar && (
        <DialogoRechazo
          inscrito={porRechazar}
          onCancelar={() => setPorRechazar(null)}
          onConfirmar={(motivo) => {
            const inscrito = porRechazar;
            setPorRechazar(null);
            ejecutar(() => decidirInscripcion(inscrito.id, false, motivo), "Inscripción rechazada. Se avisó por correo.");
          }}
        />
      )}
    </div>
  );
}

export default function DashboardActividades({ usuario }: { usuario: Usuario }) {
  const { mostrarToast } = useToast();
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const { organismos } = useOrganismos({ soloActivos: true });
  const { datos: actividades, cargando, error: errorCarga, recargar } = useCarga(
    listarActividadesGestion,
    SIN_ACTIVIDADES,
    "No se pudieron cargar las actividades"
  );

  const [editando, setEditando] = useState<Actividad | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [cupos, setCupos] = useState("10");
  const [organismoId, setOrganismoId] = useState(usuario.organismoId ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [abierta, setAbierta] = useState("");
  const [porCancelar, setPorCancelar] = useState<Actividad | null>(null);

  const manana = (() => {
    const fechaManana = new Date(`${hoyParaInput()}T12:00`);
    fechaManana.setDate(fechaManana.getDate() + 1);
    return partesFecha(fechaManana.toISOString()).fecha;
  })();

  const visibles = actividades
    .filter((actividad) => {
      const pasada = esFechaPasada(actividad.inicio);
      if (filtro === "proximas") return !pasada;
      if (filtro === "pasadas") return pasada;
      return true;
    })
    .sort((a, b) => {
      const diferencia = new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
      return filtro === "proximas" ? diferencia : -diferencia;
    });

  if (!esAdmin && !usuario.organismoId) {
    return (
      <div className="gestion-publicaciones">
        <h1>Gestionar actividades</h1>
        <p className="aviso-vacio">Tu cuenta no tiene un organismo asignado. Pide al administrador que te asigne uno.</p>
      </div>
    );
  }

  function limpiar() {
    setEditando(null);
    setTitulo("");
    setDescripcion("");
    setFecha("");
    setHora("");
    setLugar("");
    setCupos("10");
    setOrganismoId(usuario.organismoId ?? "");
    setError("");
  }

  function handleEditar(actividad: Actividad) {
    const partes = partesFecha(actividad.inicio);
    setEditando(actividad);
    setTitulo(actividad.titulo);
    setDescripcion(actividad.descripcion);
    setFecha(partes.fecha);
    setHora(partes.hora);
    setLugar(actividad.lugar ?? "");
    setCupos(String(actividad.cupos));
    setOrganismoId(actividad.organismoId);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!fecha || !hora) {
      setError("Elige la fecha y la hora de la actividad");
      return;
    }
    const inicio = unirFechaYHora(fecha, hora);
    const cambiaFecha = !editando || inicio.getTime() !== new Date(editando.inicio).getTime();
    if (cambiaFecha && inicio.getTime() - Date.now() < HORAS_MINIMAS_ANTICIPACION * MS_POR_HORA) {
      setError("La actividad debe ser al menos 24 horas después de ahora, para que alcancen a inscribirse");
      return;
    }
    if (!organismoId) {
      setError("Selecciona el organismo");
      return;
    }

    setGuardando(true);
    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      inicio: inicio.toISOString(),
      lugar: lugar.trim(),
      cupos: Number(cupos),
      organismoId,
    };
    try {
      if (editando) {
        await actualizarActividad(editando.id, datos);
        mostrarToast("Actividad actualizada");
      } else {
        await crearActividad(datos);
        mostrarToast("Actividad publicada. Ya aparece en la página de actividades.");
      }
      limpiar();
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la actividad");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCancelarActividad() {
    if (!porCancelar) return;
    const actividad = porCancelar;
    setPorCancelar(null);
    try {
      const { avisados } = await cancelarActividad(actividad.id);
      mostrarToast(`Actividad cancelada. Se avisó por correo a ${avisados} ${avisados === 1 ? "persona" : "personas"}.`);
      await recargar();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cancelar la actividad", "error");
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Gestionar actividades</h1>

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>{editando ? "Editar actividad" : "Nueva actividad"}</h2>

        {esAdmin && !editando ? (
          <>
            <label htmlFor="organismoActividad">Organismo</label>
            <select id="organismoActividad" value={organismoId} onChange={(e) => setOrganismoId(e.target.value)} required>
              <option value="">Selecciona un organismo</option>
              {organismos.map((organismo) => (
                <option key={organismo.id} value={organismo.id}>
                  {organismo.nombre}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="organismo-fijo">
            Organismo: {editando ? editando.organismo.nombre : usuario.organismo?.nombre}
          </p>
        )}

        <label htmlFor="tituloActividad">Título</label>
        <input id="tituloActividad" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Retiro de jóvenes" required />

        <label htmlFor="descripcionActividad">Descripción</label>
        <textarea
          id="descripcionActividad"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Qué se hará, qué deben llevar, a quién está dirigida"
          required
        />

        <div className="campos-fecha-hora">
          <div className="campo-fecha-hora">
            <label htmlFor="fechaActividad">Fecha</label>
            <input id="fechaActividad" type="date" min={manana} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="campo-fecha-hora">
            <label htmlFor="horaActividad">Hora</label>
            <select id="horaActividad" value={hora} onChange={(e) => setHora(e.target.value)} required>
              <option value="">Elige la hora</option>
              {horasDelDia().map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion} hrs
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="campos-fecha-hora">
          <div className="campo-fecha-hora">
            <label htmlFor="cuposActividad">Cupos</label>
            <input
              id="cuposActividad"
              type="number"
              min={1}
              max={MAX_CUPOS_ACTIVIDAD}
              value={cupos}
              onChange={(e) => setCupos(e.target.value)}
              required
            />
          </div>
          <div className="campo-fecha-hora">
            <label htmlFor="lugarActividad">Lugar (opcional)</label>
            <input id="lugarActividad" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej: Salón parroquial" />
          </div>
        </div>
        <p className="dialogo-ayuda">
          Los inscritos aceptados deben confirmar su asistencia entre 48 y 24 horas antes; si no confirman, su cupo pasa a la lista de espera.
        </p>

        {error && <p className="login-error">{error}</p>}

        <div className="acciones-formulario">
          <button type="submit" className="boton boton-principal boton-formulario" disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Publicar actividad"}
          </button>
          {editando && (
            <button type="button" className="boton boton-secundario boton-formulario" onClick={limpiar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="filtro-solicitudes">
        <label htmlFor="filtroActividades">Mostrar</label>
        <select id="filtroActividades" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
          <option value="proximas">Próximas actividades</option>
          <option value="pasadas">Actividades pasadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {errorCarga && <p className="login-error">{errorCarga}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          visibles.map((actividad) => {
            const pasada = esFechaPasada(actividad.inicio);
            return (
              <li key={actividad.id} className="fila-solicitud fila-actividad">
                <div className="fila-solicitud-info">
                  <strong>
                    {actividad.titulo} · {actividad.organismo.nombre}
                  </strong>
                  <span>{formatearFechaHora(actividad.inicio)}</span>
                  <span>
                    {actividad.ocupados} de {actividad.cupos} cupos ocupados
                    {actividad.enEspera > 0 ? ` · ${actividad.enEspera} en lista de espera` : ""}
                  </span>
                </div>
                <div className="fila-solicitud-acciones">
                  <span
                    className={`estado-solicitud ${actividad.cancelada ? "estado-rechazada" : pasada ? "estado-cancelada" : "estado-aprobada"}`}
                  >
                    {actividad.cancelada ? "Cancelada" : pasada ? "Realizada" : "Próxima"}
                  </span>
                  <button
                    type="button"
                    className="boton boton-secundario boton-chico"
                    aria-expanded={abierta === actividad.id}
                    onClick={() => setAbierta(abierta === actividad.id ? "" : actividad.id)}
                  >
                    {abierta === actividad.id ? "Ocultar inscritos" : "Inscritos"}
                  </button>
                  {!actividad.cancelada && !pasada && (
                    <>
                      <button type="button" className="boton boton-secundario boton-chico" onClick={() => handleEditar(actividad)}>
                        Editar
                      </button>
                      <button type="button" className="boton boton-peligro-borde boton-chico" onClick={() => setPorCancelar(actividad)}>
                        Cancelar actividad
                      </button>
                    </>
                  )}
                </div>
                {abierta === actividad.id && <PanelInscritos actividad={actividad} onCambio={recargar} />}
              </li>
            );
          })}
        {!cargando && visibles.length === 0 && <li>No hay actividades para mostrar.</li>}
      </ul>

      {porCancelar && (
        <ConfirmarAccion
          titulo="Cancelar actividad"
          mensaje={`¿Cancelar "${porCancelar.titulo}"? Se avisará por correo a todas las personas inscritas. Esta acción no se puede deshacer.`}
          textoConfirmar="Cancelar actividad"
          peligro
          onConfirmar={handleCancelarActividad}
          onCancelar={() => setPorCancelar(null)}
        />
      )}
    </div>
  );
}
