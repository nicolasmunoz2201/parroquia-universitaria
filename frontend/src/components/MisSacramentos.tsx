import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import {
  cancelarSolicitud,
  crearSolicitud,
  listarDocumentosRequeridos,
  listarHorariosDisponibles,
  listarMisSolicitudes,
} from "../services/sacramento.service";
import type {
  DocumentoElegido,
  DocumentosRequeridos,
  HorarioConCupos,
  SolicitudSacramento,
} from "../services/sacramento.service";
import {
  ESTADOS_CANCELABLES,
  ESTADOS_CON_OBSERVACION,
  ETIQUETAS_ESTADO,
  ETIQUETAS_SACRAMENTO,
  TIPOS_SACRAMENTO,
} from "../constants/sacramentos";
import type { TipoSacramento } from "../constants/sacramentos";
import { MAX_TAMANO_DOCUMENTO_MB } from "../constants/archivos";
import { useCarga } from "../hooks/useCarga";
import { useToast } from "../context/ToastContext";
import { esFechaPasada, formatearFechaHora } from "../utils/fechas";
import ConfirmarAccion from "./ConfirmarAccion";
import CampoDocumento from "./CampoDocumento";
import CorregirDocumentos from "./CorregirDocumentos";
import ListaDocumentos from "./ListaDocumentos";

const SIN_HORARIOS: HorarioConCupos[] = [];
const SIN_SOLICITUDES: SolicitudSacramento[] = [];
const SIN_REQUISITOS: DocumentosRequeridos = {};

