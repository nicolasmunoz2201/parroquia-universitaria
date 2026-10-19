import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { corregirDocumentos } from "../services/sacramento.service";
import type { DocumentoElegido, SolicitudSacramento } from "../services/sacramento.service";
import { ETIQUETAS_SACRAMENTO } from "../constants/sacramentos";
import { MAX_TAMANO_DOCUMENTO_MB } from "../constants/archivos";
import CampoDocumento from "./CampoDocumento";

interface Props {
  solicitud: SolicitudSacramento;
  requeridos: string[];
  onCorregida: () => void;
  onCancelar: () => void;
}

export default function CorregirDocumentos({ solicitud, requeridos, onCorregida, onCancelar }: Props) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  const elegidos: DocumentoElegido[] = requeridos.flatMap((tipoDocumento) => {
    const archivo = archivos[tipoDocumento];
    return archivo ? [{ tipoDocumento, archivo }] : [];
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (elegidos.length === 0) {
      setError("Elige al menos un documento para reemplazar");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await corregirDocumentos(solicitud.id, elegidos);
      onCorregida();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar los documentos");
      setEnviando(false);
    }
  }

  return (
    <dialog ref={dialogoRef} className="dialogo-confirmacion dialogo-documentos" onCancel={onCancelar}>
      <h2>Corregir documentos</h2>
      <p>
        {ETIQUETAS_SACRAMENTO[solicitud.horario.tipo]} para "{solicitud.nombreBeneficiario}".
      </p>
      {solicitud.observacion && (
        <p className="fila-solicitud-observacion">Observación de la secretaría: {solicitud.observacion}</p>
      )}
      <form className="dialogo-form" onSubmit={handleSubmit}>
        <p className="dialogo-ayuda">
          Sube solo los documentos que debes cambiar, en PDF de hasta {MAX_TAMANO_DOCUMENTO_MB} MB. Los demás
          se mantienen. Al enviar, la solicitud vuelve a revisión.
        </p>
        <div className="lista-campos-documento">
          {requeridos.map((tipoDocumento, i) => (
            <CampoDocumento
              key={tipoDocumento}
              id={`corregir-documento-${i}`}
              nombre={tipoDocumento}
              archivo={archivos[tipoDocumento] ?? null}
              actual={solicitud.documentos.find((documento) => documento.tipoDocumento === tipoDocumento)?.nombreOriginal}
              onElegir={(archivo) => setArchivos((previos) => ({ ...previos, [tipoDocumento]: archivo }))}
              onError={setError}
            />
          ))}
        </div>
        {error && <p className="login-error">{error}</p>}
        <div className="dialogo-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Volver
          </button>
          <button type="submit" className="boton boton-principal" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar corrección"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
