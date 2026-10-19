import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  cambiarEstadoHorario,
  cambiarEstadoSolicitud,
  crearHorario,
  eliminarHorario,
  listarHorarios,
  listarSolicitudes,
} from "../services/sacramento.service";
import type { HorarioConCupos, SolicitudSacramento } from "../services/sacramento.service";
import {
  ESTADOS_CON_OBSERVACION,
  ESTADOS_SOLICITUD,
  ETIQUETAS_ESTADO,
  ETIQUETAS_SACRAMENTO,
  MAX_CUPOS_POR_HORARIO,
  OPCION_OTRA_HORA,
  TIPOS_SACRAMENTO,
  TRANSICIONES_ESTADO,
} from "../constants/sacramentos";
import type { EstadoSolicitud, TipoSacramento } from "../constants/sacramentos";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/ToastContext";
import {
  esFechaPasada,
  formatearFechaHora,
  horasDelDia,
  hoyParaInput,
  unirFechaYHora,
} from "../utils/fechas";
import ConfirmarAccion from "./ConfirmarAccion";
import ListaDocumentos from "./ListaDocumentos";

const SIN_HORARIOS: HorarioConCupos[] = [];
const SIN_SOLICITUDES: SolicitudSacramento[] = [];

const TEXTO_ACCION: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Volver a pendiente",
  OBSERVADA: "Observar",
  APROBADA: "Aprobar",
  RECHAZADA: "Rechazar",
  CANCELADA: "Cancelar",
  REALIZADA: "Marcar realizada",
};

const CLASE_ACCION: Record<EstadoSolicitud, string> = {
  PENDIENTE: "boton-secundario",
  OBSERVADA: "boton-secundario",
  APROBADA: "boton-principal",
  RECHAZADA: "boton-peligro-borde",
  CANCELADA: "boton-peligro-borde",
  REALIZADA: "boton-principal",
};

type FiltroHorarios = "proximos" | "pasados" | "todos";

interface CambioPendiente {
  solicitud: SolicitudSacramento;
  estado: EstadoSolicitud;
}

interface DialogoMotivoProps {
  cambio: CambioPendiente;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}

