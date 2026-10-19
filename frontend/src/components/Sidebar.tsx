import type { Usuario } from "../services/auth.service";
import { ROLES_GESTION_SACRAMENTOS } from "../constants/sacramentos";

export type Vista =
  | "inicio"
  | "login"
  | "perfil"
  | "gestion"
  | "organismos"
  | "usuarios"
  | "sacramentos"
  | "agendamientos";

interface Props {
  usuario: Usuario | null;
  vistaActual: Vista;
  abierto: boolean;
  puedeGestionar: boolean;
  onNavegar: (vista: Vista) => void;
  onLogout: () => void;
  onCerrar: () => void;
}

export default function Sidebar({
  usuario,
  vistaActual,
  abierto,
  puedeGestionar,
  onNavegar,
  onLogout,
  onCerrar,
}: Props) {
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const gestionaSacramentos = !!usuario && ROLES_GESTION_SACRAMENTOS.includes(usuario.rol);
  function navegar(vista: Vista) {
    onNavegar(vista);
    onCerrar();
  }

  return (
    <>
      {abierto && <div className="sidebar-backdrop" onClick={onCerrar} />}
      <aside className={`sidebar ${abierto ? "sidebar-abierto" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-titulo">Parroquia Universitaria UdeC</span>
          <button className="sidebar-cerrar" aria-label="Cerrar menu" onClick={onCerrar}>
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${vistaActual === "inicio" ? "activo" : ""}`}
            onClick={() => navegar("inicio")}
          >
            Inicio
          </button>
          {usuario && (
            <button
              className={`sidebar-link ${vistaActual === "perfil" ? "activo" : ""}`}
              onClick={() => navegar("perfil")}
            >
              Mi perfil
            </button>
          )}
          {usuario && (
            <button
              className={`sidebar-link ${vistaActual === "sacramentos" ? "activo" : ""}`}
              onClick={() => navegar("sacramentos")}
            >
              Agendar sacramentos
            </button>
          )}
          {gestionaSacramentos && (
            <button
              className={`sidebar-link ${vistaActual === "agendamientos" ? "activo" : ""}`}
              onClick={() => navegar("agendamientos")}
            >
              Agendamientos
            </button>
          )}
          {puedeGestionar && (
            <button
              className={`sidebar-link ${vistaActual === "gestion" ? "activo" : ""}`}
              onClick={() => navegar("gestion")}
            >
              Gestionar publicaciones
            </button>
          )}
          {esAdmin && (
            <button
              className={`sidebar-link ${vistaActual === "organismos" ? "activo" : ""}`}
              onClick={() => navegar("organismos")}
            >
              Organismos
            </button>
          )}
          {esAdmin && (
            <button
              className={`sidebar-link ${vistaActual === "usuarios" ? "activo" : ""}`}
              onClick={() => navegar("usuarios")}
            >
              Usuarios
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          {usuario ? (
            <button
              className="sidebar-link"
              onClick={() => {
                onLogout();
                onCerrar();
              }}
            >
              Cerrar sesion
            </button>
          ) : (
            <button className="sidebar-link" onClick={() => navegar("login")}>
              Iniciar sesion
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
