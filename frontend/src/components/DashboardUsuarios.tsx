import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  crearUsuario,
  actualizarRolUsuario,
  cambiarPasswordUsuario,
  ETIQUETAS_ROL,
} from "../services/usuario.service";
import type { UsuarioAdmin, Rol } from "../services/usuario.service";
import type { Organismo } from "../services/organismo.service";
import { useUsuarios } from "../hooks/useUsuarios";
import { useOrganismos } from "../hooks/useOrganismos";
import { useToast } from "../context/ToastContext";
import CampoPassword from "./CampoPassword";

const ROLES_ASIGNABLES: Rol[] = ["FELIGRES", "ENCARGADO_ORGANISMO", "ENCARGADO_COMEDOR"];

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

interface EditarUsuarioProps {
  usuario: UsuarioAdmin;
  organismos: Organismo[];
  onCerrar: () => void;
  onGuardado: () => void;
}

function EditarUsuario({ usuario, organismos, onCerrar, onGuardado }: EditarUsuarioProps) {
  const { mostrarToast } = useToast();
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [organismoId, setOrganismoId] = useState(usuario.organismoId ?? "");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const cambioRol =
    rol !== usuario.rol ||
    (rol === "ENCARGADO_ORGANISMO" && organismoId !== (usuario.organismoId ?? ""));

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!cambioRol && !password) {
      setError("No hay cambios para guardar");
      return;
    }
    if (rol === "ENCARGADO_ORGANISMO" && !organismoId) {
      setError("Selecciona un organismo para el encargado");
      return;
    }
    if (password && password !== confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password) {
      setConfirmando(true);
      return;
    }
    guardar();
  }

  async function guardar() {
    setGuardando(true);
    try {
      if (cambioRol) {
        await actualizarRolUsuario(usuario.id, {
          rol,
          ...(rol === "ENCARGADO_ORGANISMO" ? { organismoId } : {}),
        });
      }
      if (password) {
        await cambiarPasswordUsuario(usuario.id, password);
      }
      mostrarToast("Usuario actualizado con exito");
      onGuardado();
    } catch (err) {
      setConfirmando(false);
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario");
    } finally {
      setGuardando(false);
    }
  }

  if (confirmando) {
    return (
      <dialog
        ref={dialogoRef}
        className="dialogo-confirmacion"
        onCancel={(e) => {
          e.preventDefault();
          setConfirmando(false);
        }}
      >
        <h2>Cambiar contraseña</h2>
        <p>
          ¿Seguro que quieres cambiar la contraseña de "{usuario.nombre}"?
          {cambioRol && ` También se cambiará su rol a ${ETIQUETAS_ROL[rol]}.`} Tendrá que usar la
          nueva contraseña para iniciar sesión.
        </p>
        <div className="dialogo-acciones">
          <button type="button" className="dialogo-cancelar" onClick={() => setConfirmando(false)}>
            Volver
          </button>
          <button type="button" className="dialogo-confirmar" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </dialog>
    );
  }

  return (
    <dialog ref={dialogoRef} className="dialogo-confirmacion" onCancel={onCerrar}>
      <h2>Editar usuario</h2>
      <p>
        {usuario.nombre} — {usuario.email}
      </p>

      <form className="dialogo-form" onSubmit={handleSubmit}>
        <label htmlFor="editarRol">Rol</label>
        <select id="editarRol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES_ASIGNABLES.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_ROL[valor]}
            </option>
          ))}
        </select>

        {rol === "ENCARGADO_ORGANISMO" && (
          <>
            <label htmlFor="editarOrganismo">Organismo</label>
            <select
              id="editarOrganismo"
              value={organismoId}
              onChange={(e) => setOrganismoId(e.target.value)}
            >
              <option value="">Selecciona un organismo</option>
              {organismos.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.nombre}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="editarPassword">Nueva contraseña</label>
        <CampoPassword
          id="editarPassword"
          value={password}
          onChange={setPassword}
          minLength={6}
          autoComplete="new-password"
        />
        <p className="dialogo-ayuda">Déjala vacía si no quieres cambiarla.</p>

        {password && (
          <>
            <label htmlFor="editarConfirmarPassword">Confirmar contraseña</label>
            <CampoPassword
              id="editarConfirmarPassword"
              value={confirmarPassword}
              onChange={setConfirmarPassword}
              autoComplete="new-password"
              required
            />
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <div className="dialogo-acciones">
          <button type="button" className="dialogo-cancelar" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="dialogo-confirmar" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function DashboardUsuarios() {
  const { usuarios, cargando, error: errorCarga, recargar } = useUsuarios();
  const { organismos } = useOrganismos({ soloActivos: true });
  const { mostrarToast } = useToast();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("FELIGRES");
  const [organismoId, setOrganismoId] = useState("");
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);

  const termino = normalizar(busqueda.trim());
  const usuariosFiltrados = usuarios.filter(
    (u) => normalizar(u.nombre).includes(termino) || normalizar(u.email).includes(termino)
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (rol === "ENCARGADO_ORGANISMO" && !organismoId) {
      setError("Selecciona un organismo para el encargado");
      return;
    }

    setCreando(true);
    try {
      await crearUsuario({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        rol,
        ...(rol === "ENCARGADO_ORGANISMO" ? { organismoId } : {}),
      });
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("FELIGRES");
      setOrganismoId("");
      mostrarToast("Usuario creado con exito");
      await recargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al crear el usuario";
      setError(mensaje);
      mostrarToast(mensaje, "error");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Usuarios</h1>

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>Nuevo usuario</h2>

        <label htmlFor="nombreUsuario">Nombre</label>
        <input
          id="nombreUsuario"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label htmlFor="emailUsuario">Correo electrónico</label>
        <input
          id="emailUsuario"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="passwordUsuario">Contraseña</label>
        <CampoPassword
          id="passwordUsuario"
          value={password}
          onChange={setPassword}
          minLength={6}
          autoComplete="new-password"
          required
        />

        <label htmlFor="rolUsuario">Rol</label>
        <select id="rolUsuario" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES_ASIGNABLES.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_ROL[valor]}
            </option>
          ))}
        </select>

        {rol === "ENCARGADO_ORGANISMO" && (
          <>
            <label htmlFor="organismoUsuario">Organismo</label>
            <select
              id="organismoUsuario"
              value={organismoId}
              onChange={(e) => setOrganismoId(e.target.value)}
              required
            >
              <option value="">Selecciona un organismo</option>
              {organismos.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.nombre}
                </option>
              ))}
            </select>
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={creando}>
          {creando ? "Creando..." : "Crear usuario"}
        </button>
      </form>

      {errorCarga && <p className="login-error">{errorCarga}</p>}

      <div className="buscador">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar usuarios"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <ul className="publicaciones-lista">
        {!cargando &&
          usuariosFiltrados.map((u) => {
            const esAdministrador = u.rol === "ADMINISTRADOR";
            return (
              <li
                key={u.id}
                className={`fila-usuario ${esAdministrador ? "" : "fila-usuario-editable"}`}
                onClick={esAdministrador ? undefined : () => setEditando(u)}
              >
                <div className="fila-usuario-info">
                  <strong>{u.nombre}</strong>
                  <span>{u.email}</span>
                </div>
                <div className="fila-usuario-meta">
                  <span className="etiqueta-rol">{ETIQUETAS_ROL[u.rol]}</span>
                  {u.organismo && <span className="fila-usuario-organismo">{u.organismo.nombre}</span>}
                </div>
                {!esAdministrador && (
                  <button type="button" className="boton-editar">
                    Editar
                  </button>
                )}
              </li>
            );
          })}
        {!cargando && usuariosFiltrados.length === 0 && (
          <li>{busqueda ? `No hay usuarios que coincidan con "${busqueda}".` : "No hay usuarios todavia."}</li>
        )}
      </ul>

      {editando && (
        <EditarUsuario
          usuario={editando}
          organismos={organismos}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
