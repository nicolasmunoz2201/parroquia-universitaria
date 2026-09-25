import { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PaginaInicial from "./components/PaginaInicial";
import DashboardPublicaciones from "./components/DashboardPublicaciones";
import DashboardOrganismos from "./components/DashboardOrganismos";
import DashboardUsuarios from "./components/DashboardUsuarios";
import Sidebar from "./components/Sidebar";
import type { Vista } from "./components/Sidebar";
import { logout, obtenerSesion } from "./services/auth.service";
import type { Usuario } from "./services/auth.service";
import "./App.css";

function puedeGestionarPublicaciones(usuario: Usuario | null) {
  return usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ENCARGADO_ORGANISMO";
}

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [vista, setVista] = useState<Vista>("inicio");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

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

  function handleLogin(usuarioLogueado: Usuario) {
    setUsuario(usuarioLogueado);
    setVista("inicio");
  }

  function handleLogout() {
    logout();
    setUsuario(null);
    setVista("inicio");
  }

  if (verificando) {
    return null;
  }

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
        <span className="topbar-titulo">Parroquia Universitaria UdeC</span>
      </header>

      <Sidebar
        usuario={usuario}
        vistaActual={vista}
        abierto={sidebarAbierto}
        puedeGestionar={puedeGestionarPublicaciones(usuario)}
        onNavegar={setVista}
        onLogout={handleLogout}
        onCerrar={() => setSidebarAbierto(false)}
      />

      <main className="app-contenido">
        {vista === "inicio" && <PaginaInicial />}
        {vista === "login" && <Login onLogin={handleLogin} />}
        {vista === "perfil" && usuario && <Dashboard usuario={usuario} />}
        {vista === "gestion" && usuario && puedeGestionarPublicaciones(usuario) && (
          <DashboardPublicaciones usuario={usuario} />
        )}
        {vista === "organismos" && usuario?.rol === "ADMINISTRADOR" && <DashboardOrganismos />}
        {vista === "usuarios" && usuario?.rol === "ADMINISTRADOR" && <DashboardUsuarios />}
      </main>
    </div>
  );
}

export default App;
