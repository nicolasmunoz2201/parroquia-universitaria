import type { Usuario } from "../services/auth.service";

interface Props {
  usuario: Usuario;
}

export default function Dashboard({ usuario }: Props) {
  return (
    <div className="dashboard">
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
