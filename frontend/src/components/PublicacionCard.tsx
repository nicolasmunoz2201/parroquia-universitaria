import { useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import type { Publicacion } from "../lib/api";

const INTERVALO_MS = 6000;

interface Props {
  publicacion: Publicacion;
}

export default function PublicacionCard({ publicacion }: Props) {
  const [indice, setIndice] = useState(0);
  const totalImagenes = publicacion.imagenes.length;

  useEffect(() => {
    if (totalImagenes <= 1) return;

    const temporizador = setTimeout(() => {
      setIndice((actual) => (actual + 1) % totalImagenes);
    }, INTERVALO_MS);

    return () => clearTimeout(temporizador);
  }, [indice, totalImagenes]);

  function irAnterior() {
    setIndice((actual) => (actual - 1 + totalImagenes) % totalImagenes);
  }

  function irSiguiente() {
    setIndice((actual) => (actual + 1) % totalImagenes);
  }

  return (
    <article className="publicacion-card">
      {totalImagenes > 0 && (
        <div className="publicacion-carrusel">
          <img src={`${API_URL}${publicacion.imagenes[indice]}`} alt={publicacion.titulo} />
          {totalImagenes > 1 && (
            <>
              <button
                type="button"
                className="carrusel-flecha flecha-izquierda"
                aria-label="Foto anterior"
                onClick={irAnterior}
              >
                ‹
              </button>
              <button
                type="button"
                className="carrusel-flecha flecha-derecha"
                aria-label="Foto siguiente"
                onClick={irSiguiente}
              >
                ›
              </button>
              <div className="carrusel-puntos">
                {publicacion.imagenes.map((_, i) => (
                  <span key={i} className={`punto ${i === indice ? "activo" : ""}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="publicacion-info">
        <span className="publicacion-organismo">{publicacion.organismo.nombre}</span>
        <h2>{publicacion.titulo}</h2>
        <p>{publicacion.contenido}</p>
      </div>
    </article>
  );
}
