import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { getUsuarioActual, getToken } from "./lib/api";
import type { Usuario } from "./lib/api";
import "./App.css";

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    getToken() ? getUsuarioActual() : null
  );

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <Dashboard usuario={usuario} onLogout={() => setUsuario(null)} />;
}

export default App;
