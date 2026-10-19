import { obtenerDocumento } from "../services/sacramento.service";
import type { DocumentoSolicitud } from "../services/sacramento.service";
import { useToast } from "../context/ToastContext";
import { abrirArchivo } from "../utils/archivos";

interface Props {
  documentos: DocumentoSolicitud[];
}

export default function ListaDocumentos({ documentos }: Props) {
  const { mostrarToast } = useToast();

  if (documentos.length === 0) return null;

  async function ver(documento: DocumentoSolicitud) {
    try {
      await abrirArchivo(() => obtenerDocumento(documento.id));
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo abrir el documento", "error");
    }
  }

  return (
    <ul className="lista-documentos" aria-label="Documentos">
      {documentos.map((documento) => (
        <li key={documento.id}>
          <button
            type="button"
            className="documento-enlace"
            title={documento.nombreOriginal}
            onClick={() => ver(documento)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 3h7l5 5v13H7z M14 3v5h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            {documento.tipoDocumento}
          </button>
        </li>
      ))}
    </ul>
  );
}
