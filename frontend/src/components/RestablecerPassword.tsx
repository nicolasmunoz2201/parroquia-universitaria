import { useState } from "react";
import type { FormEvent } from "react";
import { restablecerPassword } from "../services/auth.service";
import CampoPassword from "./CampoPassword";

interface Props {
  codigo: string;
  onTerminar: () => void;
}

export default function RestablecerPassword({ codigo, onTerminar }: Props) {
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setGuardando(true);
    try {
      await restablecerPassword(codigo, password);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setGuardando(false);
    }
  }

  if (listo) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Contraseña actualizada</h1>
          <p className="login-subtitle">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button type="button" onClick={onTerminar}>
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Parroquia Universitaria UdeC</h1>
        <p className="login-subtitle">Crea tu nueva contraseña</p>

        <label htmlFor="nuevaPassword">Nueva contraseña</label>
        <CampoPassword
          id="nuevaPassword"
          value={password}
          onChange={setPassword}
          minLength={6}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirmarNuevaPassword">Confirmar contraseña</label>
        <CampoPassword
          id="confirmarNuevaPassword"
          value={confirmarPassword}
          onChange={setConfirmarPassword}
          autoComplete="new-password"
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
