import { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PaginaInicial from "./components/PaginaInicial";
import DashboardPublicaciones from "./components/DashboardPublicaciones";
import DashboardOrganismos from "./components/DashboardOrganismos";
import DashboardUsuarios from "./components/DashboardUsuarios";
import RestablecerPassword from "./components/RestablecerPassword";
import MisSacramentos from "./components/MisSacramentos";
import DashboardAgendamientos from "./components/DashboardAgendamientos";
import DashboardInventario from "./components/DashboardInventario";
import Actividades from "./components/Actividades";
import DashboardActividades from "./components/DashboardActividades";
import MemoriaHistorica from "./components/MemoriaHistorica";
import DashboardMemoria from "./components/DashboardMemoria";
import { ROLES_GESTION_ACTIVIDADES } from "./constants/actividades";
import { ROLES_GESTION_SACRAMENTOS } from "./constants/sacramentos";
import { ROLES_INVENTARIO } from "./constants/inventario";
import Sidebar from "./components/Sidebar";
import MenuSuperior from "./components/MenuSuperior";
import { construirMenu, puedeGestionarPublicaciones } from "./utils/menu";
import type { Vista } from "./utils/menu";
import { logout, obtenerSesion } from "./services/auth.service";
import type { Usuario } from "./services/auth.service";
import { getToken } from "./services/api";
import { useToast } from "./context/toast";
import { EVENTO_SESION_EXPIRADA, MENSAJE_SESION_EXPIRADA } from "./constants/autenticacion";
import logoIcono from "./assets/logo-icono.png";
import "./App.css";

function App() {
  const { mostrarToast } = useToast();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [vista, setVista] = useState<Vista>("inicio");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [codigoRecuperacion, setCodigoRecuperacion] = useState(() =>
    new URLSearchParams(window.location.search).get("restablecer")
  );

  useEffect(() => {
    async function verificarSesion() {
      const usuarioActual = await obtenerSesion();
      if (usuarioActual) {
        setUsuario(usuarioActual);
      } else {
        logout();
      }
      setVerificando(false);
    }

    verificarSesion();
  }, []);

  useEffect(() => {
    function cerrarSesionExpirada() {
      if (!getToken()) return;
      logout();
      setUsuario(null);
      setVista("login");
      mostrarToast(MENSAJE_SESION_EXPIRADA, "error");
    }

    window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesionExpirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesionExpirada);
  }, [mostrarToast]);

  function handleLogin(usuarioLogueado: Usuario) {
    setUsuario(usuarioLogueado);
    setVista("inicio");
  }

  function handleLogout() {
    logout();
    setUsuario(null);
    setVista("inicio");
  }

  function navegar(nuevaVista: Vista) {
    if (codigoRecuperacion) {
      window.history.replaceState(null, "", window.location.pathname);
      setCodigoRecuperacion(null);
    }
    setVista(nuevaVista);
  }

  function terminarRecuperacion() {
    handleLogout();
    navegar("login");
  }

  if (verificando) {
    return null;
  }

  const grupos = construirMenu(usuario);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="hamburger-btn"
          aria-label="Abrir menu"
          onClick={() => setSidebarAbierto(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <button type="button" className="topbar-marca" onClick={() => navegar("inicio")}>
          <img src={logoIcono} alt="" className="topbar-logo" />
          <span className="topbar-titulo">Parroquia Universitaria UdeC</span>
        </button>
        <MenuSuperior
          usuario={usuario}
          vistaActual={vista}
          grupos={grupos}
          onNavegar={navegar}
          onLogout={handleLogout}
        />
      </header>

      <Sidebar
        usuario={usuario}
        vistaActual={vista}
        abierto={sidebarAbierto}
        grupos={grupos}
        onNavegar={navegar}
        onLogout={handleLogout}
        onCerrar={() => setSidebarAbierto(false)}
      />

      <main className="app-contenido">
        {codigoRecuperacion ? (
          <RestablecerPassword codigo={codigoRecuperacion} onTerminar={terminarRecuperacion} />
        ) : (
          <>
            {vista === "inicio" && <PaginaInicial />}
            {vista === "actividades" && <Actividades usuario={usuario} onIrALogin={() => navegar("login")} />}
            {vista === "gestion-actividades" && usuario && ROLES_GESTION_ACTIVIDADES.includes(usuario.rol) && (
              <DashboardActividades usuario={usuario} />
            )}
            {vista === "memoria" && <MemoriaHistorica />}
            {vista === "gestion-memoria" && usuario?.rol === "ADMINISTRADOR" && <DashboardMemoria />}
            {vista === "login" && <Login onLogin={handleLogin} />}
            {vista === "perfil" && usuario && <Dashboard usuario={usuario} />}
            {vista === "gestion" && usuario && puedeGestionarPublicaciones(usuario) && (
              <DashboardPublicaciones usuario={usuario} />
            )}
            {vista === "organismos" && usuario?.rol === "ADMINISTRADOR" && <DashboardOrganismos />}
            {vista === "usuarios" && usuario?.rol === "ADMINISTRADOR" && <DashboardUsuarios />}
            {vista === "sacramentos" && usuario && <MisSacramentos />}
            {vista === "agendamientos" && usuario && ROLES_GESTION_SACRAMENTOS.includes(usuario.rol) && (
              <DashboardAgendamientos />
            )}
            {vista === "inventario" && usuario && ROLES_INVENTARIO.includes(usuario.rol) && <DashboardInventario />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
