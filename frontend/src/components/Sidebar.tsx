import type { Usuario } from "../services/auth.service";
import type { GrupoMenu, Vista } from "../utils/menu";

interface Props {
  usuario: Usuario | null;
  vistaActual: Vista;
  abierto: boolean;
  grupos: GrupoMenu[];
  onNavegar: (vista: Vista) => void;
  onLogout: () => void;
  onCerrar: () => void;
}

export default function Sidebar({ usuario, vistaActual, abierto, grupos, onNavegar, onLogout, onCerrar }: Props) {
  function navegar(vista: Vista) {
    onNavegar(vista);
    onCerrar();
  }

  function enlace(vista: Vista, texto: string) {
    return (
      <button
        key={vista}
        className={`sidebar-link ${vistaActual === vista ? "activo" : ""}`}
        aria-current={vistaActual === vista ? "page" : undefined}
        onClick={() => navegar(vista)}
      >
        {texto}
      </button>
    );
  }

  return (
    <>
      {abierto && <div className="sidebar-backdrop" onClick={onCerrar} />}
      <aside className={`sidebar ${abierto ? "sidebar-abierto" : ""}`} inert={!abierto}>
        <div className="sidebar-header">
          <span className="sidebar-titulo">Parroquia Universitaria UdeC</span>
          <button className="sidebar-cerrar" aria-label="Cerrar menu" onClick={onCerrar}>
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Menú principal">
          {enlace("inicio", "Inicio")}
          {grupos.map((grupo) => (
            <div key={grupo.id} className="sidebar-grupo">
              <p className="sidebar-grupo-titulo">{grupo.titulo}</p>
              {grupo.opciones.map((opcion) => enlace(opcion.vista, opcion.texto))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {usuario ? (
            <>
              <p className="sidebar-usuario">{usuario.nombre}</p>
              {enlace("perfil", "Mi perfil")}
              <button
                className="sidebar-link"
                onClick={() => {
                  onLogout();
                  onCerrar();
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            enlace("login", "Iniciar sesión")
          )}
        </div>
      </aside>
    </>
  );
}
