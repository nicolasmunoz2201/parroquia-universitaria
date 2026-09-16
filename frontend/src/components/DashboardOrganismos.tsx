import { useState } from "react";
import type { FormEvent } from "react";
import { crearOrganismo, desactivarOrganismo, activarOrganismo, eliminarOrganismo } from "../lib/api";
import { useOrganismos } from "../hooks/useOrganismos";

const NOMBRE_ORGANISMO_REGEX = /^[\p{L}\p{N} .,-]+$/u;

export default function DashboardOrganismos() {
  const { organismos, cargando, error: errorCarga, recargar } = useOrganismos();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const nombreLimpio = nombre.trim();
    if (!NOMBRE_ORGANISMO_REGEX.test(nombreLimpio)) {
      setError("El nombre solo puede tener letras, numeros, espacios, puntos, comas y guiones");
      return;
    }

    setCreando(true);
    try {
      await crearOrganismo({
        nombre: nombreLimpio,
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
      });
      setNombre("");
      setDescripcion("");
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el organismo");
    } finally {
      setCreando(false);
    }
  }

  async function handleCambiarEstado(id: string, activo?: boolean) {
    setErrorAccion("");
    try {
      if (activo) {
        await desactivarOrganismo(id);
      } else {
        await activarOrganismo(id);
      }
      await recargar();
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  async function handleEliminar(id: string) {
    setErrorAccion("");
    try {
      await eliminarOrganismo(id);
      await recargar();
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo eliminar el organismo");
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Organismos</h1>

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <label htmlFor="nombreOrganismo">Nombre</label>
        <input
          id="nombreOrganismo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label htmlFor="descripcionOrganismo">Descripcion (opcional)</label>
        <input
          id="descripcionOrganismo"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={creando}>
          {creando ? "Creando..." : "Crear organismo"}
        </button>
      </form>

      {errorCarga && <p className="login-error">{errorCarga}</p>}
      {errorAccion && <p className="login-error">{errorAccion}</p>}

      <ul className="publicaciones-lista">
        {!cargando &&
          organismos.map((org) => (
            <li key={org.id}>
              <span>
                {org.nombre} {org.activo === false && <em>(inactivo)</em>}
              </span>
              <span className="acciones-organismo">
                <button onClick={() => handleCambiarEstado(org.id, org.activo)}>
                  {org.activo === false ? "Activar" : "Desactivar"}
                </button>
                <button onClick={() => handleEliminar(org.id)}>Eliminar</button>
              </span>
            </li>
          ))}
        {!cargando && organismos.length === 0 && <li>No hay organismos todavia.</li>}
      </ul>
    </div>
  );
}