export default function MisSacramentos() {
  const { mostrarToast } = useToast();
  const {
    datos: solicitudes,
    cargando,
    error: errorCarga,
    recargar,
  } = useCarga(listarMisSolicitudes, SIN_SOLICITUDES, "No se pudieron cargar tus solicitudes");

  const [tipo, setTipo] = useState<TipoSacramento | "">("");
  const cargarHorarios = useCallback(
    () => (tipo ? listarHorariosDisponibles(tipo) : Promise.resolve(SIN_HORARIOS)),
    [tipo]
  );
  const {
    datos: horarios,
    cargando: cargandoHorarios,
    recargar: recargarHorarios,
  } = useCarga(cargarHorarios, SIN_HORARIOS, "No se pudieron cargar los horarios");
  const { datos: requisitos } = useCarga(
    listarDocumentosRequeridos,
    SIN_REQUISITOS,
    "No se pudieron cargar los documentos requeridos"
  );

  const [horarioId, setHorarioId] = useState("");
  const [nombreBeneficiario, setNombreBeneficiario] = useState("");
  const [comentario, setComentario] = useState("");
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [porCancelar, setPorCancelar] = useState<SolicitudSacramento | null>(null);
  const [porCorregir, setPorCorregir] = useState<SolicitudSacramento | null>(null);

  const horarioElegido = horarios.find((horario) => horario.id === horarioId);
  const requeridos = tipo ? (requisitos[tipo] ?? []) : [];
  const documentosElegidos: DocumentoElegido[] = requeridos.flatMap((tipoDocumento) => {
    const archivo = archivos[tipoDocumento];
    return archivo ? [{ tipoDocumento, archivo }] : [];
  });

  function handleCambiarTipo(nuevoTipo: TipoSacramento | "") {
    setTipo(nuevoTipo);
    setHorarioId("");
    setArchivos({});
    setError("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!horarioElegido) {
      setError("Selecciona una hora disponible");
      return;
    }
    if (!nombreBeneficiario.trim()) {
      setError("Indica el nombre de quien recibirá el sacramento");
      return;
    }
    const faltante = requeridos.find((tipoDocumento) => !archivos[tipoDocumento]);
    if (faltante) {
      setError(`Falta subir: ${faltante}`);
      return;
    }
    setConfirmando(true);
  }

  async function enviarSolicitud() {
    setConfirmando(false);
    setEnviando(true);
    try {
      await crearSolicitud({
        horarioId,
        nombreBeneficiario: nombreBeneficiario.trim(),
        comentario: comentario.trim(),
        documentos: documentosElegidos,
      });
      setHorarioId("");
      setNombreBeneficiario("");
      setComentario("");
      setArchivos({});
      mostrarToast("Solicitud enviada. Te avisaremos por correo cada cambio de estado.");
      await Promise.all([recargar(), recargarHorarios()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud");
      await recargarHorarios();
    } finally {
      setEnviando(false);
    }
  }

  async function handleCancelar() {
    if (!porCancelar) return;
    const solicitud = porCancelar;
    setPorCancelar(null);
    try {
      await cancelarSolicitud(solicitud.id);
      mostrarToast("Solicitud cancelada");
      await Promise.all([recargar(), recargarHorarios()]);
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cancelar la solicitud", "error");
    }
  }

  async function handleCorregida() {
    setPorCorregir(null);
    mostrarToast("Documentos enviados. La secretaría revisará tu solicitud de nuevo.");
    await recargar();
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Agendar sacramentos</h1>

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>Agendar un sacramento</h2>

        <label htmlFor="tipoSacramento">Sacramento</label>
        <select
          id="tipoSacramento"
          value={tipo}
          onChange={(e) => handleCambiarTipo(e.target.value as TipoSacramento | "")}
          required
        >
          <option value="">Selecciona un sacramento</option>
          {TIPOS_SACRAMENTO.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_SACRAMENTO[valor]}
            </option>
          ))}
        </select>

        {tipo && (
          <fieldset className="grupo-horarios">
            <legend>Horas disponibles</legend>
            {cargandoHorarios && <p className="dialogo-ayuda">Buscando horas...</p>}
            {!cargandoHorarios && horarios.length === 0 && (
              <p className="dialogo-ayuda">
                No hay horas disponibles para este sacramento. Vuelve a revisar más adelante.
              </p>
            )}
            <ul className="lista-horarios">
              {horarios.map((horario) => (
                <li key={horario.id}>
                  <label
                    className={`opcion-horario ${horarioId === horario.id ? "opcion-horario-elegida" : ""}`}
                  >
                    <input
                      type="radio"
                      name="horario"
                      value={horario.id}
                      checked={horarioId === horario.id}
                      onChange={() => setHorarioId(horario.id)}
                    />
                    <span className="opcion-horario-fecha">{formatearFechaHora(horario.inicio)}</span>
                    <span className="opcion-horario-detalle">
                      {horario.lugar ?? "Parroquia Universitaria"} · {horario.cuposDisponibles}{" "}
                      {horario.cuposDisponibles === 1 ? "cupo disponible" : "cupos disponibles"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {tipo && (
          <fieldset className="grupo-horarios">
            <legend>Documentos</legend>
            {requeridos.length === 0 ? (
              <p className="dialogo-ayuda">Este sacramento no necesita documentos.</p>
            ) : (
              <>
                <p className="dialogo-ayuda">
                  Sube cada documento en PDF, de hasta {MAX_TAMANO_DOCUMENTO_MB} MB. Solo la secretaría podrá verlos.
                </p>
                <div className="lista-campos-documento">
                  {requeridos.map((tipoDocumento, i) => (
                    <CampoDocumento
                      key={tipoDocumento}
                      id={`documento-${i}`}
                      nombre={tipoDocumento}
                      archivo={archivos[tipoDocumento] ?? null}
                      onElegir={(archivo) => setArchivos((previos) => ({ ...previos, [tipoDocumento]: archivo }))}
                      onError={setError}
                    />
                  ))}
                </div>
              </>
            )}
          </fieldset>
        )}

        <label htmlFor="nombreBeneficiario">¿Quién recibirá el sacramento?</label>
        <input
          id="nombreBeneficiario"
          value={nombreBeneficiario}
          onChange={(e) => setNombreBeneficiario(e.target.value)}
          placeholder="Nombre completo"
          required
        />

        <label htmlFor="comentarioSolicitud">Comentario (opcional)</label>
        <textarea
          id="comentarioSolicitud"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Por ejemplo: nombres de los padrinos o algo que la secretaría deba saber"
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="boton boton-principal boton-formulario" disabled={enviando}>
          {enviando ? "Enviando..." : "Solicitar hora"}
        </button>
      </form>

      <h2 className="titulo-seccion">Mis solicitudes</h2>
      {errorCarga && <p className="login-error">{errorCarga}</p>}
      <ul className="publicaciones-lista">
        {!cargando &&
          solicitudes.map((solicitud) => (
            <li key={solicitud.id} className="fila-solicitud">
              <div className="fila-solicitud-info">
                <strong>
                  {ETIQUETAS_SACRAMENTO[solicitud.horario.tipo]} · {solicitud.nombreBeneficiario}
                </strong>
                <span>{formatearFechaHora(solicitud.horario.inicio)}</span>
                <span>{solicitud.horario.lugar ?? "Parroquia Universitaria"}</span>
                {solicitud.observacion && ESTADOS_CON_OBSERVACION.includes(solicitud.estado) && (
                  <span className="fila-solicitud-observacion">
                    Observación de la secretaría: {solicitud.observacion}
                  </span>
                )}
                <ListaDocumentos documentos={solicitud.documentos} />
              </div>
              <div className="fila-solicitud-acciones">
                <span className={`estado-solicitud estado-${solicitud.estado.toLowerCase()}`}>
                  {ETIQUETAS_ESTADO[solicitud.estado]}
                </span>
                {solicitud.estado === "OBSERVADA" &&
                  !esFechaPasada(solicitud.horario.inicio) &&
                  (requisitos[solicitud.horario.tipo] ?? []).length > 0 && (
                    <button
                      type="button"
                      className="boton boton-principal boton-chico"
                      onClick={() => setPorCorregir(solicitud)}
                    >
                      Corregir documentos
                    </button>
                  )}
                {ESTADOS_CANCELABLES.includes(solicitud.estado) && !esFechaPasada(solicitud.horario.inicio) && (
                  <button
                    type="button"
                    className="boton boton-peligro-borde boton-chico"
                    onClick={() => setPorCancelar(solicitud)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
        {!cargando && solicitudes.length === 0 && <li>Todavía no tienes solicitudes.</li>}
      </ul>

      {confirmando && horarioElegido && (
        <ConfirmarAccion
          titulo="Confirmar solicitud"
          mensaje={`¿Solicitar ${ETIQUETAS_SACRAMENTO[horarioElegido.tipo]} para "${nombreBeneficiario.trim()}" el ${formatearFechaHora(horarioElegido.inicio)}?`}
          textoConfirmar="Solicitar"
          onConfirmar={enviarSolicitud}
          onCancelar={() => setConfirmando(false)}
        />
      )}

      {porCancelar && (
        <ConfirmarAccion
          titulo="Cancelar solicitud"
          mensaje={`¿Cancelar la solicitud de ${ETIQUETAS_SACRAMENTO[porCancelar.horario.tipo]} para "${porCancelar.nombreBeneficiario}"? Se liberará la hora reservada.`}
          textoConfirmar="Cancelar solicitud"
          peligro
          onConfirmar={handleCancelar}
          onCancelar={() => setPorCancelar(null)}
        />
      )}

      {porCorregir && (
        <CorregirDocumentos
          solicitud={porCorregir}
          requeridos={requisitos[porCorregir.horario.tipo] ?? []}
          onCorregida={handleCorregida}
          onCancelar={() => setPorCorregir(null)}
        />
      )}
    </div>
  );
}
