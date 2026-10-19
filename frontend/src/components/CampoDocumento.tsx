import type { ChangeEvent } from "react";
import { BYTES_POR_MB, MAX_TAMANO_DOCUMENTO_MB, TIPO_DOCUMENTO } from "../constants/archivos";

interface Props {
  id: string;
  nombre: string;
  archivo: File | null;
  actual?: string;
  onElegir: (archivo: File | null) => void;
  onError: (mensaje: string) => void;
}

export default function CampoDocumento({ id, nombre, archivo, actual, onElegir, onError }: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!elegido) return;
    if (elegido.type !== TIPO_DOCUMENTO) {
      onError(`"${elegido.name}" no es un archivo PDF`);
      return;
    }
    if (elegido.size > MAX_TAMANO_DOCUMENTO_MB * BYTES_POR_MB) {
      onError(`"${elegido.name}" pesa más de ${MAX_TAMANO_DOCUMENTO_MB} MB`);
      return;
    }
    onError("");
    onElegir(elegido);
  }

  return (
    <div className={`campo-documento ${archivo ? "campo-documento-listo" : ""}`}>
      <div className="campo-documento-info">
        <span className="campo-documento-nombre">{nombre}</span>
        <span className="campo-documento-archivo">
          {archivo ? archivo.name : actual ? `Actual: ${actual}` : "Todavía no eliges un archivo"}
        </span>
      </div>
      <div className="campo-documento-acciones">
        {archivo && (
          <button type="button" className="boton-enlace" onClick={() => onElegir(null)}>
            Quitar
          </button>
        )}
        <input
          id={id}
          className="campo-documento-input"
          type="file"
          accept={`${TIPO_DOCUMENTO},.pdf`}
          onChange={handleChange}
        />
        <label htmlFor={id} className="boton boton-secundario boton-chico">
          {archivo ? "Cambiar" : "Elegir PDF"}
        </label>
      </div>
    </div>
  );
}
