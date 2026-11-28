import { useEffect, useRef, useState } from "react";
import type { Usuario } from "../services/auth.service";
import type { GrupoMenu, OpcionMenu, Vista } from "../utils/menu";

interface Props {
  usuario: Usuario | null;
  vistaActual: Vista;
  grupos: GrupoMenu[];
  onNavegar: (vista: Vista) => void;
  onLogout: () => void;
}

const VISTAS_CUENTA: Vista[] = ["perfil"];

export default function MenuSuperior({ usuario, vistaActual, grupos, onNavegar, onLogout }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function cerrarAlHacerClicFuera(evento: MouseEvent) {
      if (!navRef.current?.contains(evento.target as Node)) setAbierto(null);
    }
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(null);
    }

    document.addEventListener("mousedown", cerrarAlHacerClicFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarAlHacerClicFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  function ir(vista: Vista) {
    setAbierto(null);
    onNavegar(vista);
  }

  function alternar(id: string) {
    setAbierto(abierto === id ? null : id);
  }

  function enlace(opcion: OpcionMenu) {
    return (
      <button
        type="button"
        className={`menu-enlace ${vistaActual === opcion.vista ? "activo" : ""}`}
        aria-current={vistaActual === opcion.vista ? "page" : undefined}
        onClick={() => ir(opcion.vista)}
      >
        {opcion.texto}
      </button>
    );
  }

  return (
    <nav className="menu-superior" aria-label="Menú principal" ref={navRef}>
      <ul className="menu-superior-lista">
        <li>{enlace({ vista: "inicio", texto: "Inicio" })}</li>
        {grupos.map((grupo) => {
          if (grupo.opciones.length === 1) {
            return <li key={grupo.id}>{enlace(grupo.opciones[0])}</li>;
          }
          const contieneActual = grupo.opciones.some((opcion) => opcion.vista === vistaActual);
          return (
            <li key={grupo.id} className="menu-grupo">
              <button
                type="button"
                className={`menu-enlace menu-desplegar ${contieneActual ? "activo" : ""}`}
                data-menu={grupo.id}
                aria-haspopup="true"
                aria-expanded={abierto === grupo.id}
                onClick={() => alternar(grupo.id)}
              >
                {grupo.titulo}
              </button>
              {abierto === grupo.id && (
                <ul className="menu-desplegable">
                  {grupo.opciones.map((opcion) => (
                    <li key={opcion.vista}>
                      <button
                        type="button"
                        className={vistaActual === opcion.vista ? "activo" : ""}
                        aria-current={vistaActual === opcion.vista ? "page" : undefined}
                        onClick={() => ir(opcion.vista)}
                      >
                        {opcion.texto}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="menu-cuenta">
        {usuario ? (
          <div className="menu-grupo">
            <button
              type="button"
              className={`menu-enlace menu-desplegar menu-usuario ${VISTAS_CUENTA.includes(vistaActual) ? "activo" : ""}`}
              data-menu="cuenta"
              aria-haspopup="true"
              aria-expanded={abierto === "cuenta"}
              title={usuario.nombre}
              onClick={() => alternar("cuenta")}
            >
              <span className="menu-usuario-nombre">{usuario.nombre}</span>
            </button>
            {abierto === "cuenta" && (
              <ul className="menu-desplegable menu-desplegable-derecha">
                <li className="menu-desplegable-correo">
                  <strong>{usuario.nombre}</strong>
                  <span>{usuario.email}</span>
                </li>
                <li>
                  <button
                    type="button"
                    className={vistaActual === "perfil" ? "activo" : ""}
                    onClick={() => ir("perfil")}
                  >
                    Mi perfil
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(null);
                      onLogout();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`menu-enlace menu-iniciar ${vistaActual === "login" ? "activo" : ""}`}
            onClick={() => ir("login")}
          >
            Iniciar sesión
          </button>
        )}
      </div>
    </nav>
  );
}
