import type { Usuario } from "../services/auth.service";
import { ETIQUETAS_ROL } from "../services/usuario.service";

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
          <dd>{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</dd>
          {usuario.organismo && (
            <>
              <dt>Organismo</dt>
              <dd>{usuario.organismo.nombre}</dd>
            </>
          )}
        </dl>
      </main>
    </div>
  );
}
