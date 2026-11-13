import { useCallback, useState } from "react";
import {
  cancelarInscripcion,
  confirmarAsistencia,
  inscribirse,
  listarActividades,
  listarMisInscripciones,
} from "../services/actividad.service";
import type { Actividad, MiInscripcion } from "../services/actividad.service";
import type { Usuario } from "../services/auth.service";
import {
  CLASE_INSCRIPCION,
  ESTADOS_INSCRIPCION_VIGENTE,
  ESTADOS_REINSCRIBIBLES,
  ETIQUETAS_INSCRIPCION,
} from "../constants/actividades";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/toast";
import { esFechaPasada, formatearFechaHora } from "../utils/fechas";
import {
  aperturaConfirmacion,
  cierreConfirmacion,
  inscripcionesAbiertas,
  puedeConfirmarAhora,
  textoCupos,
} from "../utils/actividades";
import ConfirmarAccion from "./ConfirmarAccion";

const SIN_ACTIVIDADES: Actividad[] = [];
const SIN_INSCRIPCIONES: MiInscripcion[] = [];

interface Props {
  usuario: Usuario | null;
  onIrALogin: () => void;
}

function sinInscripciones() {
  return Promise.resolve(SIN_INSCRIPCIONES);
}

function DetalleConfirmacion({ inscripcion }: { inscripcion: MiInscripcion }) {
  const { inicio } = inscripcion.actividad;
  if (inscripcion.estado !== "ACEPTADA") return null;
  if (puedeConfirmarAhora(inicio)) {
    return (
      <span className="aviso-confirmacion">
        Confirma tu asistencia antes del {formatearFechaHora(cierreConfirmacion(inicio).toISOString())}
      </span>
    );
  }
  return (
    <span>
      Podrás confirmar tu asistencia desde el {formatearFechaHora(aperturaConfirmacion(inicio).toISOString())}
    </span>
  );
}

