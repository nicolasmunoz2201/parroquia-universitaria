import { useState } from "react";
import type { FormEvent } from "react";
import { login, registrar } from "../services/auth.service";
import type { Usuario } from "../services/auth.service";
import CampoPassword from "./CampoPassword";

interface Props {
  onLogin: (usuario: Usuario) => void;
}

export default function Login({ onLogin }: Props) {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const esRegistro = modo === "registro";

  function cambiarModo() {
    setModo(esRegistro ? "login" : "registro");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (esRegistro && password !== confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      const usuario = esRegistro
        ? await registrar(nombre.trim(), email, password)
        : await login(email, password);
      onLogin(usuario);
    } catch (err) {
      const mensajePorDefecto = esRegistro ? "Error al crear la cuenta" : "Error al iniciar sesion";
      setError(err instanceof Error ? err.message : mensajePorDefecto);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Parroquia Universitaria UdeC</h1>
        <p className="login-subtitle">{esRegistro ? "Crea tu cuenta" : "Inicia sesión en tu cuenta"}</p>

        {esRegistro && (
          <>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Contraseña</label>
        <CampoPassword
          id="password"
          value={password}
          onChange={setPassword}
          minLength={esRegistro ? 6 : undefined}
          autoComplete={esRegistro ? "new-password" : "current-password"}
          required
        />

        {esRegistro && (
          <>
            <label htmlFor="confirmarPassword">Confirmar contraseña</label>
            <CampoPassword
              id="confirmarPassword"
              value={confirmarPassword}
              onChange={setConfirmarPassword}
              autoComplete="new-password"
              required
            />
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando
            ? esRegistro
              ? "Creando cuenta..."
              : "Ingresando..."
            : esRegistro
              ? "Crear cuenta"
              : "Ingresar"}
        </button>

        <p className="login-cambio">
          {esRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button type="button" className="login-link" onClick={cambiarModo}>
            {esRegistro ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </form>
    </div>
  );
}
