import { listarHitos } from "../services/memoria.service";
import type { Hito } from "../services/memoria.service";
import { API_URL } from "../services/api";
import { useCarga } from "../hooks/useCarga";
import { formatearFecha } from "../utils/fechas";

const SIN_HITOS: Hito[] = [];

function agruparPorAnio(hitos: Hito[]) {
  const grupos = new Map<number, Hito[]>();
  for (const hito of hitos) {
    const anio = new Date(hito.fecha).getUTCFullYear();
    grupos.set(anio, [...(grupos.get(anio) ?? []), hito]);
  }
  return [...grupos.entries()];
}

export default function MemoriaHistorica() {
  const { datos: hitos, cargando, error } = useCarga(listarHitos, SIN_HITOS, "No se pudo cargar la memoria histórica");

  return (
    <div className="pagina-memoria">
      <h1>Memoria histórica</h1>
      <p className="pagina-subtitulo-actividades">
        Los momentos que han marcado la historia de la Parroquia Universitaria, contados con fotos y testimonios.
      </p>

      {cargando && <p>Cargando la memoria histórica...</p>}
      {error && <p className="login-error">{error}</p>}
      {!cargando && !error && hitos.length === 0 && (
        <p className="aviso-vacio">Todavía no hay hitos en la línea de tiempo.</p>
      )}

      <ol className="linea-tiempo">
        {agruparPorAnio(hitos).map(([anio, hitosDelAnio]) => (
          <li key={anio} className="linea-tiempo-anio">
            <h2 className="linea-tiempo-etiqueta">{anio}</h2>
            <ol className="linea-tiempo-hitos">
              {hitosDelAnio.map((hito) => (
                <li key={hito.id} className="hito">
                  <article className="hito-tarjeta">
                    <p className="hito-fecha">{formatearFecha(hito.fecha)}</p>
                    <h3>{hito.titulo}</h3>
                    <p className="hito-descripcion">{hito.descripcion}</p>

                    {hito.fotos.length > 0 && (
                      <div className={`hito-fotos ${hito.fotos.length === 1 ? "hito-fotos-una" : ""}`}>
                        {hito.fotos.map((foto) => (
                          <a key={foto.id} href={`${API_URL}${foto.url}`} target="_blank" rel="noreferrer">
                            <img src={`${API_URL}${foto.url}`} alt={hito.titulo} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}

                    {hito.testimonios.length > 0 && (
                      <div className="hito-testimonios">
                        {hito.testimonios.map((testimonio) => (
                          <blockquote key={testimonio.id} className="testimonio">
                            <p>{testimonio.contenido}</p>
                            <cite>{testimonio.autorNombre}</cite>
                          </blockquote>
                        ))}
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