export default function Actividades({ usuario, onIrALogin }: Props) {
  const { mostrarToast } = useToast();
  const { datos: actividades, cargando, error, recargar } = useCarga(
    listarActividades,
    SIN_ACTIVIDADES,
    "No se pudieron cargar las actividades"
  );
  const cargarMias = useCallback(() => (usuario ? listarMisInscripciones() : sinInscripciones()), [usuario]);
  const { datos: misInscripciones, recargar: recargarMias } = useCarga(
    cargarMias,
    SIN_INSCRIPCIONES,
    "No se pudieron cargar tus inscripciones"
  );

  const [organismo, setOrganismo] = useState("");
  const [enviando, setEnviando] = useState("");
  const [porCancelar, setPorCancelar] = useState<MiInscripcion | null>(null);

  const organismos = [...new Map(actividades.map((a) => [a.organismo.id, a.organismo.nombre])).entries()];
  const visibles = actividades.filter((actividad) => !organismo || actividad.organismo.id === organismo);

  async function recargarTodo() {
    await Promise.all([recargar(), recargarMias()]);
  }

  async function handleInscribirse(actividad: Actividad) {
    setEnviando(actividad.id);
    try {
      const inscripcion = await inscribirse(actividad.id);
      mostrarToast(
        inscripcion.estado === "EN_ESPERA"
          ? "Quedaste en lista de espera. Te avisaremos por correo si se libera un cupo."
          : "Inscripción enviada. El encargado la revisará y te avisaremos por correo."
      );
      await recargarTodo();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo completar la inscripción", "error");
    } finally {
      setEnviando("");
    }
  }

  async function handleConfirmar(inscripcion: MiInscripcion) {
    try {
      await confirmarAsistencia(inscripcion.id);
      mostrarToast("¡Listo! Tu asistencia quedó confirmada.");
      await recargarMias();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo confirmar tu asistencia", "error");
    }
  }

  async function handleCancelar() {
    if (!porCancelar) return;
    const inscripcion = porCancelar;
    setPorCancelar(null);
    try {
      await cancelarInscripcion(inscripcion.id);
      mostrarToast("Avisamos que no podrás asistir. Tu cupo pasará a otra persona.");
      await recargarTodo();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cancelar la inscripción", "error");
    }
  }

  function accionActividad(actividad: Actividad) {
    const mia = misInscripciones.find((inscripcion) => inscripcion.actividad.id === actividad.id);
    if (mia && !ESTADOS_REINSCRIBIBLES.includes(mia.estado)) {
      return <span className={`estado-solicitud ${CLASE_INSCRIPCION[mia.estado]}`}>{ETIQUETAS_INSCRIPCION[mia.estado]}</span>;
    }
    if (!inscripcionesAbiertas(actividad.inicio)) {
      return <span className="estado-solicitud estado-cancelada">Inscripciones cerradas</span>;
    }
    if (!usuario) {
      return (
        <button type="button" className="boton boton-secundario boton-chico" onClick={onIrALogin}>
          Inicia sesión para inscribirte
        </button>
      );
    }
    return (
      <button
        type="button"
        className="boton boton-principal boton-chico"
        disabled={enviando === actividad.id}
        onClick={() => handleInscribirse(actividad)}
      >
        {enviando === actividad.id
          ? "Enviando..."
          : actividad.cuposDisponibles === 0
            ? "Unirme a la lista de espera"
            : "Inscribirme"}
      </button>
    );
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Actividades</h1>
      <p className="pagina-subtitulo-actividades">
        Inscríbete en las actividades de los organismos de la parroquia. Te avisaremos por correo cada paso.
      </p>

      {organismos.length > 1 && (
        <div className="filtro-solicitudes">
          <label htmlFor="filtroOrganismoActividad">Organismo</label>
          <select id="filtroOrganismoActividad" value={organismo} onChange={(e) => setOrganismo(e.target.value)}>
            <option value="">Todos</option>
            {organismos.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="login-error">{error}</p>}
      <ul className="lista-actividades">
        {!cargando &&
          visibles.map((actividad) => (
            <li key={actividad.id} className="tarjeta-actividad">
              <span className="actividad-organismo">{actividad.organismo.nombre}</span>
              <h2>{actividad.titulo}</h2>
              <p className="actividad-fecha">{formatearFechaHora(actividad.inicio)}</p>
              <p className="actividad-detalle">{actividad.lugar ?? "Parroquia Universitaria"}</p>
              <p className="actividad-descripcion">{actividad.descripcion}</p>
              <div className="actividad-pie">
                <span className={`actividad-cupos ${actividad.cuposDisponibles === 0 ? "actividad-llena" : ""}`}>
                  {textoCupos(actividad.cuposDisponibles)}
                </span>
                {accionActividad(actividad)}
              </div>
            </li>
          ))}
        {!cargando && visibles.length === 0 && (
          <li className="aviso-vacio">No hay actividades próximas por ahora. Vuelve a revisar pronto.</li>
        )}
      </ul>

      {usuario && (
        <>
          <h2 className="titulo-seccion">Mis inscripciones</h2>
          <ul className="publicaciones-lista">
            {misInscripciones.map((inscripcion) => {
              const pasada = esFechaPasada(inscripcion.actividad.inicio);
              const vigente = ESTADOS_INSCRIPCION_VIGENTE.includes(inscripcion.estado);
              return (
                <li key={inscripcion.id} className="fila-solicitud">
                  <div className="fila-solicitud-info">
                    <strong>
                      {inscripcion.actividad.titulo} · {inscripcion.actividad.organismo.nombre}
                    </strong>
                    <span>{formatearFechaHora(inscripcion.actividad.inicio)}</span>
                    {inscripcion.actividad.cancelada && (
                      <span className="fila-solicitud-observacion">La actividad fue cancelada</span>
                    )}
                    {inscripcion.motivoRechazo && inscripcion.estado === "RECHAZADA" && (
                      <span className="fila-solicitud-observacion">Motivo: {inscripcion.motivoRechazo}</span>
                    )}
                    {!pasada && !inscripcion.actividad.cancelada && <DetalleConfirmacion inscripcion={inscripcion} />}
                    {inscripcion.asistio !== null && <span>{inscripcion.asistio ? "Asististe ✓" : "No se registró tu asistencia"}</span>}
                  </div>
                  <div className="fila-solicitud-acciones">
                    {inscripcion.actividad.cancelada ? (
                      <span className="estado-solicitud estado-rechazada">Actividad cancelada</span>
                    ) : (
                      <span className={`estado-solicitud ${CLASE_INSCRIPCION[inscripcion.estado]}`}>
                        {ETIQUETAS_INSCRIPCION[inscripcion.estado]}
                      </span>
                    )}
                    {inscripcion.estado === "ACEPTADA" && !inscripcion.actividad.cancelada && puedeConfirmarAhora(inscripcion.actividad.inicio) && (
                      <button type="button" className="boton boton-principal boton-chico" onClick={() => handleConfirmar(inscripcion)}>
                        Confirmar asistencia
                      </button>
                    )}
                    {vigente && !pasada && !inscripcion.actividad.cancelada && (
                      <button
                        type="button"
                        className="boton boton-peligro-borde boton-chico"
                        onClick={() => setPorCancelar(inscripcion)}
                      >
                        {inscripcion.estado === "EN_ESPERA" ? "Salir de la lista de espera" : "No podré asistir"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {misInscripciones.length === 0 && <li>Todavía no te has inscrito en ninguna actividad.</li>}
          </ul>
        </>
      )}

      {porCancelar && (
        <ConfirmarAccion
          titulo={porCancelar.estado === "EN_ESPERA" ? "Salir de la lista de espera" : "No podré asistir"}
          mensaje={
            porCancelar.estado === "EN_ESPERA"
              ? `¿Salir de la lista de espera de "${porCancelar.actividad.titulo}"?`
              : `¿Avisar que no podrás asistir a "${porCancelar.actividad.titulo}"? Tu cupo pasará a la siguiente persona de la lista de espera.`
          }
          textoConfirmar={porCancelar.estado === "EN_ESPERA" ? "Salir" : "Avisar"}
          peligro
          onConfirmar={handleCancelar}
          onCancelar={() => setPorCancelar(null)}
        />
      )}
    </div>
  );
}
