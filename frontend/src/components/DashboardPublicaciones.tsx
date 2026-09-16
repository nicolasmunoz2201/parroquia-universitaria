import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { crearPublicacion, actualizarPublicacion, eliminarPublicacion } from "../lib/api";
import type { Publicacion, Usuario } from "../lib/api";
import { usePublicaciones } from "../hooks/usePublicaciones";
import { useOrganismos } from "../hooks/useOrganismos";
import { useToast } from "../context/ToastContext";

const MAX_FOTOS = 3;

interface Props {
  usuario: Usuario;
}

export default function DashboardPublicaciones({ usuario }: Props) {
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const { mostrarToast } = useToast();

  const {
    publicaciones,
    error: errorCarga,
    recargar: recargarPublicaciones,
  } = usePublicaciones();
  const { organismos } = useOrganismos({ soloActivos: true });

  const [editando, setEditando] = useState<Publicacion | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [organismoId, setOrganismoId] = useState(usuario.organismoId ?? "");
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");
  const inputImagenRef = useRef<HTMLInputElement>(null);

  const publicacionesGestionables = publicaciones.filter(
    (pub) => esAdmin || pub.organismo.id === usuario.organismoId
  );

  function handleQuitarImagenes() {
    setImagenes([]);
    if (inputImagenRef.current) {
      inputImagenRef.current.value = "";
    }
  }

  function handleQuitarImagen(indice: number) {
    setImagenes((actuales) => actuales.filter((_, i) => i !== indice));
  }

  function handleImagenesChange(e: ChangeEvent<HTMLInputElement>) {
    const nuevosArchivos = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (imagenes.length + nuevosArchivos.length > MAX_FOTOS) {
      setError(`Puedes subir hasta ${MAX_FOTOS} fotos por publicacion`);
      return;
    }

    setError("");
    setImagenes((actuales) => [...actuales, ...nuevosArchivos]);
  }

  function handleEditar(pub: Publicacion) {
    setEditando(pub);
    setTitulo(pub.titulo);
    setContenido(pub.contenido);
    setOrganismoId(pub.organismo.id);
    handleQuitarImagenes();
    setError("");
  }

  function handleCancelarEdicion() {
    setEditando(null);
    setTitulo("");
    setContenido("");
    setOrganismoId(usuario.organismoId ?? "");
    handleQuitarImagenes();
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("contenido", contenido);
    imagenes.forEach((archivo) => formData.append("imagenes", archivo));

    if (!editando) {
      const organismoDestino = esAdmin ? organismoId : usuario.organismoId;
      if (!organismoDestino) {
        setError("Selecciona un organismo");
        return;
      }
      formData.append("organismoId", organismoDestino);
    }

    setEnviando(true);
    try {
      if (editando) {
        await actualizarPublicacion(editando.id, formData);
        mostrarToast("Publicacion actualizada con exito");
      } else {
        await crearPublicacion(formData);
        mostrarToast("Publicacion creada con exito");
      }
      setEditando(null);
      setTitulo("");
      setContenido("");
      handleQuitarImagenes();
      await recargarPublicaciones();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al guardar la publicacion";
      setError(mensaje);
      mostrarToast(mensaje, "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleEliminar(id: string) {
    setErrorEliminar("");
    try {
      await eliminarPublicacion(id);
      if (editando?.id === id) handleCancelarEdicion();
      await recargarPublicaciones();
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : "No se pudo eliminar la publicacion");
    }
  }

  return (
    <div className="gestion-publicaciones">
      <h1>Gestionar publicaciones</h1>

      {errorCarga && <p className="login-error">{errorCarga}</p>}

      <form className="publicacion-form" onSubmit={handleSubmit}>
        <h2>{editando ? "Editar publicacion" : "Nueva publicacion"}</h2>

        <label htmlFor="titulo">Titulo</label>
        <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

        <label htmlFor="contenido">Descripcion</label>
        <textarea
          id="contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          required
        />

        {esAdmin &&
          (editando ? (
            <p className="organismo-fijo">Organismo: {editando.organismo.nombre}</p>
          ) : (
            <>
              <label htmlFor="organismo">Organismo</label>
              <select
                id="organismo"
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
          ))}

        <label htmlFor="imagen">Fotos (maximo {MAX_FOTOS})</label>
        {editando && (
          <p className="imagenes-actuales-hint">
            {editando.imagenes.length > 0
              ? `Esta publicacion ya tiene ${editando.imagenes.length} foto(s). Sube fotos nuevas para reemplazarlas, o deja esto vacio para conservar las actuales.`
              : "Esta publicacion no tiene fotos todavia."}
          </p>
        )}
        <div className="campo-imagen">
          <input
            id="imagen"
            ref={inputImagenRef}
            type="file"
            accept="image/*"
            multiple
            disabled={imagenes.length >= MAX_FOTOS}
            onChange={handleImagenesChange}
          />
          {imagenes.length > 0 && (
            <button type="button" className="boton-quitar-imagen" onClick={handleQuitarImagenes}>
              Quitar todas
            </button>
          )}
        </div>

        {imagenes.length > 0 && (
          <ul className="imagenes-preview">
            {imagenes.map((archivo, indice) => (
              <li key={`${archivo.name}-${archivo.lastModified}-${indice}`}>
                <span>{archivo.name}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${archivo.name}`}
                  onClick={() => handleQuitarImagen(indice)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="login-error">{error}</p>}

        <div className="acciones-formulario">
          <button type="submit" disabled={enviando}>
            {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Publicar"}
          </button>
          {editando && (
            <button type="button" className="boton-secundario" onClick={handleCancelarEdicion}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {errorEliminar && <p className="login-error">{errorEliminar}</p>}

      <ul className="publicaciones-lista">
        {publicacionesGestionables.map((pub) => (
          <li key={pub.id}>
            <span>
              <strong>{pub.titulo}</strong> — {pub.organismo.nombre}
            </span>
            <span className="acciones-organismo">
              <button onClick={() => handleEditar(pub)}>Editar</button>
              <button onClick={() => handleEliminar(pub.id)}>Eliminar</button>
            </span>
          </li>
        ))}
        {publicacionesGestionables.length === 0 && <li>No hay publicaciones todavia.</li>}
      </ul>
    </div>
  );
}
