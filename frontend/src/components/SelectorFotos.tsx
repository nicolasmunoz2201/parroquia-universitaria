import type { ChangeEvent } from "react";
import { API_URL } from "../services/api";
import { BYTES_POR_MB, MAX_TAMANO_FOTO_MB, TIPOS_FOTO } from "../constants/archivos";

export interface FotoActual {
  id: string;
  url: string;
}

export interface FotoNueva {
  archivo: File;
  vistaPrevia: string;
}

interface Props {
  id: string;
  maximo: number;
  actuales: FotoActual[];
  nuevas: FotoNueva[];
  onQuitarActual: (id: string) => void;
  onCambiarNuevas: (nuevas: FotoNueva[]) => void;
  onError: (mensaje: string) => void;
}

export default function SelectorFotos({ id, maximo, actuales, nuevas, onQuitarActual, onCambiarNuevas, onError }: Props) {
  const total = actuales.length + nuevas.length;
  const lleno = total >= maximo;

  function handleElegir(e: ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (total + elegidas.length > maximo) {
      onError(`Puedes tener hasta ${maximo} fotos. Quita alguna antes de agregar más.`);
      return;
    }
    const noPermitida = elegidas.find((archivo) => !TIPOS_FOTO.includes(archivo.type));
    if (noPermitida) {
      onError(`"${noPermitida.name}" no es una foto JPG, PNG o WEBP`);
      return;
    }
    const pesada = elegidas.find((archivo) => archivo.size > MAX_TAMANO_FOTO_MB * BYTES_POR_MB);
    if (pesada) {
      onError(`"${pesada.name}" pesa más de ${MAX_TAMANO_FOTO_MB} MB`);
      return;
    }

    onError("");
    onCambiarNuevas([...nuevas, ...elegidas.map((archivo) => ({ archivo, vistaPrevia: URL.createObjectURL(archivo) }))]);
  }

  function quitarNueva(indice: number) {
    URL.revokeObjectURL(nuevas[indice].vistaPrevia);
    onCambiarNuevas(nuevas.filter((_, i) => i !== indice));
  }

  return (
    <>
      <input
        id={id}
        className="input-archivo-oculto"
        type="file"
        accept={TIPOS_FOTO.join(",")}
        multiple
        disabled={lleno}
        onChange={handleElegir}
      />

      {total > 0 && (
        <ul className="imagenes-preview">
          {actuales.map((foto, indice) => (
            <li key={foto.id}>
              <img src={`${API_URL}${foto.url}`} alt={`Foto actual ${indice + 1}`} />
              <span>Foto actual {indice + 1}</span>
              <button type="button" aria-label={`Quitar foto actual ${indice + 1}`} onClick={() => onQuitarActual(foto.id)}>
                ×
              </button>
            </li>
          ))}
          {nuevas.map(({ archivo, vistaPrevia }, indice) => (
            <li key={vistaPrevia} className="imagen-nueva">
              <img src={vistaPrevia} alt={archivo.name} />
              <span>{archivo.name}</span>
              <button type="button" aria-label={`Quitar ${archivo.name}`} onClick={() => quitarNueva(indice)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={id} className={`selector-fotos ${lleno ? "selector-fotos-lleno" : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="9" cy="10" r="1.6" fill="currentColor" />
          <path d="M4 17l5-5 4 4 2.5-2.5L20 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="selector-fotos-texto">
          {lleno ? "Llegaste al máximo de fotos" : total > 0 ? "Agregar más fotos" : "Elegir fotos"}
        </span>
        <span className="selector-fotos-ayuda">
          {total} de {maximo} fotos · JPG, PNG o WEBP · máximo {MAX_TAMANO_FOTO_MB} MB cada una
        </span>
      </label>
    </>
  );
}
