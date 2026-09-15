import { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { getUsuarioActual, getToken, logout, verificarToken } from "./lib/api";
import type { Usuario } from "./lib/api";
import "./App.css";

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      if (!getToken()) {
        setVerificando(false);
        return;
      }

      if (await verificarToken()) {
        setUsuario(getUsuarioActual());
      } else {
        logout();
      }
      setVerificando(false);
    }

    verificarSesion();
  }, []);

  if (verificando) {
    return null;
  }

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <Dashboard usuario={usuario} onLogout={() => setUsuario(null)} />;
}

export default App;
