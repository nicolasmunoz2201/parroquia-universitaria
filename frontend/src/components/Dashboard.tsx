import { logout } from "../lib/api";
import type { Usuario } from "../lib/api";

interface Props {
  usuario: Usuario;
  onLogout: () => void;
}

export default function Dashboard({ usuario, onLogout }: Props) {
  function handleLogout() {
    logout();
    onLogout();
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Parroquia Universitaria UdeC</h1>
          <p>Panel administrativo</p>
        </div>
        <button onClick={handleLogout}>Cerrar sesion</button>
      </header>

      <main className="dashboard-body">
        <p className="dashboard-welcome">
          Bienvenido, <strong>{usuario.nombre}</strong>
        </p>
        <dl className="dashboard-info">
          <dt>Correo</dt>
          <dd>{usuario.email}</dd>
          <dt>Rol</dt>
          <dd>{usuario.rol}</dd>
        </dl>
      </main>
    </div>
  );
}
