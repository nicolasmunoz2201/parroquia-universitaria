import { useState } from "react";
import type { FormEvent } from "react";
import { cambiarMiPassword } from "../services/auth.service";
import type { Usuario } from "../services/auth.service";
import { ETIQUETAS_ROL } from "../services/usuario.service";
import { useToast } from "../context/ToastContext";
import CampoPassword from "./CampoPassword";

interface Props {
  usuario: Usuario;
}

function CambiarPassword() {
  const { mostrarToast } = useToast();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (passwordNueva !== confirmarPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (passwordNueva === passwordActual) {
      setError("La nueva contraseña debe ser distinta a la actual");
      return;
    }

    setGuardando(true);
    try {
      await cambiarMiPassword(passwordActual, passwordNueva);
      setPasswordActual("");
      setPasswordNueva("");
      setConfirmarPassword("");
      mostrarToast("Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="publicacion-form perfil-password" onSubmit={handleSubmit}>
      <h2>Cambiar contraseña</h2>

      <label htmlFor="passwordActual">Contraseña actual</label>
      <CampoPassword
        id="passwordActual"
        value={passwordActual}
        onChange={setPasswordActual}
        autoComplete="current-password"
        required
      />

      <label htmlFor="passwordNueva">Nueva contraseña</label>
      <CampoPassword
        id="passwordNueva"
        value={passwordNueva}
        onChange={setPasswordNueva}
        minLength={6}
        autoComplete="new-password"
        required
      />

      <label htmlFor="confirmarPasswordNueva">Confirmar nueva contraseña</label>
      <CampoPassword
        id="confirmarPasswordNueva"
        value={confirmarPassword}
        onChange={setConfirmarPassword}
        autoComplete="new-password"
        required
      />

      {error && <p className="login-error">{error}</p>}

      <button type="submit" className="boton boton-principal boton-formulario" disabled={guardando}>
        {guardando ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
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

        {usuario.rol === "ADMINISTRADOR" && <CambiarPassword />}
      </main>
    </div>
  );
}
