import { usePublicaciones } from "../hooks/usePublicaciones";
import PublicacionCard from "./PublicacionCard";

export default function PaginaInicial() {
  const { publicaciones, cargando, error } = usePublicaciones({ soloOrganismosActivos: true });

  return (
    <div className="pagina-inicial">
      <h1>Parroquia Universitaria UdeC</h1>
      <p className="pagina-subtitulo">Novedades de nuestros organismos pastorales</p>

      {cargando && <p>Cargando publicaciones...</p>}
      {error && <p className="login-error">{error}</p>}
      {!cargando && !error && publicaciones.length === 0 && (
        <p>Todavia no hay publicaciones.</p>
      )}

      <div className="publicaciones-grid">
        {publicaciones.map((pub) => (
          <PublicacionCard key={pub.id} publicacion={pub} />
        ))}
      </div>
    </div>
  );
}