function DialogoMotivo({ cambio, onConfirmar, onCancelar }: DialogoMotivoProps) {
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
      setError("Escribe el motivo para el feligrés");
      return;
    }
    onConfirmar(motivo.trim());
  }

  const esRechazo = cambio.estado === "RECHAZADA";

  return (
    <dialog ref={dialogoRef} className="dialogo-confirmacion" onCancel={onCancelar}>
      <h2>{esRechazo ? "Rechazar solicitud" : "Observar solicitud"}</h2>
      <p>
        {ETIQUETAS_SACRAMENTO[cambio.solicitud.horario.tipo]} para "{cambio.solicitud.nombreBeneficiario}".
        El feligrés recibirá este mensaje por correo.
      </p>
      <form className="dialogo-form" onSubmit={handleSubmit}>
        <label htmlFor="motivoCambio">{esRechazo ? "Motivo del rechazo" : "¿Qué debe corregir?"}</label>
        <textarea
          id="motivoCambio"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={esRechazo ? "Ej: la fecha no corresponde a este sacramento" : "Ej: falta indicar el nombre de los padrinos"}
        />
        {error && <p className="login-error">{error}</p>}
        <div className="dialogo-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Volver
          </button>
          <button type="submit" className={`boton ${esRechazo ? "boton-peligro" : "boton-principal"}`}>
            {esRechazo ? "Rechazar" : "Enviar observación"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function PanelSolicitudes() {
  const { mostrarToast } = useToast();
  const [filtro, setFiltro] = useState<EstadoSolicitud | "">("PENDIENTE");
  const cargar = useCallback(() => listarSolicitudes(filtro || undefined), [filtro]);
  const { datos: solicitudes, cargando, error, recargar } = useCarga(
    cargar,
    SIN_SOLICITUDES,
    "No se pudieron cargar las solicitudes"
  );
  const [cambio, setCambio] = useState<CambioPendiente | null>(null);

  async function aplicarCambio(motivo?: string) {
    if (!cambio) return;
    const { solicitud, estado } = cambio;
    setCambio(null);
    try {
      await cambiarEstadoSolicitud(solicitud.id, estado, motivo);
      mostrarToast(`Solicitud ${ETIQUETAS_ESTADO[estado].toLowerCase()}. Se avisó por correo a ${solicitud.solicitante.email}.`);
      await recargar();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cambiar el estado", "error");
    }
  }

  return (
    <>
      <div className="filtro-solicitudes">
        <label htmlFor="filtroEstado">Mostrar</label>
        <select
          id="filtroEstado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoSolicitud | "")}
        >
          <option value="">Todas las solicitudes</option>
          {ESTADOS_SOLICITUD.map((estado) => (
            <option key={estado} value={estado}>
              {ETIQUETAS_ESTADO[estado]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="login-error">{error}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          solicitudes.map((solicitud) => (
            <li key={solicitud.id} className="fila-solicitud">
              <div className="fila-solicitud-info">
                <strong>
                  {ETIQUETAS_SACRAMENTO[solicitud.horario.tipo]} · {solicitud.nombreBeneficiario}
                </strong>
                <span>{formatearFechaHora(solicitud.horario.inicio)}</span>
                <span>
                  Solicitado por {solicitud.solicitante.nombre} ({solicitud.solicitante.email})
                </span>
                {solicitud.comentario && <span>Comentario: {solicitud.comentario}</span>}
                {solicitud.observacion && (
                  <span className="fila-solicitud-observacion">
                    {ESTADOS_CON_OBSERVACION.includes(solicitud.estado) ? "Observación" : "Observación anterior"}:{" "}
                    {solicitud.observacion}
                  </span>
                )}
                <ListaDocumentos documentos={solicitud.documentos} />
              </div>
              <div className="fila-solicitud-acciones">
                <span className={`estado-solicitud estado-${solicitud.estado.toLowerCase()}`}>
                  {ETIQUETAS_ESTADO[solicitud.estado]}
                </span>
                {TRANSICIONES_ESTADO[solicitud.estado]
                  .filter((estado) => estado !== "REALIZADA" || esFechaPasada(solicitud.horario.inicio))
                  .map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`boton ${CLASE_ACCION[estado]} boton-chico`}
                      onClick={() => setCambio({ solicitud, estado })}
                    >
                      {TEXTO_ACCION[estado]}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        {!cargando && solicitudes.length === 0 && <li>No hay solicitudes en este estado.</li>}
      </ul>

      {cambio && ESTADOS_CON_OBSERVACION.includes(cambio.estado) && (
        <DialogoMotivo cambio={cambio} onConfirmar={aplicarCambio} onCancelar={() => setCambio(null)} />
      )}
      {cambio && !ESTADOS_CON_OBSERVACION.includes(cambio.estado) && (
        <ConfirmarAccion
          titulo={TEXTO_ACCION[cambio.estado]}
          mensaje={`¿${TEXTO_ACCION[cambio.estado]} la solicitud de ${ETIQUETAS_SACRAMENTO[cambio.solicitud.horario.tipo]} para "${cambio.solicitud.nombreBeneficiario}"? Se le avisará por correo.`}
          textoConfirmar={TEXTO_ACCION[cambio.estado]}
          onConfirmar={() => aplicarCambio()}
          onCancelar={() => setCambio(null)}
        />
      )}
    </>
  );
}

function PanelHorarios() {
  const { mostrarToast } = useToast();
  const { datos: horarios, cargando, error: errorCarga, recargar } = useCarga(
    listarHorarios,
    SIN_HORARIOS,
    "No se pudieron cargar los horarios"
  );
  const [tipo, setTipo] = useState<TipoSacramento>("BAUTISMO");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horaExacta, setHoraExacta] = useState("");
  const [cupos, setCupos] = useState("1");
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<HorarioConCupos | null>(null);
  const [porDesactivar, setPorDesactivar] = useState<HorarioConCupos | null>(null);
  const [filtro, setFiltro] = useState<FiltroHorarios>("proximos");

  const horariosFiltrados = horarios
    .filter((horario) => {
      if (filtro === "todos") return true;
      return filtro === "pasados" ? esFechaPasada(horario.inicio) : !esFechaPasada(horario.inicio);
    })
    .sort((a, b) =>
      filtro === "proximos" ? a.inicio.localeCompare(b.inicio) : b.inicio.localeCompare(a.inicio)
    );

  function pedirCambioEstado(horario: HorarioConCupos) {
    if (horario.activo && horario.ocupados > 0) {
      setPorDesactivar(horario);
      return;
    }
    handleCambiarEstado(horario);
  }

  const horaFinal = hora === OPCION_OTRA_HORA ? horaExacta : hora;
  const inicioElegido = fecha && horaFinal ? unirFechaYHora(fecha, horaFinal) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!inicioElegido) {
      setError("Elige la fecha y la hora");
      return;
    }
    if (inicioElegido <= new Date()) {
      setError("Elige una fecha y hora futuras");
      return;
    }

    setCreando(true);
    try {
      await crearHorario({
        tipo,
        inicio: inicioElegido.toISOString(),
        cupos: Number(cupos),
        lugar: lugar.trim(),
      });
      setHora("");
      setHoraExacta("");
      setCupos("1");
      mostrarToast("Horario publicado. Los feligreses ya pueden reservarlo.");
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el horario");
    } finally {
      setCreando(false);
    }
  }

  async function handleCambiarEstado(horario: HorarioConCupos) {
    setPorDesactivar(null);
    try {
      await cambiarEstadoHorario(horario.id, !horario.activo);
      mostrarToast(horario.activo ? "Horario desactivado" : "Horario activado");
      await recargar();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo actualizar el horario", "error");
    }
  }

  async function handleEliminar() {
    if (!porEliminar) return;
    const horario = porEliminar;
    setPorEliminar(null);
    try {
      await eliminarHorario(horario.id);
      mostrarToast("Horario eliminado");
      await recargar();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar el horario", "error");
    }
  }

  return (
    <>
      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>Publicar horario</h2>

        <label htmlFor="tipoHorario">Sacramento</label>
        <select id="tipoHorario" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSacramento)}>
          {TIPOS_SACRAMENTO.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_SACRAMENTO[valor]}
            </option>
          ))}
        </select>

        <div className="campos-fecha-hora">
          <div className="campo-fecha-hora">
            <label htmlFor="fechaHorario">Fecha</label>
            <input
              id="fechaHorario"
              type="date"
              value={fecha}
              min={hoyParaInput()}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div className="campo-fecha-hora">
            <label htmlFor="horaHorario">Hora</label>
            <select id="horaHorario" value={hora} onChange={(e) => setHora(e.target.value)} required>
              <option value="">Elige la hora</option>
              {horasDelDia().map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion} hrs
                </option>
              ))}
              <option value={OPCION_OTRA_HORA}>Otra hora…</option>
            </select>
          </div>
        </div>
        {hora === OPCION_OTRA_HORA && (
          <div className="campo-fecha-hora campo-hora-exacta">
            <label htmlFor="horaExactaHorario">Hora exacta</label>
            <input
              id="horaExactaHorario"
              type="time"
              value={horaExacta}
              onChange={(e) => setHoraExacta(e.target.value)}
              required
            />
            <p className="dialogo-ayuda">Escribe la hora en formato 24 horas, por ejemplo 11:10 o 19:45.</p>
          </div>
        )}
        {inicioElegido && (
          <p className={`vista-previa-horario ${inicioElegido <= new Date() ? "vista-previa-error" : ""}`}>
            {inicioElegido <= new Date()
              ? "Esa fecha y hora ya pasaron, elige otra."
              : `Se publicará para el ${formatearFechaHora(inicioElegido.toISOString())}`}
          </p>
        )}

        <label htmlFor="cuposHorario">Cupos</label>
        <input
          id="cuposHorario"
          type="number"
          min={1}
          max={MAX_CUPOS_POR_HORARIO}
          value={cupos}
          onChange={(e) => setCupos(e.target.value)}
          required
        />

        <label htmlFor="lugarHorario">Lugar (opcional)</label>
        <input
          id="lugarHorario"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: Capilla de la Parroquia Universitaria"
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="boton boton-principal boton-formulario" disabled={creando}>
          {creando ? "Publicando..." : "Publicar horario"}
        </button>
      </form>

      <div className="filtro-solicitudes">
        <label htmlFor="filtroHorarios">Mostrar</label>
        <select
          id="filtroHorarios"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroHorarios)}
        >
          <option value="proximos">Próximos horarios</option>
          <option value="pasados">Horarios pasados</option>
          <option value="todos">Todos los horarios</option>
        </select>
      </div>

      {errorCarga && <p className="login-error">{errorCarga}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          horariosFiltrados.map((horario) => (
            <li key={horario.id} className="fila-solicitud">
              <div className="fila-solicitud-info">
                <strong>
                  {ETIQUETAS_SACRAMENTO[horario.tipo]} · {formatearFechaHora(horario.inicio)}
                </strong>
                <span>
                  {horario.lugar ?? "Parroquia Universitaria"} · {horario.ocupados} de {horario.cupos} cupos
                  ocupados
                </span>
              </div>
              <div className="fila-solicitud-acciones">
                <span
                  className={`estado-solicitud ${
                    esFechaPasada(horario.inicio)
                      ? "estado-cancelada"
                      : horario.activo
                        ? "estado-aprobada"
                        : "estado-rechazada"
                  }`}
                >
                  {esFechaPasada(horario.inicio) ? "Pasado" : horario.activo ? "Activo" : "Inactivo"}
                </span>
                {!esFechaPasada(horario.inicio) && (
                  <button
                    type="button"
                    className="boton boton-secundario boton-chico"
                    onClick={() => pedirCambioEstado(horario)}
                  >
                    {horario.activo ? "Desactivar" : "Activar"}
                  </button>
                )}
                {horario.ocupados === 0 && (
                  <button
                    type="button"
                    className="boton boton-peligro-borde boton-chico"
                    onClick={() => setPorEliminar(horario)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        {!cargando && horariosFiltrados.length === 0 && (
          <li>
            {filtro === "proximos"
              ? "No hay próximos horarios. Publica uno con el formulario de arriba."
              : "No hay horarios para mostrar."}
          </li>
        )}
      </ul>

      {porDesactivar && (
        <ConfirmarAccion
          titulo="Desactivar horario"
          mensaje={`Este horario tiene ${porDesactivar.ocupados} ${porDesactivar.ocupados === 1 ? "reserva" : "reservas"}. Al desactivarlo nadie más podrá reservarlo, pero las reservas que ya existen se mantienen. ¿Desactivarlo?`}
          textoConfirmar="Desactivar"
          onConfirmar={() => handleCambiarEstado(porDesactivar)}
          onCancelar={() => setPorDesactivar(null)}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo="Eliminar horario"
          mensaje={`¿Eliminar el horario de ${ETIQUETAS_SACRAMENTO[porEliminar.tipo]} del ${formatearFechaHora(porEliminar.inicio)}?`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={handleEliminar}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </>
  );
}

export default function DashboardAgendamientos() {
  const [pestana, setPestana] = useState<"solicitudes" | "horarios">("horarios");

  return (
    <div className="gestion-publicaciones">
      <h1>Agendamientos</h1>
      <div className="pestanas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "horarios"}
          className={`pestana ${pestana === "horarios" ? "pestana-activa" : ""}`}
          onClick={() => setPestana("horarios")}
        >
          <span className="pestana-titulo">Horarios</span>
          <span className="pestana-detalle">Publica las horas que los feligreses pueden agendar</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "solicitudes"}
          className={`pestana ${pestana === "solicitudes" ? "pestana-activa" : ""}`}
          onClick={() => setPestana("solicitudes")}
        >
          <span className="pestana-titulo">Solicitudes</span>
          <span className="pestana-detalle">Revisa, aprueba u observa las horas pedidas</span>
        </button>
      </div>

      {pestana === "solicitudes" ? <PanelSolicitudes /> : <PanelHorarios />}
    </div>
  );
}
