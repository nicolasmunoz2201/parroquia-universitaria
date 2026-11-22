import { useState } from "react";
import type { FormEvent } from "react";
import { login, registrar, solicitarRecuperacion } from "../services/auth.service";
import type { Usuario } from "../services/auth.service";
import CampoPassword from "./CampoPassword";
import logoParroquia from "../assets/logo-parroquia.jpg";
import { LARGO_MINIMO_PASSWORD } from "../constants/autenticacion";

interface Props {
  onLogin: (usuario: Usuario) => void;
}

function RecuperarPassword({ emailInicial, onVolver }: { emailInicial: string; onVolver: () => void }) {
  const [email, setEmail] = useState(emailInicial);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await solicitarRecuperacion(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace de recuperación");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Revisa tu correo</h1>
          <p className="login-subtitle">
            Si {email.trim()} está registrado, te enviamos un enlace para crear una nueva contraseña. Sirve una sola
            vez y vence en 1 hora. Si no lo ves, revisa la carpeta de spam.
          </p>
          <button type="button" className="boton boton-principal boton-formulario" onClick={onVolver}>
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logoParroquia} alt="Parroquia Universitaria Concepción" className="login-logo" />
        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="login-subtitle">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>

        <label htmlFor="emailRecuperar">Correo electrónico</label>
        <input
          id="emailRecuperar"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@correo.cl"
          autoComplete="email"
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="boton boton-principal boton-formulario" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar enlace"}
        </button>

        <p className="login-cambio">
          <button type="button" className="boton-enlace" onClick={onVolver}>
            Volver a iniciar sesión
          </button>
        </p>
      </form>
    </div>
  );
}

export default function Login({ onLogin }: Props) {
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
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

  if (modo === "recuperar") {
    return <RecuperarPassword emailInicial={email} onVolver={() => setModo("login")} />;
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logoParroquia} alt="Parroquia Universitaria Concepción" className="login-logo" />
        <h1>Parroquia Universitaria UdeC</h1>
        <p className="login-subtitle">{esRegistro ? "Crea tu cuenta" : "Inicia sesión en tu cuenta"}</p>

        {esRegistro && (
          <>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: María González"
              autoComplete="name"
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
          placeholder="nombre@correo.cl"
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <CampoPassword
          id="password"
          value={password}
          onChange={setPassword}
          minLength={esRegistro ? LARGO_MINIMO_PASSWORD : undefined}
          autoComplete={esRegistro ? "new-password" : "current-password"}
          placeholder={
            esRegistro ? `Mínimo ${LARGO_MINIMO_PASSWORD} caracteres` : "Ingresa tu contraseña"
          }
          required
        />

        {!esRegistro && (
          <button
            type="button"
            className="boton-enlace login-olvide"
            onClick={() => {
              setError("");
              setModo("recuperar");
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {esRegistro && (
          <>
            <label htmlFor="confirmarPassword">Confirmar contraseña</label>
            <CampoPassword
              id="confirmarPassword"
              value={confirmarPassword}
              onChange={setConfirmarPassword}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              required
            />
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="boton boton-principal boton-formulario" disabled={cargando}>
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
          <button type="button" className="boton-enlace" onClick={cambiarModo}>
            {esRegistro ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </form>
    </div>
  );
}
